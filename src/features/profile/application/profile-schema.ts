import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'กรุณากรอกชื่อที่แสดง').max(100),
})
