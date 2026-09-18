import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'sg_session'

// Lightweight edge check: presence of session cookie. Full JWT verification
// happens server-side (layouts + API routes) — this just avoids rendering
// protected pages for obviously unauthenticated visitors.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/groups')

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/groups/:path*', '/login', '/register'],
}
