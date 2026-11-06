import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDiningContext, useDiningRound } from '../application/use-dining'
import { findSavedRound, lastRound, prepareAutomaticRound, saveRound, startRound, type SavedRound } from '../application/round-memory'
import { PublicMenuView } from '../../customer-ordering/presentation/pages/PublicMenuPage'
import { TableRoundSummary } from './TableRoundSummary'
import { LoadingState } from '../../../shared/presentation/LoadingState'
import { consumeFreshTableEntry } from '../../../shared/application/entry-navigation'

export function TableMenuPage() {
  const { qrToken } = useParams()
  return <TableMenu key={qrToken} qrToken={qrToken} />
}
function TableMenu({ qrToken }: { qrToken: string | undefined }) {
  const context = useDiningContext(qrToken)
  const [selected,setSelected] = useState<SavedRound | null>(() => qrToken ? lastRound(qrToken) : null)
  const round = useDiningRound(selected?.guestToken)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
 const scanEntry = useRef<boolean|null>(null)
 const [entryHandled,setEntryHandled] = useState(false)
  const data=context.data
  const epoch=data?.tableEpoch??data?.billId

  useEffect(()=>{
    if(selected||!data||!qrToken||!epoch)return
    let active=true
    const prepare=data.tableEpoch?prepareAutomaticRound(epoch,qrToken,data.shopId):startRound(epoch,qrToken,data.shopId)
    void prepare.then(saved=>{if(active)setSelected(saved)}).catch(error=>{if(active)setError(error instanceof Error?error.message:'จดจำรอบไม่สำเร็จ')})
    return ()=>{active=false}
  },[selected,data,qrToken,epoch])

  useEffect(()=>{
    if(entryHandled||!data||!selected||!context.isFetchedAfterMount||context.isFetching||!round.isFetchedAfterMount||round.isPending||round.isFetching||round.error)return
    if(scanEntry.current===null)scanEntry.current=Boolean(qrToken&&consumeFreshTableEntry(`/table/${qrToken}`))
    if(!scanEntry.current)return
    const current=selected.tableEpoch?selected.tableEpoch===epoch:selected.billId===data.billId
    const mayStart=round.data?.status==='PAID'&&!current&&data.acceptingOrders&&Boolean(qrToken&&epoch)
    if(!mayStart){queueMicrotask(()=>setEntryHandled(true));return}
    let active=true
    const prepare=data.tableEpoch?prepareAutomaticRound(epoch!,qrToken!,data.shopId):startRound(epoch!,qrToken!,data.shopId)
    void prepare.then(saved=>{if(active){setSelected(saved);setEntryHandled(true)}}).catch(error=>{if(active){setError(error instanceof Error?error.message:'เปิดเมนูไม่สำเร็จ');setEntryHandled(true)}})
    return ()=>{active=false}
  },[entryHandled,data,selected,context.isFetchedAfterMount,context.isFetching,round.isFetchedAfterMount,round.isPending,round.isFetching,round.error,round.data,epoch,qrToken])

  const tableOrder = useMemo(() => selected && data ? {
    tableQrToken:selected.tableQrToken,billId:selected.billId,guestToken:selected.guestToken,tableName:data.tableName,
    tableEpoch:selected.tableEpoch??(selected.billId===data.billId?data.tableEpoch:undefined),
  } : undefined,[selected,data])
  async function begin() {
    if (!qrToken || !data || !epoch || busy) return
    setBusy(true);setError('')
    try { setSelected(await (data.tableEpoch?prepareAutomaticRound(epoch,qrToken,data.shopId):startRound(epoch,qrToken,data.shopId))) }
    catch(error) { setError(error instanceof Error ? error.message : 'เปิดเมนูไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  if(context.isPending||(selected&&round.isPending))return <main className="p-6"><LoadingState label="กำลังตรวจสอบรอบโต๊ะ…"/></main>
  if(context.error||round.error)return <main className="p-6"><p role="alert">ตรวจสอบรอบโต๊ะไม่สำเร็จ</p><button className="mt-3 border border-line px-4" onClick={()=>{void context.refetch();void round.refetch()}}>ลองใหม่</button></main>
  if(selected&&(!context.isFetchedAfterMount||!round.isFetchedAfterMount))return <main className="p-6"><LoadingState label="กำลังตรวจสอบสถานะล่าสุด…"/></main>
  if(!data)return <main className="p-6">ไม่พบโต๊ะ กรุณาติดต่อพนักงาน</main>
  const current=selected&&(selected.tableEpoch?selected.tableEpoch===epoch:selected.billId===data.billId)
  if(selected&&(!current||(round.data&&(round.data.status!=='OPEN'||round.data.closed||!data.acceptingOrders))))return <main className="min-h-screen bg-surface">
    {round.data?<TableRoundSummary round={round.data} token={selected.guestToken}/>:<p className="mx-auto max-w-3xl p-5">รอบโต๊ะเดิมสิ้นสุดแล้ว</p>}
    {!current&&round.data?.status!=='PAID'&&<p className="mx-auto max-w-3xl px-4 pb-28 text-sm text-muted">หากต้องการสั่งใหม่ กรุณาสแกน QR ที่โต๊ะอีกครั้ง</p>}
    {error&&<p role="alert" className="p-4 text-red-700">{error}</p>}
  </main>
  if(tableOrder&&current)return <PublicMenuView shopId={data.shopId} tableOrder={tableOrder} canOrder={data.acceptingOrders}/>
  return <main className="p-6">{error?<><p role="alert">{error}</p><button className="mt-3 min-h-12 border border-line px-4" onClick={()=>void begin()}>ลองอีกครั้ง</button></>:<LoadingState label="กำลังเปิดเมนู…"/>}</main>
}
export function TableRoundPage() {
  const { guestToken } = useParams()
  const round = useDiningRound(guestToken)
  useEffect(() => {
    if (round.data && guestToken) {
      const saved=findSavedRound(guestToken)
      try { saveRound({ billId:round.data.billId,guestToken,tableQrToken:round.data.tableQrToken,shopId:round.data.shopId,tableEpoch:saved?.tableEpoch }) } catch { /* URL remains usable without browser storage. */ }
    }
  },[round.data,guestToken])
  if(round.isPending)return <main className="p-6"><LoadingState label="กำลังโหลดรอบโต๊ะ…"/></main>
  if(round.error)return <main className="p-6"><p role="alert">โหลดสถานะไม่สำเร็จ</p><button className="mt-3 border border-line px-4" onClick={()=>void round.refetch()}>ลองใหม่</button></main>
  if(!round.isFetchedAfterMount)return <main className="p-6"><LoadingState label="กำลังตรวจสอบสถานะล่าสุด…"/></main>
  if(!round.data||!guestToken){
    const saved=guestToken?findSavedRound(guestToken):null
    return <main className="grid gap-4 p-6"><p>ยังไม่มีรายการในรอบนี้</p>{saved?<Link className="flex min-h-12 items-center justify-center border border-line bg-white px-4" to={`/table/${saved.tableQrToken}`}>กลับไปเลือกเมนู</Link>:<p>กรุณาสแกน QR โต๊ะอีกครั้ง</p>}</main>
  }
  return <main className="min-h-screen bg-surface"><TableRoundSummary round={round.data} token={guestToken}/></main>
}
