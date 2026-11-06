import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { QueryClient,QueryClientProvider } from '@tanstack/react-query'
import { afterEach,expect,test,vi } from 'vitest'
import { AppUpdateNotice } from './AppUpdateNotice'
import { beginCriticalTask } from '../application/update-safety'
import { useCartStore } from '../../features/customer-ordering/application/cart-store'
import { usePosCartStore } from '../../features/staff-orders/application/pos-cart-store'
import type { AppUpdates } from '../application/app-updates'

const clients:QueryClient[]=[]
afterEach(()=>{cleanup();clients.forEach(c=>c.clear());clients.length=0;vi.restoreAllMocks();useCartStore.getState().clear();usePosCartStore.getState().clear();sessionStorage.clear()})
function setup(){
 const snapshot={available:true,applying:false,error:null}
 const service:AppUpdates={getSnapshot:()=>snapshot,subscribe:()=>()=>{},start:vi.fn(()=>()=>{}),apply:vi.fn(async()=>{})}
 const client=new QueryClient();clients.push(client)
 render(<QueryClientProvider client={client}><AppUpdateNotice service={service} enabled/></QueryClientProvider>)
 return {service,client}
}
test('user chooses when to update and drafts retain notes and checkout identities',async()=>{
 useCartStore.setState({shopId:'table-epoch',lines:[{key:'line',productId:'p',productName:'ไก่',basePriceSatang:3900,quantity:2,options:[],note:'เผ็ดน้อย'}],orderNote:'แยกซอส'})
 const identity=useCartStore.getState().checkoutIdentity('same cart')
 usePosCartStore.setState({shopId:'shop',orderNote:'ไม่ใส่หอม',requestId:'pos-request'})
 const {service}=setup()
 expect(service.apply).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'ไว้ก่อน'}))
 expect(service.apply).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'มีอัปเดต'}))
 fireEvent.click(screen.getByRole('button',{name:'อัปเดต'}))
 await waitFor(()=>expect(service.apply).toHaveBeenCalledTimes(1))
 const saved=JSON.parse(sessionStorage.getItem('duckpos-customer-cart')!).state
 expect(saved.orderNote).toBe('แยกซอส');expect(saved.lines[0].quantity).toBe(2)
 expect(saved.request).toMatchObject(identity)
 expect(JSON.parse(sessionStorage.getItem('duckpos-staff-pos-cart')!).state).toMatchObject({orderNote:'ไม่ใส่หอม',requestId:'pos-request'})
})
test('update is blocked during location capture before mutation begins',async()=>{
 const release=beginCriticalTask()
 try{const {service}=setup();expect(screen.getByRole('button',{name:'อัปเดต'})).toBeDisabled();expect(service.apply).not.toHaveBeenCalled();act(()=>release());await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeEnabled())}finally{release()}
})
test('inline edited form must be saved and left before update',async()=>{
 setup()
 const form=document.createElement('form'),input=document.createElement('input');form.append(input);document.body.append(form)
 fireEvent.input(input,{target:{value:'unsaved shop name'}})
 expect(screen.getByRole('button',{name:'อัปเดต'})).toBeDisabled()
 form.remove()
 await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeEnabled())
})
test('failed browser storage prevents activating the new version',async()=>{
 const {service}=setup()
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota')})
 fireEvent.click(screen.getByRole('button',{name:'อัปเดต'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('ยังเก็บตะกร้าในเครื่องไม่ได้')
 expect(service.apply).not.toHaveBeenCalled()
})
test('pending payment or order mutation blocks update until its response completes',async()=>{
 const {client,service}=setup()
 let finish!:()=>void
 const mutation=client.getMutationCache().build(client,{mutationFn:()=>new Promise<void>(resolve=>{finish=resolve})})
 let pending!:Promise<void>
 await act(async()=>{pending=mutation.execute(undefined);await Promise.resolve()})
 await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeDisabled())
 expect(service.apply).not.toHaveBeenCalled()
 await act(async()=>{finish();await pending})
 await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeEnabled())
})
test('an open cart or product dialog postpones update without discarding its contents',async()=>{
 setup()
 const dialog=document.createElement('dialog');dialog.setAttribute('open','');dialog.textContent='ยังเลือกซอสอยู่';document.body.append(dialog)
 await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeDisabled())
 expect(dialog.textContent).toBe('ยังเลือกซอสอยู่')
 dialog.remove()
 await waitFor(()=>expect(screen.getByRole('button',{name:'อัปเดต'})).toBeEnabled())
})
