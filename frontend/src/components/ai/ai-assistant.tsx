import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, History, MessageSquarePlus, Send, Sparkles, User } from 'lucide-react'
import { formPlaceholders } from '@/lib/form-placeholders'
import { aiService, type AiConversationSummary } from '@/services/ai.service'
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

const formatRelativeTime = (value: string) => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const welcomeMessage = (): Message => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: 'Ask me inventory questions. I can summarize reports, low stock, movers, and trends.',
  meta: 'System assistant',
})

const mapStoredMessage = (row: {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}): Message | null => {
  if (row.role !== 'USER' && row.role !== 'ASSISTANT') return null

  const metadata = row.metadata ?? {}
  const provider = typeof metadata.provider === 'string' ? metadata.provider : undefined
  const intent = typeof metadata.intent === 'string' ? metadata.intent : undefined
  const metaParts = [new Date(row.createdAt).toLocaleString()]
  if (intent) metaParts.unshift(`Intent: ${intent}`)
  if (provider) metaParts.push(`Provider: ${provider}`)

  return {
    id: row.id,
    role: row.role === 'USER' ? 'user' : 'assistant',
    content: row.content,
    meta: metaParts.join(' | '),
    resultBlocks: Array.isArray(metadata.resultBlocks)
      ? (metadata.resultBlocks as Message['resultBlocks'])
      : undefined,
    citations: Array.isArray(metadata.citations)
      ? (metadata.citations as Message['citations'])
      : undefined,
  }
}

export const AiAssistant = ({ className }: { className?: string }) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [conversations, setConversations] = useState<AiConversationSummary[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [stats, setStats] = useState<{ totalRequests: number; avgLatencyMs: number } | null>(null)
  const [quickPrompts, setQuickPrompts] = useState(defaultQuickPrompts)
  const [thinkingText, setThinkingText] = useState('Thinking')
  const feedRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<Message[]>([welcomeMessage()])

  const canSend = prompt.trim().length > 1 && !loading

  const placeholder = useMemo(() => {
    if (loading) return formPlaceholders.ai.loading
    return formPlaceholders.ai.idle
  }, [loading])

  const loadConversations = useCallback(async () => {
    try {
      const rows = await aiService.listConversations(30)
      setConversations(rows)
      return rows
    } catch {
      return []
    }
  }, [])

  const loadConversationMessages = useCallback(async (id: string) => {
    setHistoryLoading(true)
    try {
      const rows = await aiService.getConversationMessages(id, 100)
      const restored = rows.map(mapStoredMessage).filter((row): row is Message => row !== null)
      setConversationId(id)
      setMessages(restored.length ? restored : [welcomeMessage()])
    } catch {
      setMessages([welcomeMessage()])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const startNewChat = useCallback(async () => {
    setConversationId(undefined)
    setMessages([welcomeMessage()])
    setPrompt('')
    setQuickPrompts(defaultQuickPrompts)
    setHistoryOpen(false)
  }, [])

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
      const response = await aiService.chat(content, conversationId)
      setConversationId(response.conversationId)
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
      void loadConversations()
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

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      setHistoryLoading(true)
      try {
        const rows = await loadConversations()
        if (cancelled || !rows.length) return
        await loadConversationMessages(rows[0].id)
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

    void bootstrap()
    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [loadConversationMessages, loadConversations])

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
  }, [messages, loading, historyOpen])

  return (
    <Card className={`flex h-full min-h-0 flex-col ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {stats ? `7d: ${stats.totalRequests} req` : 'Inventory copilot'}
          </span>
          <Button
            type="button"
            variant={historyOpen ? 'default' : 'outline'}
            className="h-7 rounded-lg px-2 text-xs"
            onClick={() => setHistoryOpen((open) => !open)}
            disabled={loading}
            title="Chat history"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 rounded-lg px-2 text-xs"
            onClick={() => void startNewChat()}
            disabled={loading}
            title="New chat"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {historyOpen ? (
        <div className="mb-3 max-h-44 min-h-0 overflow-y-auto rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-sky-50/50 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">Chat history</p>
          {conversations.length === 0 ? (
            <p className="rounded-lg bg-white/70 px-2 py-2 text-xs text-slate-500">
              No conversations yet. Start chatting to build history.
            </p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((conversation) => {
                const isActive = conversation.id === conversationId
                const preview =
                  conversation.lastMessage?.content ??
                  conversation.title ??
                  'New conversation'
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void loadConversationMessages(conversation.id)}
                    className={`w-full cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-all duration-150 ${
                      isActive
                        ? 'border-sky-300/80 bg-white shadow-sm ring-1 ring-sky-200/70'
                        : 'border-slate-200/60 bg-white/70 hover:border-sky-200/60 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-slate-900">
                        {conversation.title ?? 'New conversation'}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {formatRelativeTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{preview}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {conversation._count.messages} messages
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {historyLoading ? <p className="mb-2 text-xs text-slate-500">Loading conversation...</p> : null}

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
