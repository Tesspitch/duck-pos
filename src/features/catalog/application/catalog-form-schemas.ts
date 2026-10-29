import { z } from 'zod'

import { bahtTextToSatang } from '../domain/money'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อหมวดหมู่').max(80),
  isVisible: z.boolean(),
})

export const productFormSchema = z.object({
  categoryId: z.string().uuid('กรุณาเลือกหมวดหมู่'),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้า').max(120),
  description: z.string().trim().max(1000),
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

export const optionGroupFormSchema = z
  .object({
    name: z.string().trim().min(1, 'กรุณากรอกชื่อกลุ่มตัวเลือก').max(80),
    minSelect: z.coerce.number().int().min(0).max(100),
    maxSelect: z.coerce.number().int().min(1).max(100),
    isVisible: z.boolean(),
  })
  .refine((value) => value.minSelect <= value.maxSelect, {
    message: 'จำนวนเลือกขั้นต่ำต้องไม่เกินจำนวนสูงสุด',
    path: ['maxSelect'],
  })

export const productOptionFormSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อตัวเลือก').max(80),
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
