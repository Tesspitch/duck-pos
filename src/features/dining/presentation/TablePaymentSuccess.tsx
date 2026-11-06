import { useEffect } from 'react'
import { Icon } from '../../../shared/presentation/Icon'
import type { TrackedRound } from '../domain/dining'

export function TablePaymentSuccess({round}:{round:TrackedRound}) {
  useEffect(()=>{
    document.body.classList.add('table-payment-success-active')
    return ()=>document.body.classList.remove('table-payment-success-active')
  },[])
  return <div className="flex min-h-[100dvh] items-center justify-center bg-surface p-4">
    <section className="w-full max-w-md border border-line bg-white p-8 text-center" aria-live="polite">
      <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700"><Icon name="check" size={32}/></span>
      <h1 className="mt-5 text-2xl font-bold text-green-800">ชำระเงินสำเร็จ</h1>
      <p className="mt-3 text-muted">{round.shopName} · {round.tableName}</p>
      {round.orders.some(order=>!['COMPLETED','CANCELLED'].includes(order.status))&&<p className="mt-3 text-sm text-muted">พนักงานกำลังจัดเตรียมอาหารที่เหลือ</p>}
    </section>
  </div>
}
