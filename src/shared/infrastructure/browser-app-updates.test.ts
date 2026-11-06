import { expect,test,vi } from 'vitest'
import { createBrowserAppUpdates } from './browser-app-updates'

test('worker activation in another tab offers update without reloading this tab',async()=>{
 const container=new EventTarget() as ServiceWorkerContainer
 Object.defineProperty(container,'controller',{value:{},configurable:true})
 const registration=Object.assign(new EventTarget(),{waiting:null,installing:null,update:vi.fn(async()=>{})})
 Object.assign(container,{register:vi.fn(async()=>registration)})
 const reload=vi.fn(),service=createBrowserAppUpdates(container,reload),stop=service.start()
 try{await Promise.resolve();container.dispatchEvent(new Event('controllerchange'));expect(service.getSnapshot().available).toBe(true);expect(reload).not.toHaveBeenCalled();await service.apply();expect(reload).toHaveBeenCalledTimes(1)}finally{stop()}
})
test('waiting worker receives skip-waiting only after explicit apply',async()=>{
 const container=new EventTarget() as ServiceWorkerContainer
 Object.defineProperty(container,'controller',{value:{}})
 const worker=Object.assign(new EventTarget(),{state:'installed',postMessage:vi.fn()})
 const registration=Object.assign(new EventTarget(),{waiting:worker,installing:null,update:vi.fn(async()=>{})})
 Object.assign(container,{register:vi.fn(async()=>registration)})
 const reload=vi.fn(),service=createBrowserAppUpdates(container,reload),stop=service.start()
 try{await Promise.resolve();expect(service.getSnapshot().available).toBe(true);expect(worker.postMessage).not.toHaveBeenCalled();const applying=service.apply();expect(reload).not.toHaveBeenCalled();expect(worker.postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'});worker.state='activated';worker.dispatchEvent(new Event('statechange'));await applying;expect(reload).toHaveBeenCalledTimes(1)}finally{stop()}
})
