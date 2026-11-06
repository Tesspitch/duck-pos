import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { DiningContextProvider, type DiningRepository } from '../application/dining-context'
import { TableMenuPage, TableRoundPage } from './TableCustomerPages'
import { saveRound } from '../application/round-memory'
vi.mock('../../customer-ordering/presentation/pages/PublicMenuPage',()=>({PublicMenuView:({tableOrder}:{tableOrder:{billId:string}})=><p>เมนูรอบ {tableOrder.billId}</p>}))
const oldBill='10000000-0000-4000-8000-000000000001'
const newBill='10000000-0000-4000-8000-000000000002'
const token='20000000-0000-4000-8000-000000000001'
const qr='30000000-0000-4000-8000-000000000001'
const shop='40000000-0000-4000-8000-000000000001'
const clients:QueryClient[]=[]
afterEach(()=>{cleanup();localStorage.clear();clients.forEach(c=>c.clear());clients.length=0})
function setup(path:string,empty=false){
 const track=vi.fn(async(t:string)=>t===token?{billId:oldBill,shopId:shop,shopName:'QA',tableName:'โต๊ะ 5',tableQrToken:qr,status:'PAID' as const,closed:true,acceptingOrders:false,ownTotalSatang:3900,orders:[]}:null)
 const repository:DiningRepository={cancel:vi.fn(),list:vi.fn(),create:vi.fn(),open:vi.fn(),bill:vi.fn(),checkout:vi.fn(),close:vi.fn(),pay:vi.fn(),track,context:vi.fn(async()=>({shopId:shop,shopName:'QA',tableId:qr,tableName:'โต๊ะ 5',billId:empty?null:newBill,billStatus:empty?null:'OPEN' as const,tableEpoch:newBill,acceptingOrders:true}))}
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(client)
 render(<QueryClientProvider client={client}><DiningContextProvider value={repository}><MemoryRouter initialEntries={[path]}><Routes><Route path="/table/:qrToken" element={<TableMenuPage/>}/><Route path="/table-round/:guestToken" element={<TableRoundPage/>}/></Routes></MemoryRouter></DiningContextProvider></QueryClientProvider>)
 return {track,repository}
}
test('saved paid round stays finished when static QR has already moved to a new bill',async()=>{
 saveRound({billId:oldBill,guestToken:token,tableQrToken:qr,shopId:shop})
 setup('/table/'+qr)
 expect(await screen.findByText('การสั่งซื้อเสร็จสิ้น · ชำระเงินแล้ว')).toBeInTheDocument()
 expect(screen.queryByText('เมนูรอบ '+newBill)).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'เริ่มรอบใหม่ที่ โต๊ะ 5'}))
 expect(await screen.findByText('เมนูรอบ '+newBill)).toBeInTheDocument()
})
test('direct old link restores the same paid receipt and provides no add-order action',async()=>{
 const {track}=setup('/table-round/'+token)
 expect(await screen.findByText('การสั่งซื้อเสร็จสิ้น · ชำระเงินแล้ว')).toBeInTheDocument()
 expect(track).toHaveBeenCalledWith(token)
 expect(screen.queryByRole('link',{name:'สั่งเพิ่มในรอบนี้'})).not.toBeInTheDocument()
})

test('first scan opens menu immediately without creating a bill or asking staff',async()=>{
 const {repository}=setup('/table/'+qr,true)
 expect(await screen.findByText('เมนูรอบ '+newBill)).toBeInTheDocument()
 expect(repository.open).not.toHaveBeenCalled()
 expect(screen.queryByText('กรุณาให้พนักงานเปิดโต๊ะก่อนสั่งอาหาร')).not.toBeInTheDocument()
})
test('old paid round still needs explicit start even when next seating has no bill yet',async()=>{
 saveRound({billId:oldBill,guestToken:token,tableQrToken:qr,shopId:shop,tableEpoch:oldBill})
 const {repository}=setup('/table/'+qr,true)
 expect(await screen.findByText('การสั่งซื้อเสร็จสิ้น · ชำระเงินแล้ว')).toBeInTheDocument()
 expect(screen.queryByText('เมนูรอบ '+newBill)).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'เริ่มรอบใหม่ที่ โต๊ะ 5'}))
 expect(await screen.findByText('เมนูรอบ '+newBill)).toBeInTheDocument()
 expect(repository.open).not.toHaveBeenCalled()
})
