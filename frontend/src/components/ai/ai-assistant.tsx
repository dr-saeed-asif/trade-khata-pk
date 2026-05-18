import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, Sparkles, User } from 'lucide-react'
import { aiService } from '@/services/ai.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: string
  resultBlocks?: Array<{
    key: string
    title: string
    rows?: Array<Record<string, string | number>>
    metrics?: Record<string, string | number>
  }>
  citations?: Array<{
    source: string
    title: string
    score: number
  }>
}

const defaultQuickPrompts = [
  'Show low stock items',
  'Profit loss for last 30 days',
  'Top fast and slow movers for 90 days',
]

const formatMetricLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const initialAssistantMessage: Message = {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: 'Ask me inventory questions. I can summarize reports, low stock, movers, and trends.',
  meta: 'System assistant',
}

export const AiAssistant = ({ className }: { className?: string }) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [stats, setStats] = useState<{ totalRequests: number; avgLatencyMs: number } | null>(null)
  const [quickPrompts, setQuickPrompts] = useState(defaultQuickPrompts)
  const [thinkingText, setThinkingText] = useState('Thinking')
  const feedRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage])

  const canSend = prompt.trim().length > 1 && !loading

  const placeholder = useMemo(() => {
    if (loading) return 'Generating response...'
    return 'Ask anything about inventory...'
  }, [loading])

  const sendMessage = async (rawMessage?: string) => {
    const content = (rawMessage ?? prompt).trim()
    if (content.length < 2 || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt('')
    setLoading(true)

    try {
      const response = await aiService.chat(content)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
          meta: `Intent: ${response.intent} | Provider: ${response.usedProvider}`,
          resultBlocks: response.resultBlocks,
          citations: response.citations,
        },
      ])
      if (response.suggestions?.length) {
        setQuickPrompts(response.suggestions.slice(0, 4))
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error instanceof Error
              ? `AI request failed: ${error.message}`
              : 'AI request failed. Please try again.',
          meta: 'Error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        ...initialAssistantMessage,
        id: crypto.randomUUID(),
      },
    ])
    setPrompt('')
    setQuickPrompts(defaultQuickPrompts)
  }

  useEffect(() => {
    let cancelled = false

    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const history = await aiService.history(6)
        if (cancelled || !history.length) return

        const restored: Message[] = []
        for (const row of history.slice().reverse()) {
          restored.push({
            id: `${row.id}-user`,
            role: 'user',
            content: row.message,
            meta: new Date(row.createdAt).toLocaleString(),
          })
          restored.push({
            id: `${row.id}-assistant`,
            role: 'assistant',
            content: row.success ? `Intent: ${row.intent}. Tools used: ${row.toolCalls.join(', ') || 'none'}.` : `Failed request: ${row.errorMessage ?? 'Unknown error'}`,
            meta: `Provider: ${row.provider} | Latency: ${row.latencyMs}ms`,
          })
        }
        setMessages((prev) => {
          const seed = prev[0] ? [prev[0]] : []
          return [...seed, ...restored]
        })
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }

    const loadAnalytics = async () => {
      try {
        const data = await aiService.analytics(7)
        if (!cancelled) {
          setStats({ totalRequests: data.totalRequests, avgLatencyMs: data.avgLatencyMs })
        }
      } catch {
        // Keep assistant usable even if analytics endpoint is forbidden.
      }
    }

    void loadHistory()
    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      setThinkingText('Thinking')
      return
    }

    const labels = ['Thinking', 'Analyzing data', 'Preparing answer']
    let idx = 0
    const interval = window.setInterval(() => {
      idx = (idx + 1) % labels.length
      setThinkingText(labels[idx])
    }, 900)

    return () => {
      window.clearInterval(interval)
    }
  }, [loading])

  useEffect(() => {
    const node = feedRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, loading])

  return (
    <Card className={`flex h-full min-h-0 flex-col ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {stats ? `7d req: ${stats.totalRequests} | avg ${stats.avgLatencyMs}ms` : 'Inventory copilot'}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-7 rounded-lg px-2 text-xs"
            onClick={clearChat}
            disabled={loading}
            title="Clear chat"
          >
            Clear
          </Button>
        </div>
      </div>
      {historyLoading ? <p className="mb-2 text-xs text-slate-500">Loading recent AI history...</p> : null}

      <div ref={feedRef} className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-8 rounded-2xl bg-slate-900 p-3 text-white shadow-sm'
                : 'mr-8 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm'
            }
          >
            <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
              {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            {message.meta ? <p className="mt-2 text-[11px] opacity-70">{message.meta}</p> : null}
            {message.resultBlocks?.length ? (
              <div className="mt-2 space-y-2">
                {message.resultBlocks.map((block) => (
                  <div key={block.key} className="rounded-md border border-slate-200/80 bg-slate-50 p-2">
                    <p className="text-[11px] font-semibold text-slate-700">{block.title}</p>
                    {block.metrics ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {Object.entries(block.metrics).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_1px_1px_rgba(15,23,42,0.04)]"
                          >
                            <p className="text-[11px] font-medium text-slate-500">{formatMetricLabel(key)}</p>
                            <p className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {block.rows?.length ? (
                      <div className="mt-1 overflow-x-auto">
                        <table className="min-w-full text-[11px]">
                          <thead>
                            <tr>
                              {Object.keys(block.rows[0]).map((column) => (
                                <th key={column} className="px-1 py-1 text-left font-semibold text-slate-600">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.slice(0, 8).map((row, idx) => (
                              <tr key={`${block.key}-${idx}`} className="border-t border-slate-200/70">
                                {Object.values(row).map((value, colIdx) => (
                                  <td key={`${block.key}-${idx}-${colIdx}`} className="px-1 py-1 text-slate-700">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {message.citations?.length ? (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] font-medium opacity-80">Sources</p>
                {message.citations.slice(0, 3).map((citation) => (
                  <p key={`${citation.source}-${citation.title}`} className="text-[11px] opacity-75">
                    {citation.source} - {citation.title} (score {citation.score})
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="mr-8 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">{thinkingText}</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {quickPrompts.map((sample) => (
          <Button
            key={sample}
            type="button"
            variant="outline"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => void sendMessage(sample)}
            disabled={loading}
          >
            {sample}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <Input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={placeholder}
          className="h-10 border-0 bg-transparent px-2 focus:border-0 focus:ring-0"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void sendMessage()
            }
          }}
        />
        <Button
          type="button"
          className="h-9 rounded-xl px-3"
          onClick={() => void sendMessage()}
          disabled={!canSend}
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
