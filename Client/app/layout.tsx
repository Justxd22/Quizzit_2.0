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

export const metadata: Metadata = {
  title: "Quizzit",
  description: "Quizzit Ai quiz generator based off your own material, with little challenge to get you excited to pass the quizz!",
};

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
