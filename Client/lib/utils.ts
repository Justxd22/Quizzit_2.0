import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
