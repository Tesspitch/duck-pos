import { useState, type FormEvent } from 'react'

import {
  memberFormSchema,
  type MemberFormValues,
} from '../../application/member-form-schema'
import type { ShopRole } from '../../domain/membership'

interface MemberFormProps {
  errorMessage?: string
  pending: boolean
  onSubmit: (values: MemberFormValues) => void
}

export function MemberForm({ errorMessage, pending, onSubmit }: MemberFormProps) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<ShopRole>('STAFF')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    const result = memberFormSchema.safeParse({ userId: userId.trim(), role })
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }

    onSubmit(result.data)
    setUserId('')
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[1fr_150px_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm font-medium">
          Supabase User ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="rounded-xl border border-line px-3 outline-none focus:border-brand"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          บทบาท
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ShopRole)}
            className="rounded-xl border border-line bg-white px-3 outline-none focus:border-brand"
          >
            <option value="STAFF">STAFF</option>
            <option value="OWNER">OWNER</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-action px-5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {pending ? 'กำลังบันทึก…' : 'เพิ่ม/อัปเดต'}
        </button>
      </form>
      {validationError ? (
        <p role="alert" className="mt-2 text-sm text-red-700">{validationError}</p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          บันทึกสิทธิ์ไม่สำเร็จ: {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

