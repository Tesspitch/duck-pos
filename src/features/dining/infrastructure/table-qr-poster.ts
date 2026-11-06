import templateUrl from '../../../assets/table-qr-template.png'
const escapeXml=(text:string)=>text.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!))
export async function createTableQrPoster(tableName:string,qrSvg:string) {
 const response=await fetch(templateUrl);if(!response.ok)throw new Error('Template unavailable')
 const blob=await response.blob()
 const background=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)})
 const label=tableName.replace(/^โต๊ะ\s*/,'').trim()||tableName
 const context=document.createElement('canvas').getContext('2d')
 let size=124
 if(context){context.font='700 124px Tahoma, sans-serif';size=Math.min(124,124*112/Math.max(1,context.measureText(label).width))}
 const qr='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrSvg)
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1122" height="1402" viewBox="0 0 1122 1402"><image href="${background}" width="1122" height="1402"/><svg x="587" y="88" width="118" height="126" viewBox="582 88 3 126" preserveAspectRatio="none" overflow="hidden"><image href="${background}" width="1122" height="1402"/></svg><text x="646" y="200" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="${size}" font-weight="700" fill="white">${escapeXml(label)}</text><rect x="294" y="426" width="528" height="515" fill="white"/><image href="${escapeXml(qr)}" x="300" y="426" width="515" height="515"/></svg>`
}
export async function tablePosterPng(svgUrl:string) {
 const image=new Image();image.src=svgUrl;await image.decode()
 const canvas=document.createElement('canvas');canvas.width=2244;canvas.height=2804
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable')
 context.drawImage(image,0,0,canvas.width,canvas.height)
 return canvas.toDataURL('image/png')
}
