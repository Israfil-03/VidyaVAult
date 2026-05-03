import type { ApiEnvelope } from '../types'

const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const API_BASE_URL = configuredUrl 
  ? (configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`)
  : '/api'


interface ApiRequestOptions extends RequestInit {
  token?: string | null
}

export const apiRequest = async <T>(
  path: string,
  { token, headers, ...options }: ApiRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed')
  }

  return payload.data
}
