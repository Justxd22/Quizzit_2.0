import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const DM_Sans = localFont({
  src: "./fonts/DMSans-Bold.ttf",
  variable: "--font-dmsans",
  weight: "100 900",
});


export const metadata = {
  // Set the base URL for all relative paths
  metadataBase: new URL('https://quizzit-2-0.vercel.app'),
  
  // Basic site info
  title: 'Quizzit',
  description: 'Quizzit Ai quiz generator based off your own material, with little challenge to get you excited to pass the quizz!',
  
  // Icons configuration - this covers most icon needs
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/log.jpg', type: 'image/jpeg' }
    ],
    apple: '/log.jpg', // Apple touch icon
  },
  
  // Open Graph for Facebook, LinkedIn, etc.
  openGraph: {
    title: 'Quizzit',
    description: 'Quizzit Ai quiz generator based off your own material, with little challenge to get you excited to pass the quizz!',
    url: 'https://quizzit-2-0.vercel.app',
    siteName: 'Quizzit',
    images: [
      {
        url: '/log.jpg', // This will be your preview image
        width: 1200,
        height: 630,
        alt: 'Quizzit - AI Quiz Generator',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter/X cards
  twitter: {
    card: 'summary_large_image',
    title: 'Quizzit',
    description: 'Quizzit Ai quiz generator based off your own material, with little challenge to get you excited to pass the quizz!',
    images: ['/log.jpg'], // Twitter preview image
  },
  
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}  ${DM_Sans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
