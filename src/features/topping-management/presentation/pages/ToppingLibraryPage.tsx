import { useMemo, useState } from 'react'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useToppingLibraryActions } from '../../application/use-topping-library-actions'
import { useToppingLibrary } from '../../application/use-topping-library'
import type { Topping, ToppingGroup } from '../../domain/topping-library'
import { ToppingGroupCard } from '../components/ToppingGroupCard'
import { ToppingGroupForm } from '../components/ToppingGroupForm'

const errorText = (error: unknown) => error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'

export function ToppingLibraryPage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id ?? ''
  const isOwner = activeMembership?.role === 'OWNER'
  const library = useToppingLibrary(shopId)
  const actions = useToppingLibraryActions(shopId)
  const [editingGroup, setEditingGroup] = useState<ToppingGroup | null>(null)
  const busy = Object.values(actions).some((action) => action.isPending)
  const error = useMemo(() => library.error ?? Object.values(actions).find((action) => action.error)?.error, [actions, library.error])

  function deleteGroup(group: ToppingGroup) {
    if (window.confirm(`ลบหมวดท็อปปิง “${group.name}”? เมนูจะหยุดแสดงท็อปปิงในหมวดนี้ แต่ประวัติออเดอร์เดิมยังอยู่`)) void actions.deleteGroup.mutateAsync(group.id)
  }

  function deleteTopping(topping: Topping) {
    if (window.confirm(`ลบท็อปปิง “${topping.name}”? ประวัติออเดอร์เดิมจะไม่ถูกลบ`)) void actions.deleteTopping.mutateAsync(topping.id)
  }

  return <AppShell><main className="mx-auto grid max-w-5xl gap-5 p-4 sm:p-6">
    <header><p className="text-sm font-semibold text-brand-action">คลังท็อปปิง</p><h1 className="text-2xl font-bold">จัดการท็อปปิงแบบใช้ซ้ำ</h1><p className="mt-1 text-sm text-muted">สร้างครั้งเดียว แล้วเลือกหมวดหมู่เมนูที่ใช้ได้ ระบบจะนำไปใช้กับทุกเมนูปัจจุบันและเมนูใหม่ในหมวดนั้น</p></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{errorText(error)}</p> : null}
    {library.isLoading ? <p className="rounded-xl bg-brand-soft p-5">กำลังโหลดคลังท็อปปิง…</p> : null}
    {library.data && isOwner ? <ToppingGroupForm key={editingGroup?.id ?? 'new-topping-group'} shopId={shopId} categories={library.data.categories} group={editingGroup} busy={actions.saveGroup.isPending} onCancel={() => setEditingGroup(null)} onSave={async (input) => { await actions.saveGroup.mutateAsync(input); setEditingGroup(null) }} /> : null}
    {library.data?.groups.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">ยังไม่มีหมวดท็อปปิง{isOwner ? ' เริ่มสร้างจากฟอร์มด้านบน' : ''}</p> : null}
    {library.data ? <section className="grid gap-4">{library.data.groups.map((group) => <ToppingGroupCard key={group.id} shopId={shopId} group={group} categories={library.data.categories} isOwner={isOwner} busy={busy} onEditGroup={setEditingGroup} onDeleteGroup={deleteGroup} onSaveTopping={(input) => actions.saveTopping.mutateAsync(input).then(() => undefined)} onDeleteTopping={deleteTopping} onToggleAvailability={(topping) => void actions.setAvailability.mutateAsync({ toppingId: topping.id, available: !topping.isAvailable })} />)}</section> : null}
  </main></AppShell>
}
