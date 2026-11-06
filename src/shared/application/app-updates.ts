export interface AppUpdateState {available:boolean;applying:boolean;error:string|null}
export interface AppUpdates {
  getSnapshot:()=>AppUpdateState
  subscribe:(listener:()=>void)=>()=>void
  start:()=>()=>void
  apply:()=>Promise<void>
}
