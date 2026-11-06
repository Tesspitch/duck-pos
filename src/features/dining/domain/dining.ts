export type BillStatus = 'OPEN' | 'CHECKOUT' | 'PAID' | 'VOID'
export interface TableOrderContext { tableQrToken: string; billId: string; guestToken: string; tableName: string; tableEpoch?: string }
export interface DiningTable { id: string; name: string; qrToken: string; billId: string | null; status: BillStatus | 'AVAILABLE'; openedAt: string | null; totalSatang: number }
export interface DiningContext { tableId: string; tableName: string; shopId: string; shopName: string; billId: string | null; billStatus: BillStatus | null; acceptingOrders: boolean; tableEpoch?: string }
export interface DiningOrder { id: string; reference: string; queueNumber: number; status: string; totalSatang: number; items: Array<{ name: string; quantity: number; note?: string; options: string[] }> }
export interface DiningBill { id: string; shopId: string; tableName: string; sessionId: string; status: BillStatus; closed: boolean; totalSatang: number; fingerprint: string; pendingCount: number; orders: DiningOrder[]; payment: { method: 'CASH' | 'BANK_TRANSFER'; receivedSatang: number; changeSatang: number; paidAt: string } | null }
export interface TrackedRound { billId: string; shopId: string; shopName: string; tableName: string; tableQrToken: string; status: BillStatus; closed: boolean; acceptingOrders: boolean; ownTotalSatang: number; orders: DiningOrder[] }
export const diningMoney = (value: number) => `฿${(value / 100).toFixed(2)}`
export const billLabels: Record<BillStatus | 'AVAILABLE', string> = { AVAILABLE: 'พร้อมรับลูกค้า', OPEN: 'กำลังใช้งาน', CHECKOUT: 'กำลังคิดเงิน', PAID: 'ชำระแล้ว', VOID: 'จบรอบแล้ว' }
export function diningError(error: unknown) {
 const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
 const messages: Record<string,string> = {
  'Table round changed. Scan again before ordering.': 'รอบโต๊ะเปลี่ยนแล้ว กรุณากลับไปสแกน QR และเริ่มรอบใหม่ก่อนสั่ง',
  'Preparation has started. Please contact the shop.': 'เริ่มเตรียมอาหารแล้ว กรุณาติดต่อพนักงานหากต้องการเปลี่ยนแปลง',
  'Order not found.': 'ไม่พบรายการของคุณ กรุณาโหลดข้อมูลล่าสุด',
  'Table is not accepting orders.': 'โต๊ะนี้หยุดรับรายการแล้ว กรุณาตรวจสอบกับพนักงาน',
  'Bill changed. Review before payment.': 'รายการเปลี่ยนแล้ว กรุณารีเฟรชบิลก่อนรับชำระ',
  'Bill is already paid.': 'บิลนี้รับชำระแล้ว กรุณาโหลดข้อมูลล่าสุด',
  'Finish pending food before closing the table.': 'ยังมีอาหารค้าง กรุณาทำให้เสร็จก่อนปิดโต๊ะ',
  'Pay the table bill before closing.': 'กรุณารับชำระบิลก่อนปิดโต๊ะ',
  'Shop is not accepting orders.': 'ร้านยังไม่เปิดรับออเดอร์',
  'Start checkout before payment.': 'กรุณากดคิดเงินก่อนรับชำระ',
  'Bank transfer amount must equal bill total.': 'ยอดเงินโอนต้องตรงกับยอดบิล',
  'Invalid received amount.': 'กรุณาตรวจสอบยอดรับเงิน',
  'Collect payment from the table bill.': 'ออเดอร์นี้ชำระรวมที่บิลโต๊ะ',
  'Customer is outside the ordering area.': 'คุณอยู่นอกรัศมี 100 เมตรจากร้าน กรุณาสั่งเมื่ออยู่ใกล้ร้าน',
  'Location accuracy must be within 100 meters.': 'GPS ยังไม่แม่นยำ กรุณาลองใหม่ในจุดที่รับสัญญาณได้ดี',
  'Location reading is stale or invalid.': 'ตำแหน่งหมดอายุ กรุณาส่งรายการอีกครั้ง',
  'Shop is closed.': 'ร้านหยุดรับออเดอร์แล้ว กรุณาติดต่อพนักงาน',
  'Shop location is not configured.': 'ร้านยังไม่ตั้งพิกัด กรุณาสั่งกับพนักงาน',
  'Close active dining tables before closing the store.': 'กรุณาปิดโต๊ะที่กำลังใช้งานก่อนปิดรอบขาย',
  'Reopen the bill before cancellation.': 'โต๊ะกำลังคิดเงิน กรุณาให้พนักงานเปิดรับรายการอีกครั้งก่อนยกเลิก',
 }
 return messages[message] ?? 'ทำรายการไม่สำเร็จ กรุณารีเฟรชแล้วลองอีกครั้ง'
}
