import { getHealthPayload } from '@/services/app/health'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(): Promise<Response> {
  const body = await getHealthPayload()
  return Response.json(body)
}
