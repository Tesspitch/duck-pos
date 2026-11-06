import type { AppUpdates, AppUpdateState } from '../application/app-updates'

export function createBrowserAppUpdates(
  container:ServiceWorkerContainer|undefined=navigator.serviceWorker,
  reload:()=>void=()=>window.location.reload(),
):AppUpdates {
  let state:AppUpdateState={available:false,applying:false,error:null}
  let registration:ServiceWorkerRegistration|undefined
  const listeners=new Set<()=>void>()
  const set=(patch:Partial<AppUpdateState>)=>{state={...state,...patch};listeners.forEach(fn=>fn())}
  return {
    getSnapshot:()=>state,
    subscribe(fn){listeners.add(fn);return ()=>{listeners.delete(fn)}},
    start(){
      if(!container)return ()=>{}
      let active=true,hadController=Boolean(container.controller),lastCheck=0
      const cleanups:Array<()=>void>=[]
      const inspect=()=>{if(active&&registration?.waiting&&hadController)set({available:true,error:null})}
      const watch=()=>{
        const worker=registration?.installing
        if(!worker)return
        const installed=()=>{if(worker.state==='installed')inspect()}
        worker.addEventListener('statechange',installed)
        cleanups.push(()=>worker.removeEventListener('statechange',installed))
      }
      const controllerChanged=()=>{
        // Another tab can activate the worker; it must never reload this tab.
        if(hadController&&active&&!state.applying)set({available:true,error:null})
        hadController=true
      }
      const check=()=>{
        if(!active||!registration||!navigator.onLine||document.visibilityState==='hidden'||Date.now()-lastCheck<60_000)return
        lastCheck=Date.now()
        void registration.update().catch(()=>{})
      }
      container.addEventListener('controllerchange',controllerChanged)
      window.addEventListener('online',check)
      window.addEventListener('focus',check)
      document.addEventListener('visibilitychange',check)
      const timer=window.setInterval(check,15*60_000)
      void container.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{
        if(!active)return
        registration=value
        registration.addEventListener('updatefound',watch)
        cleanups.push(()=>value.removeEventListener('updatefound',watch))
        watch();inspect();check()
      }).catch(()=>{/* Unsupported/offline registration must not interrupt ordering. */})
      return ()=>{
        active=false;clearInterval(timer);cleanups.forEach(fn=>fn())
        container.removeEventListener('controllerchange',controllerChanged)
        window.removeEventListener('online',check);window.removeEventListener('focus',check)
        document.removeEventListener('visibilitychange',check)
      }
    },
    async apply(){
      if(!state.available||state.applying)return
      set({applying:true,error:null})
      try {
        const worker=registration?.waiting
        if(worker)await new Promise<void>((resolve,reject)=>{
          const finish=(error?:Error)=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);if(error)reject(error);else resolve()}
          const changed=()=>{if(worker.state==='activated')finish();else if(worker.state==='redundant')finish(new Error('Update was superseded.'))}
          const timer=window.setTimeout(()=>finish(new Error('Update activation timed out.')),20_000)
          worker.addEventListener('statechange',changed)
          try{worker.postMessage({type:'SKIP_WAITING'});changed()}catch(error){finish(error instanceof Error?error:new Error('Update failed.'))}
        })
        reload()
      }catch{
        set({applying:false,error:'อัปเดตไม่สำเร็จ กรุณาลองอีกครั้ง'})
      }
    },
  }
}
export const browserAppUpdates=createBrowserAppUpdates()
