import { Icon } from '../../../../shared/presentation/Icon'
import { useMemo, useState } from 'react'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'

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
  const [creating, setCreating] = useState(false)
  const busy = Object.values(actions).some((action) => action.isPending)
  const error = useMemo(() => library.error ?? Object.values(actions).find((action) => action.error)?.error, [actions, library.error])

  function deleteGroup(group: ToppingGroup) {
    if (window.confirm(`ลบหมวดท็อปปิง “${group.name}”? เมนูจะหยุดแสดงท็อปปิงในหมวดนี้ แต่ประวัติออเดอร์เดิมยังอยู่`)) actions.deleteGroup.mutate(group.id)
  }

  function deleteTopping(topping: Topping) {
    if (window.confirm(`ลบท็อปปิง “${topping.name}”? ประวัติออเดอร์เดิมจะไม่ถูกลบ`)) actions.deleteTopping.mutate(topping.id)
  }

  return <AppShell><main className="mx-auto grid max-w-5xl gap-5 p-4 sm:p-6">
    <header><p className="text-sm font-semibold text-brand-action">คลังท็อปปิง</p><h1 className="text-2xl font-bold"><Icon name="toppings" /> ท็อปปิง</h1><p className="mt-1 text-sm text-muted">เลือกกลุ่ม → เพิ่มตัวเลือก → ผูกหมวดเมนู</p></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{errorText(error)}</p> : null}
    {library.isLoading ? <LoadingState label="กำลังโหลดคลังท็อปปิง…" /> : null}
    {isOwner && <button type="button" aria-expanded={creating || Boolean(editingGroup)} onClick={() => { setEditingGroup(null); setCreating(!creating) }} className="min-h-12 justify-self-start bg-brand-action px-5 font-bold text-white">{creating ? 'ปิดฟอร์ม' : '＋ สร้างกลุ่มท็อปปิง'}</button>}
    {library.data && isOwner && (creating || editingGroup) ? <FormWorkspace title={editingGroup ? ' แก้ไขกลุ่มท็อปปิง' : ' สร้างกลุ่มท็อปปิง'} busy={busy} onBack={() => { setEditingGroup(null); setCreating(false) }}><ToppingGroupForm key={editingGroup?.id ?? 'new-topping-group'} shopId={shopId} categories={library.data.categories} group={editingGroup} busy={actions.saveGroup.isPending} onCancel={() => { setEditingGroup(null); setCreating(false) }} onSave={async (input) => { await actions.saveGroup.mutateAsync(input); setEditingGroup(null); setCreating(false) }} /></FormWorkspace> : null}
    {library.data?.groups.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">ยังไม่มีหมวดท็อปปิง{isOwner ? ' กดสร้างกลุ่มท็อปปิงเพื่อเริ่มต้น' : ''}</p> : null}
    {library.data ? <section className="grid gap-4">{library.data.groups.map((group) => <ToppingGroupCard key={group.id} shopId={shopId} group={group} categories={library.data.categories} isOwner={isOwner} busy={busy} onEditGroup={setEditingGroup} onDeleteGroup={deleteGroup} onSaveTopping={(input) => actions.saveTopping.mutateAsync(input).then(() => undefined)} onDeleteTopping={deleteTopping} onToggleAvailability={(topping) => actions.setAvailability.mutate({ toppingId: topping.id, available: !topping.isAvailable })} />)}</section> : null}
  </main></AppShell>
}
