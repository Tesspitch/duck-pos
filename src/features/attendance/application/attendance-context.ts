import { createContext, useContext } from 'react'
import type { AttendanceState, HoursFilter, HoursReport, AttendancePosition, PersonalAttendance } from '../domain/attendance'
export interface AttendanceRepository {
  getMine(): Promise<AttendanceState>
  getPersonal(shopId: string, userId: string, now: Date): Promise<PersonalAttendance>
  clockIn(shopId: string, position: AttendancePosition): Promise<void>
  clockOut(entryId: string): Promise<void>
  getReport(shopId: string, filter: HoursFilter): Promise<HoursReport>
}
export const AttendanceContext = createContext<AttendanceRepository | null>(null)
export interface AttendanceLocationService { capture(): Promise<AttendancePosition> }
export const AttendanceLocationContext = createContext<AttendanceLocationService | null>(null)
export function useAttendanceLocation() {
  const value = useContext(AttendanceLocationContext)
  if (!value) throw new Error('AttendanceLocationProvider is missing.')
  return value
}
export function useAttendanceRepository() {
  const value = useContext(AttendanceContext)
  if (!value) throw new Error('AttendanceProvider is missing.')
  return value
}
