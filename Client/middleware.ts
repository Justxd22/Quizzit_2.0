import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-at-least-32-characters-long")

// Maximum number of quiz attempts allowed
const MAX_QUIZ_ATTEMPTS = 3

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
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      // Verify the token
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const { quizAttempts } = payload as { quizAttempts: number }

      // Check if maximum attempts reached
      // check with db how much attempts are left using api?
      if (quizAttempts >= MAX_QUIZ_ATTEMPTS) {
        return NextResponse.redirect(new URL("/attempts-exceeded", request.url))
      }

      // Continue to the protected route
      return NextResponse.next()
    } catch (error) {
      // If token is invalid, redirect to login
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // For non-protected routes, continue
  return NextResponse.next()
}

export const config = {
  matcher: ["/quiz/:path*"],
}
