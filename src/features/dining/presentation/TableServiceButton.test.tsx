import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { TableServiceButton } from './TableServiceButton'

const mock = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../application/table-service', () => ({ requestService: mock.request, serviceLabels: { STAFF:'เรียกพนักงาน', BILL:'เช็กบิล', CUTLERY:'ขอช้อนส้อม', CONDIMENTS:'ขอเครื่องปรุง' } }))
beforeEach(() => { mock.request.mockReset(); mock.request.mockResolvedValue(undefined) })
afterEach(cleanup)
test.each([['เรียกพนักงาน','STAFF'],['เช็กบิล','BILL'],['ขอช้อนส้อม','CUTLERY'],['ขอเครื่องปรุง','CONDIMENTS']])('sends %s for the correct table', async (label,type) => {
 render(<TableServiceButton tableQrToken="table-token" />)
 fireEvent.click(screen.getByRole('button',{name:'เรียกพนักงาน'}))
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:label}))
 await waitFor(()=>expect(mock.request).toHaveBeenCalledWith('table-token',type))
 expect(await screen.findByRole('status')).toHaveTextContent('ส่งคำขอ')
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
test('shows an error and allows retry when sending fails',async()=>{
 mock.request.mockRejectedValueOnce(new Error('offline'))
 render(<TableServiceButton tableQrToken="table-token" />)
 fireEvent.click(screen.getByRole('button',{name:'เรียกพนักงาน'}))
 fireEvent.click(screen.getByRole('button',{name:'เช็กบิล'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('ส่งคำขอไม่สำเร็จ')
 fireEvent.click(screen.getByRole('button',{name:'เช็กบิล'}))
 expect(await screen.findByRole('status')).toHaveTextContent('ส่งคำขอเช็กบิลแล้ว')
})
