/** Detect Cloudflare Access challenges without mistaking ordinary *arr API-key 401s. */
export function looksLikeCloudflareAccess(status: number, response: Response, body: string): boolean {
  const location = response.headers.get('location') ?? ''
  const cfRay = Boolean(response.headers.get('cf-ray'))
  if (status >= 300 && status < 400) {
    return cfRay || /cloudflareaccess\.com|cf-access/i.test(location)
  }
  if (status === 403 || status === 401) {
    return cfRay || /cloudflareaccess\.com|cf-access|access denied/i.test(body)
  }
  return /login\.cloudflareaccess\.com/i.test(body)
}

export function cloudflareAccessFailureMessage(label: string, status: number, sentHeaderNames: string[]): string {
  const accessHeaders = sentHeaderNames.filter((name) => /^cf-access-client-(id|secret)$/i.test(name))
  const headerNote =
    sentHeaderNames.length === 0
      ? ' No custom headers were sent — add them under Custom headers for this app, save, then retest.'
      : accessHeaders.length < 2
        ? ` Custom headers sent (${sentHeaderNames.join(', ')}), but Cloudflare Access usually needs both CF-Access-Client-Id and CF-Access-Client-Secret. Also confirm the Service Token is allowed by the Access policy.`
        : ` Custom headers sent (${sentHeaderNames.join(', ')}). Confirm the Service Token is valid and allowed by the Cloudflare Access policy for this hostname.`
  return `${label} is blocked before the API (HTTP ${status}).${headerNote}`
}
