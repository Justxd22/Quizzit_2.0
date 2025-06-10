"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Trophy,
  ChevronUp,
  ChevronDown,
  Search,
  Shield,
} from "lucide-react"
import Header from "@/components/ui/header"
import styles from "./leaderboard.module.css"
import Avatar from "boring-avatars"
import { HeroBackground } from "@/components/ui/hero"

type User = {
  id: string
  tx_hash: string
  rank: number
  score: number
  displayName: string
  quizName?: string
}

type PaginationInfo = {
  total: number
  page: number
  limit: number
  pages: number
}

type Quiz = {
  id: string
  name: string
  displayName: string
}

export default function LeaderboardPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  })

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  // Fetch available quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('/api/ava');
        if (response.ok) {
          const data = await response.json();
          // Transform the data to match our Quiz type
          const transformedQuizzes = data.quizzes.map((quiz: any) => ({
            id: quiz.id,
            name: quiz.name,
            displayName: quiz.name.charAt(0).toUpperCase() + quiz.name.slice(1) // Capitalize first letter
          }));
          setQuizzes(transformedQuizzes);
          setSelectedQuiz(transformedQuizzes[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
      }
    };

    fetchQuizzes();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });

        if (selectedQuiz !== "all") {
          queryParams.append("quiz", selectedQuiz);
        }

        const response = await fetch(`/api/score?${queryParams}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }

        const { data, pagination: paginationInfo } = await response.json();
        setUsers(data);
        setFilteredUsers(data);
        setPagination(paginationInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [pagination.page, pagination.limit, selectedQuiz]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.tx_hash.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  // Handle scroll events for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  // Handle quiz tab change
  const handleQuizChange = (quizId: string) => {
    setSelectedQuiz(quizId);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
    setSearchQuery(""); // Clear search when switching tabs
  };

  return (
    <div
      className="w-full min-h-screen overflow-x-hidden"
      style={{
        backgroundImage: "url('/bg2.png')",
        backgroundSize: "cover",
        backgroundPosition: "top",
      }}
    >
      <Header
        className={`transition-all duration-300 ${isScrolled ? "bg-black/80 backdrop-blur-lg" : "bg-transparent"}`}
      />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <HeroBackground/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 pointer-events-none"></div>

        <section className="w-full py-8 md:py-12 relative">
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col items-center text-center space-y-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">GLOBAL LEADERBOARD</h1>
            </motion.div>
          </div>
        </section>

        {/* Quiz Tabs */}
        <section className="py-4 relative">
          <div className="container px-4 md:px-6">
            <div className="flex justify-center mb-8">
              <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-purple-500/30 p-2 shadow-2xl">
                <div className="flex flex-wrap justify-center gap-2">
                  {quizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => handleQuizChange(quiz.id)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105  ${
                        selectedQuiz === quiz.id
                          ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                          : "text-gray-300 hover:text-white hover:bg-purple-500/20"
                      }`}
                    >
                      {quiz.displayName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Leaderboard Table */}
        <section className="w-full py-4 relative">
          <div className="container px-4 md:px-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={() => handlePageChange(1)} 
                  className="mt-4 px-4 py-2 bg-purple-500/30 rounded-lg text-white hover:bg-purple-500/50"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-purple-500/30 bg-black/70 backdrop-blur-sm overflow-hidden shadow-lg shadow-purple-500/10">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-purple-500/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {filteredUsers.length > 0 ? filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          className={`${styles.playerRow} relative`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.rank <= 3 ? (
                                <Trophy
                                  className={`h-5 w-5 mr-2 ${
                                    user.rank === 1
                                      ? "text-yellow-400"
                                      : user.rank === 2
                                        ? "text-gray-300"
                                        : "text-amber-600"
                                  }`}
                                />
                              ) : (
                                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-gray-300 mr-2">
                                  {user.rank}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-purple-500/30 mr-3 relative">
                                <Avatar
                                  size={40}
                                  name={user.tx_hash}
                                  variant="bauhaus"
                                  colors={["#F1039C", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B"]}
                                />
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <div className="font-medium text-white">{user.displayName}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-white">{user.score.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Performance Points</div>
                          </td>
                        </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            No users found matching your search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center items-center py-4 border-t border-purple-500/30">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 rounded-lg bg-black/50 border border-purple-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                    >
                      Previous
                    </button>
                    <div className="px-4 text-sm text-gray-300">
                      Page {pagination.page} of {pagination.pages}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 rounded-lg bg-black/50 border border-purple-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}