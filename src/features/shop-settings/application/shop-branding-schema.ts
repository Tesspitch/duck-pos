import { z } from 'zod'

export const shopBrandingSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อร้าน').max(120),
})
