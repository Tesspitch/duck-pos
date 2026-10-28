const MAX_SOURCE_BYTES = 5 * 1024 * 1024
const TARGET_BYTES = 200 * 1024
const INITIAL_MAX_EDGE = 1600
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ไม่สามารถแปลงรูปภาพได้'))),
      'image/webp',
      quality,
    )
  })
}

export async function optimizeProductImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('รองรับเฉพาะรูป JPG, PNG, WebP หรือ AVIF')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('รูปต้นฉบับต้องมีขนาดไม่เกิน 5 MB')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, INITIAL_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    let width = Math.max(1, Math.round(bitmap.width * scale))
    let height = Math.max(1, Math.round(bitmap.height * scale))
    let quality = 0.82
    let output = file as Blob

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการปรับรูปภาพ')

      context.drawImage(bitmap, 0, 0, width, height)
      output = await canvasToWebp(canvas, quality)
      if (output.size <= TARGET_BYTES) break

      width = Math.max(1, Math.round(width * 0.85))
      height = Math.max(1, Math.round(height * 0.85))
      quality = Math.max(0.55, quality - 0.06)
    }

    return output
  } finally {
    bitmap.close()
  }
}
