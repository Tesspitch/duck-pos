// Captured at application startup, before any client-side route changes.
const initialPath = window.location.pathname
const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
const freshDocument = !navigation || navigation.type === 'navigate'
let consumed = false

export function consumeFreshTableEntry(path: string) {
  if (consumed || !freshDocument || initialPath !== path) return false
  consumed = true
  return true
}
