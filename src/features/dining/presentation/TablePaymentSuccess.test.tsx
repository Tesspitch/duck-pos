import { cleanup,render,screen } from '@testing-library/react'
import { afterEach,expect,test } from 'vitest'
import { TablePaymentSuccess } from './TablePaymentSuccess'

afterEach(cleanup)
test('paid round still preparing food displays only payment and preparation status',()=>{
 render(<TablePaymentSuccess round={{billId:'bill',shopId:'shop',shopName:'ร้านทดสอบ',tableName:'โต๊ะ 1',tableQrToken:'qr',status:'PAID',closed:false,acceptingOrders:false,ownTotalSatang:3900,orders:[{id:'1',reference:'ref',queueNumber:1,status:'PREPARING',totalSatang:3900,items:[]}]}}/>)
 expect(screen.getByRole('heading',{name:'ชำระเงินสำเร็จ'})).toBeVisible()
 expect(screen.getByText('พนักงานกำลังจัดเตรียมอาหารที่เหลือ')).toBeVisible()
 expect(screen.queryByRole('button')).not.toBeInTheDocument()
 expect(screen.queryByRole('link')).not.toBeInTheDocument()
 expect(document.body).toHaveClass('table-payment-success-active')
})
