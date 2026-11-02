import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function ConnectionStatus() {
  const fetching = useIsFetching()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <>
    {!online && <p role="status" className="connection-offline">ขาดการเชื่อมต่ออินเทอร์เน็ต · ข้อมูลอาจไม่เป็นปัจจุบัน ระบบจะอัปเดตเมื่อเชื่อมต่ออีกครั้ง</p>}
    {online && fetching > 0 && <div className="query-progress" role="status" aria-label="กำลังอัปเดตข้อมูล" />}
  </>
}
