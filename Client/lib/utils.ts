import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SignJWT } from "jose"

const JWT_SECRET = process.env.JWT_SECRET;
const encoder = new TextEncoder();
const encodedSecret = encoder.encode(JWT_SECRET); 

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Create a JWT token for authentication
 */
export async function createJwtToken(walletAddress: string, txHash: string, quizAttempts: number): Promise<string> {
  const token = await new SignJWT({
    walletAddress,
    txHash,
    quizAttempts,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(encodedSecret)

  return token
}
