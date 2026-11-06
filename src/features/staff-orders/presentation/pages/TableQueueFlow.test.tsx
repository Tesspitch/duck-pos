import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { QueuePage } from './QueuePage'
import { StaffOrdersContext } from '../../application/staff-orders-context'
import type { StaffOrder } from '../../domain/staff-order'

vi.mock('../../../../shared/presentation/AppShell',()=>({AppShell:({children}:{children:React.ReactNode})=>children}))
vi.mock('../../../shop-context/application/active-shop-context',()=>({useActiveShop:()=>({activeMembership:{shop_id:'shop',shops:{name:'Queue QA'}}})}))
const clients:QueryClient[]=[]
afterEach(()=>{cleanup();clients.forEach(c=>c.clear());clients.length=0})

test('table checkout event refreshes real queue hooks, displays table and bill, and remains until settled',async()=>{
 let orders:StaffOrder[]=[]
 let notify:()=>void=()=>{}
 const listActive=vi.fn(async()=>({isOpen:true,orders:structuredClone(orders)}))
 const updateStatus=vi.fn(async(id,expected,next)=>{orders=orders.map(o=>o.id===id&&o.status===expected?{...o,status:next}:o)})
 const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});clients.push(client)
 const realtime={subscribe:vi.fn((_shop:string,onChange:()=>void,onState:(state:'CONNECTED')=>void)=>{
  notify=onChange
  onState('CONNECTED')
  return ()=>{}
 })}
 render(<QueryClientProvider client={client}>
  <StaffOrdersContext value={{repository:{listActive,updateStatus,createPosOrder:vi.fn(),recordPayment:vi.fn()},realtime}}>
   <MemoryRouter><QueuePage/></MemoryRouter>
  </StaffOrdersContext>
 </QueryClientProvider>)
 expect(await screen.findByText('ไม่มีออเดอร์ค้างแล้ว')).toBeVisible()
 const order:StaffOrder={id:'order',tableName:'โต๊ะ 7',tableBillId:'bill',queueNumber:8,orderReference:'QA-008',source:'QR',status:'QUEUED',paymentStatus:'UNPAID',totalSatang:4900,createdAt:'2026-11-06T10:00:00+07:00',customerNote:'ไม่ใส่หอม',payment:null,items:[{id:'item',name:'เคบับไก่',quantity:1,lineTotalSatang:4900,options:['M','ซอสกระเทียม'],note:'เผ็ดน้อย'}]}
 orders=[order]
 act(()=>notify())
 expect(await screen.findByRole('heading',{name:'008'})).toBeVisible()
 expect(screen.getByRole('button',{name:'ยังไม่สำเร็จ 1'})).toHaveAttribute('aria-pressed','true')
 expect(screen.getByRole('link',{name:/โต๊ะ 7/})).toHaveAttribute('href','/tables?bill=bill')
 for(const text of ['เคบับไก่','M','ซอสกระเทียม','เผ็ดน้อย','ไม่ใส่หอม','สั่งผ่าน QR'])expect(screen.getByText(text)).toBeVisible()
 expect(screen.queryByRole('button',{name:'รับชำระ'})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'เริ่มทำ'}))
 await waitFor(()=>expect(updateStatus).toHaveBeenCalledWith('order','QUEUED','PREPARING',undefined))
 expect(await screen.findByRole('button',{name:'เสร็จแล้ว'})).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'เสร็จแล้ว'}))
 await waitFor(()=>expect(updateStatus).toHaveBeenCalledWith('order','PREPARING','COMPLETED',undefined))
 await waitFor(()=>expect(screen.getByText('เสร็จแล้ว')).toBeVisible())
 expect(screen.getByRole('button',{name:'ยังไม่สำเร็จ 1'})).toBeVisible()
 orders=orders.map(o=>({...o,paymentStatus:'PAID'}))
 act(()=>notify())
 expect(await screen.findByText('ไม่มีออเดอร์ค้างแล้ว')).toBeVisible()
 expect(listActive.mock.calls.length).toBeGreaterThanOrEqual(5)
})
