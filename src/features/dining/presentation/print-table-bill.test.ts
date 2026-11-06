import { expect,test } from 'vitest'
import { renderBill } from './print-table-bill'
import type { DiningBill } from '../domain/dining'
test('bill excludes cancelled orders, escapes names and hides payment QR when paid',()=>{
 const bill:DiningBill={id:'bill',shopId:'shop',tableName:'1',sessionId:'session',status:'CHECKOUT',closed:false,totalSatang:3900,fingerprint:'fp',pendingCount:0,payment:null,orders:[{id:'a',reference:'a',queueNumber:1,status:'COMPLETED',totalSatang:3900,items:[{name:'<script>alert(1)</script>',quantity:1,options:[]}]},{id:'b',reference:'b',queueNumber:2,status:'CANCELLED',totalSatang:1000,items:[{name:'cancelled-food',quantity:1,options:[]}]}]}
 const html=renderBill(bill,'Shop','https://example.com/qr.png')
 expect(html).toContain('฿39.00');expect(html).not.toContain('cancelled-food');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('https://example.com/qr.png')
 expect(renderBill({...bill,status:'PAID'},'Shop','https://example.com/qr.png')).not.toContain('https://example.com/qr.png')
})
