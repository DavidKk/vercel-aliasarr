import { NextRequest } from 'next/server'

import { extractApiKey } from '../../initializer/wrapper'

describe('extractApiKey', () => {
  it('reads x-api-key header first', () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      headers: { 'x-api-key': ' from-header ', authorization: 'Bearer ignored' },
    })
    expect(extractApiKey(req)).toBe('from-header')
  })

  it('reads Bearer authorization', () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      headers: { authorization: 'Bearer token-value' },
    })
    expect(extractApiKey(req)).toBe('token-value')
  })

  it('reads apikey query param', () => {
    const req = new NextRequest('http://localhost/api/mcp?apikey=query-key')
    expect(extractApiKey(req)).toBe('query-key')
  })

  it('returns null when missing', () => {
    const req = new NextRequest('http://localhost/api/mcp')
    expect(extractApiKey(req)).toBeNull()
  })
})
