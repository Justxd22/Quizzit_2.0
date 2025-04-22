"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Header from "@/components/ui/header";
import { HeroBackground } from "@/components/ui/hero";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.03,
    boxShadow: "0 0 15px rgba(74, 222, 128, 0.5)",
    transition: { type: "spring", stiffness: 400 },
  },
  tap: { scale: 0.97 },
};

// Create motion components
const MotionCard = motion(Card);
const MotionButton = motion(Button);

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setErrorMessage("Please upload a PDF file.");
        setUploadStatus("error");
        setFile(null);
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setErrorMessage("File size exceeds 10MB limit.");
        setUploadStatus("error");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setUploadStatus("idle");
      setErrorMessage("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        setErrorMessage("Please upload a PDF file.");
        setUploadStatus("error");
        setFile(null);
        return;
      }
      
      if (droppedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setErrorMessage("File size exceeds 10MB limit.");
        setUploadStatus("error");
        setFile(null);
        return;
      }
      
      setFile(droppedFile);
      setUploadStatus("idle");
      setErrorMessage("");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus("idle");
    
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("file", file);
      
      // Optional: Add number of questions parameter
      formData.append("num_questions", "10"); // Default to 10 questions
      
      // Send to our API endpoint
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      setTimeout(() => {
        router.push("/quiz");
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background */}
      <HeroBackground />
      
      {/* Gradient overlay for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 pointer-events-none"></div>
      
      <Header />
      
      <main className="container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col items-center justify-center max-w-3xl mx-auto"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 mb-6 text-center"
          >
            Upload Your Study Material
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg text-gray-300 mb-10 text-center"
          >
            Upload a PDF file containing your study material. Our AI will generate a quiz based on the content.
          </motion.p>
          
          <MotionCard
            variants={itemVariants}
            className="w-full bg-gray-900/90 border border-purple-600/30 backdrop-blur-sm"
          >
            <CardHeader>
              <CardTitle className="text-2xl text-center text-white">PDF Upload</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Upload a PDF file (max 10MB)
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* File upload area */}
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-300 ${file ? "border-green-500 bg-green-500/10" : "border-gray-600 hover:border-blue-500 hover:bg-blue-500/10"
                  }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={48} className="text-green-500" />
                    <p className="text-lg font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={48} className="text-gray-400" />
                    <p className="text-lg font-medium text-white">
                      Drag & drop your PDF file here
                    </p>
                    <p className="text-sm text-gray-400">
                      or click to browse your files
                    </p>
                  </div>
                )}
              </div>
              
              {/* Status alerts */}
              {uploadStatus === "success" && (
                <Alert className="mt-4 bg-green-500/20 border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Success!</AlertTitle>
                  <AlertDescription className="text-green-400">
                    Your file has been uploaded successfully. Redirecting to quiz page...
                  </AlertDescription>
                </Alert>
              )}
              
              {uploadStatus === "error" && (
                <Alert className="mt-4 bg-red-500/20 border-red-500">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-500">Error</AlertTitle>
                  <AlertDescription className="text-red-400">
                    {errorMessage || "An error occurred during upload. Please try again."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-center">
              <MotionButton
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`px-8 py-6 bg-gradient-to-r from-green-400 to-blue-500 text-black font-bold rounded-lg shadow-lg transition-all duration-300 ${!file || isUploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload and Generate Quiz"
                )}
              </MotionButton>
            </CardFooter>
          </MotionCard>
          
          <motion.div
            variants={itemVariants}
            className="mt-8 text-center text-gray-400"
          >
            <p>
              After uploading, our AI will analyze your study material and generate a quiz based on the content.
              You'll be redirected to the quiz page once processing is complete.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
