import { isSignetPendingClaims } from '../../services/auth/signet-sdk'

describe('Signet pending claims', () => {
  it('accepts step-up pending payloads', () => {
    expect(
      isSignetPendingClaims({
        signetPending: true,
        provider: 'signet',
        username: 'admin',
        sub: 'sub',
        rememberMe: false,
        nextPath: '/admin',
      })
    ).toBe(true)
  })

  it('rejects authenticated session payloads', () => {
    expect(isSignetPendingClaims({ authenticated: true, provider: 'signet', username: 'admin' })).toBe(false)
  })
})
