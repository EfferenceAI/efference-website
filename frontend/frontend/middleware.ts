import { NextRequest, NextResponse } from 'next/server'

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Check for our auth cookie (set by our auth API route)
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
