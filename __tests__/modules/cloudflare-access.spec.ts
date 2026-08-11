import { cloudflareAccessFailureMessage, looksLikeCloudflareAccess } from '@/services/http/cloudflare-access'

function response(status: number, body = '', headers: Record<string, string> = {}) {
  return new Response(body, { status, headers })
}

describe('looksLikeCloudflareAccess', () => {
  it('detects Access login redirects by location', () => {
    expect(looksLikeCloudflareAccess(302, response(302, '', { location: 'https://login.cloudflareaccess.com/cdn-cgi/access/login' }), '')).toBe(true)
  })

  it('ignores ordinary redirects even when cf-ray is present', () => {
    expect(looksLikeCloudflareAccess(301, response(301, '', { 'cf-ray': 'abc', location: 'https://radarr.example.com/api/v3/system/status' }), '')).toBe(false)
  })

  it('detects Access challenges from body text', () => {
    const body = 'Access denied — login.cloudflareaccess.com'
    expect(looksLikeCloudflareAccess(403, response(403, body), body)).toBe(true)
  })

  it('does not treat orange-cloud API failures as Access', () => {
    expect(looksLikeCloudflareAccess(401, response(401, 'Unauthorized', { 'cf-ray': 'abc' }), 'Unauthorized')).toBe(false)
    expect(looksLikeCloudflareAccess(403, response(403, 'Forbidden', { 'cf-ray': 'abc' }), 'Forbidden')).toBe(false)
  })
})

describe('cloudflareAccessFailureMessage', () => {
  it('guides when CF Access headers are missing', () => {
    expect(cloudflareAccessFailureMessage('Radarr', 302, [])).toMatch(/No custom headers were sent/i)
  })
})
