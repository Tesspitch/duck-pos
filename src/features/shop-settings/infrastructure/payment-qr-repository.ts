import { supabase } from '../../../lib/supabase'
export async function getPaymentQr(shopId:string) {
 const {data,error}=await supabase.from('shop_payment_qr').select('image_path').eq('shop_id',shopId).maybeSingle()
 if(error)throw error
 return data ? supabase.storage.from('shop-assets').getPublicUrl(data.image_path).data.publicUrl : null
}
