import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import type { Context } from '@/initializer/controller'
import { jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { loadAliasarrConfig } from '@/services/config'
import { assertTorznabApiKey, UnauthorizedError } from '@/services/security/api-key'

export interface ApiKeyContext extends Context {
  $$authorized?: boolean
}

export interface AuthContext extends Context {
  $$authorized?: boolean
}

export function extractApiKey(req: NextRequest): string | null {
  const xApiKey = req.headers.get('x-api-key')
  if (xApiKey?.trim()) return xApiKey.trim()

  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }

  return req.nextUrl.searchParams.get('apikey')
}

export function withApiKeyHandler<C extends Context>(handle: (req: NextRequest, context: C & ApiKeyContext) => Promise<any>) {
  return async (req: NextRequest, context: C & ApiKeyContext) => {
    try {
      const stored = await loadAliasarrConfig()
      assertTorznabApiKey(extractApiKey(req), stored.secrets.torznabApiKey)
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return jsonUnauthorized()
      }
      throw error
    }
    return handle(req, context)
  }
}

export function withAuthHandler<C extends Context>(handle: (req: NextRequest, context: C & AuthContext) => Promise<any>) {
  return async (req: NextRequest, context: C & AuthContext) => {
    if (!(await validateCookie())) {
      return jsonUnauthorized()
    }
    return handle(req, context)
  }
}

interface Action<A extends any[], R> {
  (...args: A): Promise<R>
  $$: (...args: A) => Promise<R>
}

export function withAuthAction<A extends any[], R>(request: (...args: A) => Promise<R>): Action<A, R> {
  const action = async (...args: A): Promise<R> => {
    if (!(await validateCookie())) {
      redirect('/login')
    }
    return request(...args)
  }
  action.$$ = request
  return action
}

export function trimAction<A extends any[], R>(action: Action<A, R>) {
  return action.$$
}
