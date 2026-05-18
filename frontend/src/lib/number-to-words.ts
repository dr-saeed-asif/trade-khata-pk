const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

const twoDigits = (n: number): string => {
  if (n < 20) return ones[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim()
}

const threeDigits = (n: number): string => {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const head = h ? `${ones[h]} Hundred` : ''
  const tail = rest ? twoDigits(rest) : ''
  return [head, tail].filter(Boolean).join(' ')
}

const chunkToWords = (n: number): string => {
  if (n === 0) return ''
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  const lakh = Math.floor((n % 10_000_000) / 100_000)
  const thousand = Math.floor((n % 100_000) / 1000)
  const remainder = n % 1000

  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (remainder) parts.push(threeDigits(remainder))

  return parts.join(' ').trim()
}

/** Converts a PKR amount to words (e.g. for invoice footer). */
export const amountToWords = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100
  const rupees = Math.floor(rounded)
  const paisa = Math.round((rounded - rupees) * 100)

  if (rupees === 0 && paisa === 0) return 'Zero Rupees only'

  const rupeeWords = rupees ? `${chunkToWords(rupees)} Rupee${rupees === 1 ? '' : 's'}` : ''
  const paisaWords = paisa ? `${twoDigits(paisa)} Paisa` : ''

  return [rupeeWords, paisaWords].filter(Boolean).join(' and ') + ' only'
}
