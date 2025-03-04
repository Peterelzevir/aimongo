'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiAlertTriangle, FiUser, FiX, FiArrowLeft, FiShield, FiInfo, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

// Import ChatInterface component with dynamic loading to prevent SSR issues
const ChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-primary-900 to-primary-800">
        <div className="text-center p-8 bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-lg">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-3 border-transparent border-t-accent-light border-b-accent-light rounded-full animate-spin"></div>
            <div className="absolute inset-3 bg-primary-600 rounded-full flex items-center justify-center overflow-hidden">
              <Image
                src="/images/avatar.svg"
                alt="AI Peter"
                width={32}
                height={32}
                className="scale-125"
              />
            </div>
          </div>
          <h3 className="text-primary-50 text-lg font-medium mb-2">Mempersiapkan Chat</h3>
          <p className="text-primary-300 text-sm mb-4">Memuat antarmuka chat...</p>
          <div className="h-2 bg-primary-700 rounded-full overflow-hidden relative">
            <motion.div 
              className="h-full bg-accent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "linear"
              }}
            />
          </div>
        </div>
      </div>
    )
  }
);

// Error boundary component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Add global error handler
    const errorHandler = (event) => {
      console.error('Caught client error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  const handleReset = () => {
    setHasError(false);
    router.refresh();
  };

  if (hasError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary-900 to-primary-800 p-4">
        <div className="bg-primary-800/90 backdrop-blur-md border border-primary-700/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-accent to-red-500"></div>
          
          <div className="p-6 pb-4 border-b border-primary-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-red-500 mr-4">
                <FiAlertTriangle size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary-50">Terjadi Kesalahan</h3>
                <p className="text-primary-300 text-sm">
                  Aplikasi mengalami masalah saat memuat
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="bg-primary-700/40 border border-primary-600/50 rounded-lg p-4 mb-6">
              <div className="flex">
                <FiInfo className="text-primary-300 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-primary-200 text-sm">
                  Terjadi kesalahan saat memuat antarmuka chat. Hal ini mungkin disebabkan oleh masalah koneksi atau kesalahan pada server.
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="w-full py-3 flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition-all shadow-md shadow-accent/20"
            >
              <FiRefreshCw size={18} />
              Coba Lagi
            </motion.button>
            
            <div className="mt-5 text-center">
              <motion.button
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="text-primary-400 hover:text-primary-200 text-sm flex items-center justify-center mx-auto gap-1.5 group"
              >
                <FiArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Kembali ke beranda
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default function ChatPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  // Track chat component loading state
  const [chatInterfaceReady, setChatInterfaceReady] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Handle window size safely in client-side
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    
    // Set initial size
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set loading timeout and retry logic
  useEffect(() => {
    if (isAuthenticated && !chatInterfaceReady && !loadingTimedOut) {
      // Initial timeout (8 seconds)
      const timeoutId = setTimeout(() => {
        setLoadingTimedOut(true);
        setShowRetryButton(true);
      }, 8000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, chatInterfaceReady, loadingTimedOut, loadAttempts]);

  // Check authentication status when component mounts or auth state changes
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setShowWarning(true);
        setChatInterfaceReady(false);
      } else {
        // If authenticated, reset warning and prepare for loading
        setShowWarning(false);
        // Keep current loading state
      }
    }
  }, [loading, isAuthenticated]);

  // Function to handle when chat interface is ready
  const handleChatInterfaceReady = useCallback(() => {
    setChatInterfaceReady(true);
    setLoadingTimedOut(false);
    setShowRetryButton(false);
  }, []);

  // Function to handle chat interface error
  const handleChatInterfaceError = useCallback(() => {
    setChatInterfaceReady(false);
    setLoadingTimedOut(true);
    setShowRetryButton(true);
  }, []);

  // Function to retry loading chat interface
  const handleRetryLoading = useCallback(() => {
    setChatInterfaceReady(false);
    setLoadingTimedOut(false);
    setShowRetryButton(false);
    setLoadAttempts(prev => prev + 1);
    
    // Force a re-render of the chat interface
    const timeoutId = setTimeout(() => {
      // This will force a re-load of the ChatInterface component
      router.refresh();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  // Countdown effect when warning is shown
  useEffect(() => {
    if (showWarning && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showWarning && countdown === 0) {
      router.push('/login');
    }
  }, [countdown, router, showWarning]);

  // Loading state with animated spinner
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary-900 to-primary-800">
        <div className="text-center p-8 bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-lg">
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-accent border-b-accent rounded-full animate-spin"></div>
            
            {/* Inner pulsing circle */}
            <div className="absolute inset-4 bg-primary-600 rounded-full flex items-center justify-center animate-pulse">
              <FiShield className="text-accent h-8 w-8" />
            </div>
          </div>
          
          <h3 className="text-primary-50 text-xl font-medium mb-2">Memeriksa Autentikasi</h3>
          <p className="text-primary-300 text-sm mb-4">Sedang memverifikasi status login Anda...</p>
          
          {/* Loading shimmer bar */}
          <div className="h-2 bg-primary-700 rounded-full overflow-hidden relative">
            <motion.div 
              className="h-full bg-accent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "linear"
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // If authenticated but chat interface is loading, show a specific loading state
  if (isAuthenticated && !chatInterfaceReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-primary-900 to-primary-800">
        <div className="text-center p-8 bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-lg">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-3 border-transparent border-t-accent-light border-b-accent-light rounded-full animate-spin"></div>
            
            {/* Inner image */}
            <div className="absolute inset-3 bg-primary-600 rounded-full flex items-center justify-center overflow-hidden">
              <Image
                src="/images/avatar.svg"
                alt="AI Peter"
                width={32}
                height={32}
                className="scale-125"
              />
            </div>
          </div>
          
          <h3 className="text-primary-50 text-lg font-medium mb-2">Mempersiapkan Chat</h3>
          <p className="text-primary-300 text-sm mb-4">
            {loadingTimedOut ? 'Waktu muat lebih lama dari biasanya...' : 'Memuat antarmuka chat...'}
          </p>
          
          {!showRetryButton ? (
            <div className="h-2 bg-primary-700 rounded-full overflow-hidden relative">
              <motion.div 
                className="h-full bg-accent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear"
                }}
              />
            </div>
          ) : (
            <button
              onClick={handleRetryLoading}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors flex items-center justify-center mx-auto"
            >
              <FiRefreshCw className="mr-2" />
              Muat Ulang
            </button>
          )}
        </div>
        
        {/* Version info at bottom */}
        <div className="text-primary-400 text-xs mt-4">
          MongoDB Atlas · v1.0.0
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {isAuthenticated ? (
        <Suspense fallback={
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-primary-900 to-primary-800">
            <div className="text-center p-8 bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-lg">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-3 border-transparent border-t-accent-light border-b-accent-light rounded-full animate-spin"></div>
                <div className="absolute inset-3 bg-primary-600 rounded-full flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/avatar.svg"
                    alt="AI Peter"
                    width={32}
                    height={32}
                    className="scale-125"
                  />
                </div>
              </div>
              <h3 className="text-primary-50 text-lg font-medium mb-2">Mempersiapkan Chat</h3>
              <p className="text-primary-300 text-sm mb-4">Memuat antarmuka chat...</p>
              <div className="h-2 bg-primary-700 rounded-full overflow-hidden relative">
                <motion.div 
                  className="h-full bg-accent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear"
                  }}
                />
              </div>
            </div>
          </div>
        }>
          <ChatInterface 
            key={`chat-interface-${loadAttempts}`} 
            onReady={handleChatInterfaceReady} 
            onError={handleChatInterfaceError}
          />
        </Suspense>
      ) : (
        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/80 backdrop-blur-sm"
            >
              {/* Particles animation background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {windowSize.width > 0 && [...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: Math.random() * windowSize.width, 
                      y: Math.random() * windowSize.height,
                      opacity: 0 
                    }}
                    animate={{ 
                      y: [Math.random() * windowSize.height, Math.random() * windowSize.height],
                      opacity: [0, 0.4, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4 + Math.random() * 6,
                      delay: Math.random() * 2
                    }}
                    className="absolute w-2 h-2 rounded-full bg-accent/40"
                  />
                ))}
              </div>
              
              {/* Modal content */}
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-primary-800/90 backdrop-blur-md border border-primary-700/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                {/* Top border with animation */}
                <motion.div 
                  className="h-1.5 bg-gradient-to-r from-red-500 via-accent to-red-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Warning header */}
                <div className="p-6 pb-4 border-b border-primary-700/50">
                  <div className="flex items-center">
                    {/* Animated icon */}
                    <motion.div 
                      initial={{ rotate: -10, scale: 0.9 }}
                      animate={{ 
                        rotate: [0, -5, 0, 5, 0],
                        scale: [0.9, 1.1, 0.9, 1.1, 0.9]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 3
                      }}
                      className="flex-shrink-0 text-red-500 mr-4"
                    >
                      <FiAlertTriangle size={36} />
                    </motion.div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-primary-50">Area Terproteksi</h3>
                      <p className="text-primary-300 text-sm">
                        Verifikasi identitas diperlukan untuk melanjutkan
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Warning message */}
                <div className="p-6">
                  <div className="bg-primary-700/40 border border-primary-600/50 rounded-lg p-4 mb-6">
                    <div className="flex">
                      <FiInfo className="text-primary-300 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-primary-200 text-sm">
                        Anda harus login terlebih dahulu untuk mengakses fitur chat AI Peter. 
                        Fitur ini hanya tersedia untuk pengguna terdaftar.
                      </p>
                    </div>
                  </div>
                  
                  {/* Countdown timer */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-primary-400 mb-1.5">
                      <span>Mengalihkan ke halaman login...</span>
                      <span>{countdown} detik</span>
                    </div>
                    <div className="relative h-2 bg-primary-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: `${(countdown / 5) * 100}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                        className="absolute h-full bg-accent"
                      />
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/login" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3 flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition-all shadow-md shadow-accent/20"
                      >
                        <FiUser size={18} />
                        Login Sekarang
                      </motion.button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3 flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 text-primary-50 rounded-lg font-medium transition-all shadow-md shadow-primary-900/20"
                      >
                        <FiLock size={18} />
                        Buat Akun
                      </motion.button>
                    </Link>
                  </div>
                  
                  {/* Go back option */}
                  <div className="mt-5 text-center">
                    <motion.button
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/')}
                      className="text-primary-400 hover:text-primary-200 text-sm flex items-center justify-center mx-auto gap-1.5 group"
                    >
                      <FiArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                      Kembali ke beranda
                    </motion.button>
                  </div>
                </div>
                
                {/* Database badge - MongoDB */}
                <div className="px-6 pb-4">
                  <div className="flex justify-center items-center bg-green-900/20 rounded-md py-2 border border-green-800/30">
                    <div className="bg-green-500/20 p-1 rounded-md mr-2">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#4CAF50"/>
                        <path d="M12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11ZM12 9C11.45 9 11 9.45 11 10C11 10.55 11.45 11 12 11C12.55 11 13 10.55 13 10C13 9.45 12.55 9 12 9Z" fill="#4CAF50"/>
                        <path d="M12 19.2C14.5 19.2 16.5 17.2 16.5 14.7V12.5C16.5 12.2 16.3 12 16 12H8C7.7 12 7.5 12.2 7.5 12.5V14.7C7.5 17.2 9.5 19.2 12 19.2ZM9 13.5H15V14.7C15 16.4 13.7 17.7 12 17.7C10.3 17.7 9 16.4 9 14.7V13.5Z" fill="#4CAF50"/>
                      </svg>
                    </div>
                    <span className="text-xs text-green-500">Powered by MongoDB Atlas</span>
                  </div>
                </div>
                
                {/* Wave decoration at bottom */}
                <div className="h-10 bg-primary-700/20 relative overflow-hidden">
                  <motion.div
                    initial={{ backgroundPositionX: '0px' }}
                    animate={{ backgroundPositionX: '200px' }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z' opacity='.25' fill='%233b82f6'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundSize: '1200px 100%'
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </ErrorBoundary>
  );
}
