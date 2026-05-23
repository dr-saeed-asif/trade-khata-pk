import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { selectClass } from '@/lib/form-styles'
import type { PartyType } from '@/types'

interface PartyFormProps {
  name: string
  phone: string
  email: string
  address: string
  type: PartyType
  canManage: boolean
  submitLabel: string
  onCancel?: () => void
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onEmailChange: (value: string) => void
  onAddressChange: (value: string) => void
  onTypeChange: (value: PartyType) => void
  onSubmit: () => void
}

export const PartyForm = ({
  name,
  phone,
  email,
  address,
  type,
  canManage,
  submitLabel,
  onCancel,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onAddressChange,
  onTypeChange,
  onSubmit,
}: PartyFormProps) => {
  if (!canManage) return null

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-white p-4 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700">Name</label>
        <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder={formPlaceholders.party.name} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Phone</label>
        <Input value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder={formPlaceholders.party.phone} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <Input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder={formPlaceholders.party.email} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700">Address</label>
        <Input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={formPlaceholders.party.address}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Type</label>
        <select
          className={selectClass}
          value={type}
          onChange={(e) => onTypeChange(e.target.value as PartyType)}
        >
          <option value="BOTH">Customer & Supplier</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button onClick={onSubmit}>{submitLabel}</Button>
        {onCancel ? (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
