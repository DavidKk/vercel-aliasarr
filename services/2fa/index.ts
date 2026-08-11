import { authenticator } from 'otplib'

export async function verify2fa(params: { token: string; secret: string }): Promise<boolean> {
  try {
    return authenticator.check(params.token, params.secret)
  } catch {
    return false
  }
}
