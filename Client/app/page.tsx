"use client";

import React, { useRef, useEffect } from "react";
import { Shield, Award, Zap, Lock, BarChart2, Trophy } from "lucide-react";
import Header from "@/components/ui/header";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { HeroBackground } from "@/components/ui/hero";
import { HeroBackgroundDiff } from "@/components/ui/hero_inverse";

// Animation variants (can be customized)
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

// Define Footer component directly in this file
const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-700 bg-black py-6 md:py-10">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 md:px-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          {/* Optional: Add your logo image here if you have one */}
          {/* <Image src="/logo.svg" alt="Logo" width={45} height={40} className="h-8 w-8 text-primary" /> */}
          <Zap size={24} className="text-purple-400" /> {/* Placeholder Icon */}
          <span className="text-white">Quizzit</span>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs text-gray-400 hover:text-white hover:underline underline-offset-4 transition-colors">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs text-gray-400 hover:text-white hover:underline underline-offset-4 transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="text-xs text-gray-400 hover:text-white hover:underline underline-offset-4 transition-colors">
            Contact
          </Link>
        </nav>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Quizzit. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-black text-white"> {/* Ensure base background */}
      {/* Hero */}
      <section
        id="hero"
        className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Hero Background */}
        <HeroBackground />
        {/* Gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 pointer-events-none"></div>

        <Header /> {/* Header might need position adjustments (e.g., absolute or fixed) if overlapping */}

        {/* Centered Text Content */}
        <div className="container mx-auto flex flex-col items-center justify-center px-6 py-20 relative z-10 text-center"> {/* Centering content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl space-y-6" // Removed flex-1, md:max-w-xl, text-left, md:pr-10. Added max-width for readability.
          >
            <motion.h1
              variants={fadeIn}
              className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600" // Possibly larger text
            >
              Stake Your ETH. Challenge Your Mind.
            </motion.h1>
            <motion.p variants={fadeIn} className="text-lg md:text-xl text-gray-300">
              Upload your study material and let our AI quiz you. Pass to get your
              ETH back or donate to a charity if you fail.
            </motion.p>
            <motion.div variants={fadeIn}>
              <Link
                href="/start"
                className="inline-block px-8 py-4 bg-gradient-to-r from-green-400 to-blue-500 text-black font-bold rounded-lg shadow-lg hover:scale-105 hover:shadow-xl transition-transform duration-300 ease-in-out"
              >
                Get Started Now
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-950 py-20">
         <div className="container mx-auto px-6 text-center">
           <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeIn}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
           >
             How It Works
           </motion.h2>
           <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeIn}
            className="text-gray-400 mb-12 max-w-2xl mx-auto"
           >
             A simple, transparent process that puts your knowledge—and your
             stake—on the line.
           </motion.p>
           <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
           >
            {[
              { icon: Zap, title: "1. Deposit ETH", description: "Stake your ETH securely via our smart contract." },
              { icon: Shield, title: "2. Upload Materials", description: "Provide your study materials—PDFs, slides, or docs." },
              { icon: Award, title: "3. AI-Generated Quiz", description: "Let AI challenge you with custom quizzes." },
              { icon: Trophy, title: "4. Win or Donate", description: "Pass to reclaim your ETH; fail and donate to charity." },
            ].map((step, i) => (
               <motion.div
                key={i}
                variants={fadeIn}
                whileHover={{ y: -5, scale: 1.03 }}
                className="space-y-4 p-6 bg-gray-800/50 border border-purple-600/30 rounded-lg transition-all duration-300 hover:bg-gray-800 hover:border-purple-500"
               >
                 <step.icon className="w-8 h-8 text-purple-400 mx-auto" />
                 <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                 <p className="text-gray-400">{step.description}</p>
               </motion.div>
             ))}
           </motion.div>
         </div>
       </section>

      {/* Features Section (Example - using existing icons/structure) */}
{/* Features Section (Why Choose Quizzit) */}
<section id="features" className="relative py-20 bg-black overflow-hidden">
  {/* Hero-like Background */}
  <HeroBackgroundDiff />
  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

  <div className="relative z-10 container mx-auto px-6">
    <motion.h2
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeIn}
      className="text-3xl md:text-4xl font-bold text-white text-center mb-12"
    >
      Why Choose Quizzit?
    </motion.h2>

    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={staggerContainer}
      className="grid grid-cols-1 md:grid-cols-3 gap-10"
    >
      {[
        {
          icon: <Zap className="h-8 w-8 text-blue-400" />,
          title: "AI-Powered Quizzes",
          description:
            "Intelligent quizzes generated instantly from your learning materials.",
        },
        {
          icon: <Shield className="h-8 w-8 text-green-400" />,
          title: "Secure ETH Staking",
          description:
            "Transparent and secure staking process managed by smart contracts.",
        },
        {
          icon: <Award className="h-8 w-8 text-yellow-400" />,
          title: "Learn & Earn (or Donate)",
          description:
            "Motivate your studies with real stakes and support charities.",
        },
        {
          icon: <Trophy className="h-8 w-8 text-red-400" />,
          title: "Only 3 Attempts",
          description:
            "Three chances per quiz, with hints between rounds to boost your score.",
        },
        {
          icon: <Lock className="h-8 w-8 text-gray-400" />,
          title: "Privacy First",
          description:
            "We never store your files or answers—AI and smart contracts handle it live.",
        },
        {
          icon: <BarChart2 className="h-8 w-8 text-purple-400" />,
          title: "Feedback & Insights",
          description:
            "Get detailed breakdowns of your answers so you can learn and improve.",
        },
      ].map((f, i) => (
        <motion.div
          key={i}
          variants={fadeIn}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          className="flex flex-col items-start gap-3 p-6 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <div className="rounded-lg bg-gray-800 p-3">{f.icon}</div>
          <h3 className="text-xl font-bold text-white">{f.title}</h3>
          <p className="text-gray-300">{f.description}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>


      {/* FAQ - Example Structure */}
      <section id="faq" className="bg-gray-950 py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={fadeIn}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-10"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={staggerContainer}
            className="space-y-6"
          >
            {[
              { q: "How does the ETH staking work?", a: "You deposit ETH into a secure smart contract. If you pass the quiz generated from your materials within 3 attempts, the ETH is returned to your wallet. If you fail, the ETH is automatically sent to a pre-determined charity address." },
              { q: "What kind of materials can I upload?", a: "Currently, we support PDF files, text documents, and potentially slides (depending on format). We are working on expanding compatibility." },
              { q: "Is my data secure?", a: "Yes, we prioritize privacy. Your uploaded materials are processed by the AI in real-time to generate quizzes and are not stored long-term. The staking is handled transparently on the blockchain via smart contracts." },
              { q: "What happens if I fail the quiz?", a: "If you don't pass the quiz within three attempts, your staked ETH is automatically transferred to the designated charity partner via the smart contract." },
              { q: "How is the passing score determined?", a: "The passing threshold (e.g., 70% or 80%) is set per quiz, often based on the complexity and length of the material. This will be clearly indicated before you start." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeIn} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-lg text-white mb-2">{item.q}</h3>
                <p className="text-gray-400">{item.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer /> 
    </div>
  );
}