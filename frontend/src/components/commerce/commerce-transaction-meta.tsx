interface CommerceTransactionMetaProps {
  date: string
  partyName: string
}

const formatDate = (value: string) => new Date(value).toLocaleDateString()

export const CommerceTransactionMeta = ({ date, partyName }: CommerceTransactionMetaProps) => (
  <div className="space-y-0.5 text-sm text-slate-600">
    <p>
      <span className="font-medium text-slate-700">Date:</span> {formatDate(date)}
    </p>
    <p>
      <span className="font-medium text-slate-700">Party Name:</span> {partyName}
    </p>
  </div>
)
