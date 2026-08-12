describe('verify2fa', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('accepts a valid TOTP for the secret', async () => {
    const { authenticator } = await import('otplib')
    const secret = authenticator.generateSecret()
    const token = authenticator.generate(secret)
    const { verify2fa } = await import('../../services/2fa')
    await expect(verify2fa({ token, secret })).resolves.toBe(true)
  })

  it('rejects an invalid TOTP', async () => {
    const { authenticator } = await import('otplib')
    const secret = authenticator.generateSecret()
    const { verify2fa } = await import('../../services/2fa')
    await expect(verify2fa({ token: '000000', secret })).resolves.toBe(false)
  })
})
