/** HttpOnly session cookie for authenticated users */
export const AUTH_TOKEN_NAME = 'auth_token'

/** Short-lived JWT after Signet SSO when local 2FA step-up is required */
export const SIGNET_2FA_PENDING_COOKIE = 'signet_2fa_pending'

export const SIGNET_OAUTH_STATE_COOKIE = 'signet_oauth_state'
export const SIGNET_NEXT_COOKIE = 'signet_next'
export const SIGNET_REMEMBER_ME_COOKIE = 'signet_remember_me'

export const SIGNET_2FA_PENDING_TTL = '10m'
