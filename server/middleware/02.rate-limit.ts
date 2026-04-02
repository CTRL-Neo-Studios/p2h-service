/**
 * In-memory rate limiting middleware.
 *
 * Runs after auth (01.auth.ts) so event.context.apiKey is always populated.
 * Rate limit is applied per API key. Window and max-requests are configurable
 * via environment variables.
 */

interface WindowState {
  count: number
  resetAt: number
}

// Keyed by API key string
const windows = new Map<string, WindowState>()

function getRateLimitConfig() {
  const max = parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10)
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10)
  return { max, windowMs }
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Only applies to API routes (auth middleware already gated non-API routes)
  if (!path.startsWith('/api/')) return

  const key: string = event.context.apiKey as string
  const { max, windowMs } = getRateLimitConfig()
  const now = Date.now()

  let state = windows.get(key)

  if (!state || now >= state.resetAt) {
    // Start a fresh window
    state = { count: 0, resetAt: now + windowMs }
    windows.set(key, state)
  }

  state.count++

  const remaining = Math.max(0, max - state.count)
  const retryAfterSecs = Math.ceil((state.resetAt - now) / 1000)

  // Set standard rate-limit headers
  setResponseHeader(event, 'X-RateLimit-Limit', max)
  setResponseHeader(event, 'X-RateLimit-Remaining', remaining)
  setResponseHeader(event, 'X-RateLimit-Reset', Math.ceil(state.resetAt / 1000))

  if (state.count > max) {
    setResponseHeader(event, 'Retry-After', retryAfterSecs)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfterSecs} second(s).`
    })
  }
})
