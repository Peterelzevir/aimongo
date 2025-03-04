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
  () => import('@/components/chat/ChatInterface').catch(err => {
    console.error("Failed to load ChatInterface:", err);
    return () => null; // Return empty component on error
  }),
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
  
  // Tambahkan flag untuk debugging
  const [errorDetails, setErrorDetails] = useState(null);
  
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
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Set loading timeout and retry logic
  useEffect(() => {
    if (isAuthenticated && !chatInterfaceReady && !loadingTimedOut) {
      console.log('Setting up loading timeout');
      // Tambahkan waktu timeout lebih lama (15 detik)
      const timeoutId = setTimeout(() => {
        console.log('Loading timed out after 15 seconds');
        setLoadingTimedOut(true);
        setShowRetryButton(true);
      }, 15000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, chatInterfaceReady, loadingTimedOut]);

  // Check authentication status when component mounts or auth state changes
  useEffect(() => {
    if (!loading) {
      console.log('Auth state checked:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
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
    console.log('Chat interface is ready');
    setChatInterfaceReady(true);
    setLoadingTimedOut(false);
    setShowRetryButton(false);
    setErrorDetails(null);
  }, []);

  // Function to handle chat interface error
  const handleChatInterfaceError = useCallback((error) => {
    console.error('Chat interface failed to load correctly:', error);
    setErrorDetails(error?.message || 'Terjadi error saat memuat interface');
    setChatInterfaceReady(false);
    setLoadingTimedOut(true);
    setShowRetryButton(true);
  }, []);

  // Function to retry loading chat interface
  const handleRetryLoading = useCallback(() => {
    console.log('Retrying chat interface load');
    setChatInterfaceReady(false);
    setLoadingTimedOut(false);
    setShowRetryButton(false);
    setErrorDetails(null);
    setLoadAttempts(prev => prev + 1);
  }, []);

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
          
          {errorDetails && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-md mb-4 text-sm">
              {errorDetails}
            </div>
          )}
          
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
        <div className="w-full h-full" key={`chat-wrapper-${loadAttempts}`}>
          <ChatInterface 
            onReady={handleChatInterfaceReady} 
            onError={handleChatInterfaceError}
          />
        </div>
      ) : (
        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/80 backdrop-blur-sm"
            >
              {/* Warning dialog content */}
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-primary-800/90 backdrop-blur-md border border-primary-700/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                {/* ... Modal content ... */}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </ErrorBoundary>
  );
}
