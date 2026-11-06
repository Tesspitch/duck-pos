import templateUrl from '../../../assets/shop-qr-template.png'
const escapeXml = (text:string) => text.replace(/[<>&"']/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!))
export async function createQrPoster(name:string, qrSvg:string) {
 const blob=await (await fetch(templateUrl)).blob()
 const background=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)})
 const qr='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrSvg)
 const measure=document.createElement('canvas').getContext('2d')
 let fontSize=44
 if(measure){measure.font='700 44px Tahoma, sans-serif';fontSize=Math.min(44,44*360/Math.max(1,measure.measureText(name).width))}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1086" height="1448" viewBox="0 0 1086 1448"><image href="${background}" width="1086" height="1448"/><rect x="325" y="18" width="315" height="94" fill="white"/><rect x="640" y="34" width="225" height="64" fill="white"/><svg x="330" y="36" width="186" height="56.4" viewBox="328 18 310 94" overflow="hidden"><image href="${background}" width="1086" height="1448"/></svg><path d="M532 43v42" stroke="#6b7280" stroke-width="1.5"/><text x="550" y="80" font-family="Tahoma, sans-serif" font-size="${fontSize}" font-weight="700" fill="#101827">${escapeXml(name)}</text><rect x="318" y="510" width="450" height="440" fill="white"/><image href="${escapeXml(qr)}" x="323" y="510" width="440" height="440"/></svg>`
}
export async function posterPng(svgUrl:string) {
 const image=new Image();image.src=svgUrl;await image.decode()
 const canvas=document.createElement('canvas');canvas.width=2172;canvas.height=2896
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable')
 context.drawImage(image,0,0,canvas.width,canvas.height)
 return canvas.toDataURL('image/png')
}
