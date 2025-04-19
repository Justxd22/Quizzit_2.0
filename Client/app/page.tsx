"use client"

import { useMemo } from "react"
import { Shield, Award, Zap, Lock, BarChart2, Trophy } from "lucide-react"
import Header from "@/components/ui/header"
import { motion } from "framer-motion"
import BlurText from "@/components/ui/BlurText"
import Spline from "@splinetool/react-spline/next"
import Link from "next/link"
import Image from "next/image"


export default function LandingPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const startText = useMemo(() => ["out smart AI", "or save PUPPIES"], [])

  return (
    <div className="w-full overflow-x-hidden">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 -z-10">
          <Spline scene="/1.splinecode" />
          <div className="absolute bottom-0 left-0 w-full h-40 z-10 bg-gradient-to-b from-transparent to-black/100 pointer-events-none" />

        </div>

        <Header />
        <div className="flex min-h-screen flex-col justify-center items-center px-6 py-20 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="w-full max-w-[800px] mx-auto flex flex-col gap-8"
          >
            <BlurText
              key="start"
              text={startText}
              delay={150}
              animateBy="words"
              direction="top"
              className="text-6xl font-bold"
            />
            <motion.p className="text-3xl font-bold gradient-text" variants={fadeIn} transition={{ delay: 3 }}>
              AI-Powered. Blockchain-Secured.
            </motion.p>
          </motion.div>
        </div>
      </div>


      <div
        className="w-full relative"
        style={{
          backgroundImage: "url('/bg3.png')",
          backgroundSize: "cover",
          backgroundPosition: "top",
        }}
      >

<section id="features" className="w-full py-4 md:py-6 lg:py-12 relative">
  <div className="container px-4 md:px-6 relative z-10">
    <motion.div
      className="flex flex-col items-center justify-center space-y-4 text-center"
      initial="hidden"
      whileInView="visible"
      variants={fadeIn}
      viewport={{ once: true, margin: "-100px" }}
    >
      <div className="space-y-2">
        <div className="inline-block rounded-lg bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
          Key Features
        </div>
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">
          Study Hard. Pass Smart. Get Paid.
        </h2>
        <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          AI-generated quizzes from your course materials. Beat the test. Earn back your $10—or donate it to a cause if you don’t.
        </p>
      </div>
    </motion.div>

    <motion.div
      className="mx-auto grid max-w-5xl items-center gap-6 py-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-16"
      variants={staggerChildren}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
    >
      {[
        {
          icon: <Zap className="h-6 w-6 text-blue-400" />,
          title: "AI Quiz Generator",
          description:
            "Upload your PDFs, slides, or docs—our AI crafts smart, course-specific quizzes so you can prep efficiently.",
        },
        {
          icon: <Shield className="h-6 w-6 text-blue-400" />,
          title: "Blockchain Score Tracking",
          description:
            "Your scores are recorded immutably on-chain. Pass with 80% or more, and your funds return to your wallet.",
        },
        {
          icon: <Award className="h-6 w-6 text-blue-400" />,
          title: "Study like your life depends on it",
          description:
            "Pay $10 to enter. Pass the quiz, get it back. Fail all 3 tries? It goes to a vetted charity or shelter.",
        },
        {
          icon: <Trophy className="h-6 w-6 text-blue-400" />,
          title: "Only 3 Attempts",
          description:
            "Make it count! You get three chances to beat the quiz. Don’t worry—we give you hints between rounds.",
        },
        {
          icon: <Lock className="h-6 w-6 text-blue-400" />,
          title: "Privacy First",
          description:
            "We don’t store your files. Everything is processed securely using AI and smart contracts you can verify.",
        },
        {
          icon: <BarChart2 className="h-6 w-6 text-blue-400" />,
          title: "Learn With Feedback",
          description:
            "Get detailed breakdowns of your answers so you can actually learn what went wrong—then try again smarter.",
        },
      ].map((feature, index) => (
        <motion.div
          key={index}
          className="flex flex-col items-start gap-2"
          variants={fadeIn}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
        >
          <div className="rounded-lg bg-blue-300/20 p-2">{feature.icon}</div>
          <h3 className="text-xl font-bold text-white">{feature.title}</h3>
          <p className="text-gray-300">{feature.description}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>
<footer className="w-full border-t bg-background py-6 md:py-12">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={45}
              height={40}
              className="h-8 w-8 text-primary"
            />
            <span>Quizzit</span>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="#"
              className="text-xs hover:underline underline-offset-4"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-xs hover:underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs hover:underline underline-offset-4"
            >
              Contact
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Quizzit. All rights reserved.
          </p>
        </div>
      </footer>
      </div>
    </div>
  )
}
