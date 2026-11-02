import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { usePlatformAdminRepository } from '../../application/platform-admin-repository-context'

const errors: Record<string, string> = {
  'Close the store session before deleting this shop.': 'กรุณาปิดรอบขายของร้านก่อนลบ',
  'Resolve pending orders and payments before deleting this shop.': 'กรุณาเคลียร์ออเดอร์และยอดรับชำระค้างก่อนลบ',
  'Shop name confirmation does not match.': 'ชื่อร้านไม่ตรง กรุณาตรวจสอบอีกครั้ง',
}

export function PlatformShopList() {
  const repository = usePlatformAdminRepository()
  const client = useQueryClient()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [name, setName] = useState('')
  const shops = useQuery({ queryKey: ['platform-shops', search, offset], queryFn: () => repository.listShops(search, offset) })
  const remove = useMutation({
    mutationFn: () => repository.deleteShop(selected!.id, name),
    onSuccess: async () => {
      setSelected(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['platform-shops'] }),
        client.invalidateQueries({ queryKey: ['memberships'] }),
      ])
    },
  })

  return <section className="mt-8 min-w-0 border border-line bg-white p-4">
    <h2 className="text-lg font-bold">ร้านค้าบนแพลตฟอร์ม</h2>
    <form className="my-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(input.trim()); setOffset(0) }}>
      <input aria-label="ค้นหาร้าน" placeholder="ชื่อร้าน / Shop ID" maxLength={120} value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 border border-line px-3" />
      <button type="submit" className="min-h-12 border border-line px-4">ค้นหา</button>
    </form>
    {shops.isLoading && <p role="status">กำลังโหลดร้านค้า…</p>}
    {shops.isError && <button type="button" className="min-h-12 text-red-700" onClick={() => void shops.refetch()}>โหลดไม่สำเร็จ · ลองใหม่</button>}
    {shops.isSuccess && !shops.data.shops.length && <p className="text-muted">ไม่พบร้านค้า</p>}
    <ul className="divide-y divide-line">{shops.data?.shops.map((shop) => <li key={shop.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
      <div className="min-w-0"><h3 className="break-words font-semibold">{shop.name}</h3><p className="break-all text-xs text-muted">{shop.id}</p></div>
      <button type="button" disabled={remove.isPending} className="min-h-12 shrink-0 border border-red-200 px-3 text-red-700" onClick={() => { remove.reset(); setSelected(shop); setName('') }} aria-label={`ลบร้าน ${shop.name}`}>ลบร้าน</button>
    </li>)}</ul>
    {selected && <FormWorkspace title="ลบร้านค้า" busy={remove.isPending} onBack={() => setSelected(null)}><div role="group" aria-label="ยืนยันลบร้าน" className="mt-4 border border-red-200 bg-red-50 p-4">
      <h3 className="break-words font-bold">ลบร้าน {selected.name}?</h3>
      <p className="mt-2 text-sm">ร้านจะหยุดใช้งานและหายจากรายการ ประวัติขายยังเก็บไว้ในระบบ</p>
      <label className="mt-3 grid gap-2 text-sm">พิมพ์ชื่อร้านเพื่อยืนยัน<input disabled={remove.isPending} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 border border-line bg-white px-3" /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={remove.isPending} onClick={() => setSelected(null)} className="min-h-12 border border-line bg-white px-4">กลับ</button>
        <button type="button" disabled={remove.isPending || name !== selected.name} onClick={() => remove.mutate()} className="min-h-12 bg-red-700 px-4 font-semibold text-white disabled:opacity-50">{remove.isPending ? 'กำลังลบ…' : 'ยืนยันลบร้าน'}</button>
      </div>
      {remove.isError && <p role="alert" className="mt-3 text-sm text-red-700">{errors[remove.error.message] ?? 'ลบร้านไม่สำเร็จ กรุณาลองใหม่'}</p>}
    </div></FormWorkspace>}
    <div className="mt-4 flex items-center justify-between gap-2">
      <button type="button" disabled={offset === 0 || shops.isFetching} onClick={() => setOffset((value) => Math.max(0, value - 20))} className="min-h-12 border border-line px-3 disabled:opacity-40">ก่อนหน้า</button>
      <span className="text-sm text-muted">หน้า {offset / 20 + 1}</span>
      <button type="button" disabled={!shops.data?.hasMore || shops.isFetching} onClick={() => setOffset((value) => value + 20)} className="min-h-12 border border-line px-3 disabled:opacity-40">ถัดไป</button>
    </div>
  </section>
}
