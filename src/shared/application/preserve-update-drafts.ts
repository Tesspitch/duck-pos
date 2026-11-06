import { useCartStore } from '../../features/customer-ordering/application/cart-store'
import { usePosCartStore } from '../../features/staff-orders/application/pos-cart-store'

/** Explicit writes must succeed before activating an update or reloading. */
export function preserveUpdateDrafts(){
  const customer=useCartStore.getState(),pos=usePosCartStore.getState()
  sessionStorage.setItem('duckpos-customer-cart',JSON.stringify({version:0,state:{shopId:customer.shopId,lines:customer.lines,orderNote:customer.orderNote,request:customer.request}}))
  sessionStorage.setItem('duckpos-staff-pos-cart',JSON.stringify({version:0,state:{shopId:pos.shopId,lines:pos.lines,orderNote:pos.orderNote,requestId:pos.requestId}}))
}
