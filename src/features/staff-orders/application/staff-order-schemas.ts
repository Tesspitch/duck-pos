import { z } from 'zod'

export const cancellationSchema = z.object({
  reason: z.string().trim().min(3, 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร').max(300),
})

export const paymentSchema = z.object({
  amountBaht: z.coerce.number().positive('ยอดรับเงินต้องมากกว่า 0').max(1_000_000),
})

