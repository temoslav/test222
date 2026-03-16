import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  // In development the Windsurf browser-preview proxy forwards requests with
  // Origin: http://127.0.0.1:<random-port> while Host stays localhost:3001.
  // Next.js 14 rejects Server Actions when Origin ≠ Host, so we patch
  // x-forwarded-host to equal the incoming origin host (dev only).
  const requestHeaders = new Headers(request.headers)
  if (process.env.NODE_ENV === 'development') {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          requestHeaders.set('x-forwarded-host', originHost)
        }
      } catch {
        // malformed origin — leave headers unchanged
      }
    }
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30, // 30 days
            })
          )
        },
      },
    }
  )

  // Refresh the session — IMPORTANT: do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const feedUrl = request.nextUrl.clone()
    feedUrl.pathname = '/feed'
    return NextResponse.redirect(feedUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/api/interactions/:path*',
    '/api/seller/:path*',
  ],
}
