/**
 * API key authentication middleware.
 *
 * Applies to all /api/** routes. The X-API-Key header must contain one of the
 * keys listed in the API_KEYS environment variable (comma-separated).
 *
 * Public routes (the Nuxt frontend) are not affected.
 */

// Lazily parsed key set — built once on first request, reused thereafter.
let _keySet: Set<string> | null = null

function getKeySet(): Set<string> {
  if (_keySet) return _keySet

  const raw = process.env.API_KEYS ?? ''
  const keys = raw
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)

  if (keys.length === 0) {
    console.warn('[p2h-service] WARNING: API_KEYS is not set. All API requests will be rejected.')
  }

  _keySet = new Set(keys)
  return _keySet
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Only protect API routes
  if (!path.startsWith('/api/')) return

  const providedKey = getHeader(event, 'x-api-key') ?? ''

  if (!providedKey || !getKeySet().has(providedKey)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid API key. Provide a valid key in the X-API-Key header.'
    })
  }

  // Attach the validated key to the event context for downstream use (e.g. rate limiting)
  event.context.apiKey = providedKey
})
