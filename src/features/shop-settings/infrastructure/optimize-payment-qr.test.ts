import { expect,test,vi } from 'vitest'
import { optimizePaymentQr,paymentQrError } from './optimize-payment-qr'
test('keeps small QR files unchanged and rejects unsupported files',async()=>{
 const file=new File(['qr'],'qr.png',{type:'image/png'})
 expect(await optimizePaymentQr(file)).toBe(file)
 await expect(optimizePaymentQr(new File(['svg'],'qr.svg',{type:'image/svg+xml'}))).rejects.toThrow('รองรับเฉพาะ')
})
test('large QR is resized to lossless PNG and bitmap is released',async()=>{
 const close=vi.fn()
 vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:3000,close}))
 const context=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillRect:vi.fn(),drawImage:vi.fn()} as unknown as CanvasRenderingContext2D)
 const blob=new Blob(['optimized'],{type:'image/png'})
 const encode=vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(blob))
 try {expect(await optimizePaymentQr(new File([new Uint8Array(2100000)],'qr.jpg',{type:'image/jpeg'}))).toBe(blob);expect(close).toHaveBeenCalled()}finally{context.mockRestore();encode.mockRestore();vi.unstubAllGlobals()}
})
test('reports missing migration and permission failures clearly',()=>{
 expect(paymentQrError({code:'PGRST205'})).toContain('migration 043')
 expect(paymentQrError({code:'42501'})).toContain('เจ้าของร้าน')
})
