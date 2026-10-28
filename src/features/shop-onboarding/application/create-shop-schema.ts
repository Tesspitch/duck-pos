import { z } from 'zod'

export const createShopSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อร้าน').max(120, 'ชื่อร้านยาวเกิน 120 ตัวอักษร'),
  timezone: z.string().min(1),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
})

