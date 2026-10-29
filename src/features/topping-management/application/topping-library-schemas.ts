import { z } from 'zod'

import { bahtTextToSatang } from '../../catalog/domain/money'

export const toppingGroupFormSchema = z
  .object({
    name: z.string().trim().min(1, 'กรุณากรอกชื่อหมวดท็อปปิง').max(80),
    selectionMode: z.enum(['SINGLE', 'MULTIPLE']),
    isRequired: z.boolean(),
    pricingMode: z.enum(['PER_TOPPING', 'FIRST_FREE_THEN_FIXED']),
    additionalPriceBaht: z.string().transform((value, context) => {
      try {
        return bahtTextToSatang(value)
      } catch (error) {
        context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'ราคาไม่ถูกต้อง' })
        return z.NEVER
      }
    }),
    isVisible: z.boolean(),
    categoryIds: z.array(z.string().uuid()).min(1, 'เลือกหมวดหมู่เมนูอย่างน้อย 1 หมวด'),
  })
  .refine((value) => value.selectionMode === 'MULTIPLE' || value.pricingMode !== 'FIRST_FREE_THEN_FIXED', {
    message: 'รูปแบบรายการแรกฟรีใช้กับหมวดที่เลือกได้หลายอันเท่านั้น',
    path: ['pricingMode'],
  })

export const toppingFormSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อท็อปปิง').max(80),
  priceBaht: z.string().transform((value, context) => {
    try {
      return bahtTextToSatang(value)
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'ราคาไม่ถูกต้อง',
      })
      return z.NEVER
    }
  }),
  isVisible: z.boolean(),
  isAvailable: z.boolean(),
})
