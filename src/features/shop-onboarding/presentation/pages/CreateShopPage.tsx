import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateShop } from '../../application/use-create-shop'
import { createShopSchema } from '../../application/create-shop-schema'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { AppShell } from '../../../../shared/presentation/AppShell'

export function CreateShopPage() {
  const navigate = useNavigate()
  const createShop = useCreateShop()
  const { memberships, selectShop } = useActiveShop()
  const isAdditionalBranch = memberships.length > 0
  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    const result = createShopSchema.safeParse({
      name,
      timezone: 'Asia/Bangkok',
      currencyCode: 'THB',
    })
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }

    try {
      const shopId = await createShop.mutateAsync(result.data)
      selectShop(shopId)
      navigate('/', { replace: true })
    } catch {
      // Error is rendered from mutation state.
    }
  }

  return (
    <AppShell>
    <main className="grid min-h-[calc(100vh-70px)] place-items-center bg-brand-soft p-4">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-6">
        <p className="text-sm font-semibold text-brand-action">{isAdditionalBranch ? 'Owner' : 'ได้รับอนุมัติแล้ว'}</p>
        <h1 className="mt-1 text-2xl font-bold">{isAdditionalBranch ? 'เพิ่มร้านหรือสาขา' : 'สร้างร้านของคุณ'}</h1>
        <p className="mt-2 text-muted">
          เมื่อสร้างสำเร็จ คุณจะเป็น Owner ของร้านและสามารถเพิ่มพนักงานได้เอง
        </p>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            ชื่อร้าน
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="เช่น Duck Kebab"
              className="rounded-xl border border-line px-3 outline-none focus:border-brand"
              autoFocus
            />
          </label>
          <div className="grid gap-3 rounded-xl bg-brand-soft p-4 text-sm sm:grid-cols-2">
            <p><span className="text-muted">เขตเวลา:</span> Asia/Bangkok</p>
            <p><span className="text-muted">สกุลเงิน:</span> THB</p>
          </div>
          <button
            type="submit"
            disabled={createShop.isPending}
            className="rounded-xl bg-brand-action px-5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60"
          >
            {createShop.isPending ? 'กำลังสร้างร้าน…' : 'สร้างร้าน'}
          </button>
        </form>
        {validationError ? <p role="alert" className="mt-3 text-sm text-red-700">{validationError}</p> : null}
        {createShop.isError ? <p role="alert" className="mt-3 text-sm text-red-700">สร้างร้านไม่สำเร็จ: {createShop.error.message}</p> : null}
      </section>
    </main>
    </AppShell>
  )
}

