import { Component, type PropsWithChildren } from 'react'

export class AppErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main className="grid min-h-screen place-items-center p-6"><section role="alert" className="max-w-md border border-line bg-white p-6"><h1 className="text-xl font-bold">เปิดหน้านี้ไม่สำเร็จ</h1><p className="mt-3 text-sm text-muted">กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้าอีกครั้ง หากกำลังส่งออเดอร์ ให้ตรวจสอบคิวก่อนสร้างรายการใหม่</p><button type="button" className="mt-5 bg-brand-action px-5 font-semibold text-white" onClick={() => window.location.reload()}>โหลดหน้าอีกครั้ง</button></section></main>
    return this.props.children
  }
}
