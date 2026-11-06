import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { StaffServiceRequests } from './StaffServiceRequests'
const mock=vi.hoisted(()=>({acknowledge:vi.fn()}))
vi.mock('../application/table-service',()=>({
 serviceLabels:{STAFF:'เรียกพนักงาน',BILL:'เช็กบิล',CUTLERY:'ขอช้อนส้อม',CONDIMENTS:'ขอเครื่องปรุง'},
 useServiceRequests:()=>({data:[{id:'request-1',tableName:'โต๊ะ 3',type:'BILL',createdAt:'2026-11-06T09:00:00Z'}],isPending:false,isError:false}),
 useAcknowledgeService:()=>({mutate:mock.acknowledge,isPending:false,isError:false}),
}))
afterEach(cleanup)
test('staff can see the table and acknowledge the request',()=>{
 render(<StaffServiceRequests shopId="shop"/>)
 fireEvent.click(screen.getByRole('button',{name:'คำขอจากโต๊ะ 1 รายการ'}))
 expect(screen.getByText('โต๊ะ 3')).toBeInTheDocument()
 expect(screen.getByText('เช็กบิล')).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'รับทราบ'}))
 expect(mock.acknowledge).toHaveBeenCalledWith('request-1')
})
