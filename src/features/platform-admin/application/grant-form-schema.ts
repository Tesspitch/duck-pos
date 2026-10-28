import { z } from 'zod'

export const grantFormSchema = z.object({
  userId: z.string().uuid('User ID ต้องเป็น UUID ที่ถูกต้อง'),
})

