import { useState, type FormEvent } from 'react'

import { grantFormSchema } from '../../application/grant-form-schema'

interface GrantShopFormProps {
  errorMessage?: string
  pending: boolean
  onGrant: (userId: string) => void
}

export function GrantShopForm({ errorMessage, pending, onGrant }: GrantShopFormProps) {
  const [userId, setUserId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    const result = grantFormSchema.safeParse({ userId: userId.trim() })
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }

    onGrant(result.data.userId)
    setUserId('')
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1 text-sm font-medium">
          Supabase User ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="rounded-xl border border-line px-3 outline-none focus:border-brand"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-action px-5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {pending ? 'กำลังอนุมัติ…' : 'อนุมัติสร้างร้าน'}
        </button>
      </form>
      {validationError ? <p role="alert" className="mt-2 text-sm text-red-700">{validationError}</p> : null}
      {errorMessage ? <p role="alert" className="mt-2 text-sm text-red-700">อนุมัติไม่สำเร็จ: {errorMessage}</p> : null}
    </div>
  )
}

