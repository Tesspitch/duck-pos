export function LoadingState({ label = 'กำลังโหลดข้อมูล…' }: { label?: string }) {
  return <div role="status" aria-live="polite" className="loading-state"><span className="loading-spinner" aria-hidden="true" /><span>{label}</span></div>
}
