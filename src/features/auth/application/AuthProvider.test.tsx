import type { Session } from '@supabase/supabase-js'
import { act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import type { AuthGateway } from './auth-gateway'
import { useAuth } from './auth-context'

const sessionFor = (id: string) => ({ user: { id } }) as Session

test('account changes invalidate cached data and a late initial session cannot restore the old account', async () => {
  let finishInitialSession!: (session: Session) => void
  let emitSession!: (session: Session | null) => void
  const onAccountChange = vi.fn()
  const gateway: AuthGateway = {
    getSession: () => new Promise(resolve => { finishInitialSession = resolve }),
    onSessionChange: listener => {
      emitSession = listener
      return () => undefined
    },
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }
  function CurrentUser() { return <p>{useAuth().user?.id ?? 'signed out'}</p> }
  render(<AuthProvider gateway={gateway} onAccountChange={onAccountChange}><CurrentUser /></AuthProvider>)

  act(() => emitSession(sessionFor('first')))
  act(() => emitSession(sessionFor('first')))
  expect(onAccountChange).not.toHaveBeenCalled()
  act(() => emitSession(sessionFor('second')))
  expect(onAccountChange).toHaveBeenCalledTimes(1)
  await act(async () => finishInitialSession(sessionFor('first')))
  expect(screen.getByText('second')).toBeVisible()
  act(() => emitSession(null))
  expect(onAccountChange).toHaveBeenCalledTimes(2)
  expect(screen.getByText('signed out')).toBeVisible()
})
