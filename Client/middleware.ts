import { type NextRequest, NextResponse } from "next/server"

// Paths that require authentication
const PROTECTED_PATHS = ["/quiz"]

export async function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl

  // Check if the path is protected
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    // Get the token from cookies or authorization header
    const token = request.cookies.get("authToken")?.value || request.headers.get("Authorization")?.split(" ")[1]
    // console.log('tokkkk', token);

    // If no token is present, redirect to login
    if (!token || token == "undefined") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    // Continue to the protected route
    return NextResponse.next()
  }

  // For non-protected routes, continue
  return NextResponse.next()
}

export const config = {
  matcher: ["/quiz/:path*"],
}
