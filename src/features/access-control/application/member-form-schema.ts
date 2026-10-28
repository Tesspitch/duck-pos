import { z } from 'zod'

export const memberFormSchema = z.object({
  userId: z.string().uuid('User ID ต้องเป็น UUID ที่ถูกต้อง'),
  role: z.enum(['OWNER', 'STAFF']),
})

export type MemberFormValues = z.infer<typeof memberFormSchema>

