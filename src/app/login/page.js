'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiArrowLeft, FiUser, FiCheck, FiX
} from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const router = useRouter();
  const { login, isAuthenticated } = useAuth() || { login: null, isAuthenticated: () => false };

  // Redirect jika sudah login
  useEffect(() => {
    // Guard clause untuk menghindari error
    if (typeof isAuthenticated !== 'function') return;
    
    try {
      if (isAuthenticated()) {
        router.push('/chat');
      }
    } catch (err) {
      console.error('Error checking authentication:', err);
    }
  }, [router]); // Menghapus isAuthenticated dari dependency untuk mencegah loop

  // Particles animation
  const totalParticles = 30;
  const particles = Array.from({ length: totalParticles }).map((_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10
  }));

  // Direct API login function that matches the API route implementation
  const loginWithAPI = async (credentials) => {
    try {
      console.log('Attempting API login for email:', credentials.email);
      
      // Validasi kredensial sebelum mengirim request
      if (!credentials?.email || !credentials?.password) {
        console.error('Missing required fields');
        return { 
          success: false, 
          error: 'Email dan password diperlukan' 
        };
      }

      // Menyiapkan body request dengan format yang konsisten
      const requestBody = {
        email: credentials.email.trim().toLowerCase(), // Normalisasi email
        password: credentials.password,
        remember: !!credentials.remember // Pastikan boolean
      };

      // Melakukan request dengan header yang jelas
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // Identifikasi AJAX request
          'Cache-Control': 'no-cache, no-store' // Hindari caching untuk request auth
        },
        body: JSON.stringify(requestBody),
        credentials: 'include', // Pastikan cookie disertakan
        cache: 'no-store' // Hindari caching
      });
      
      // Ambil response JSON
      let data;
      try {
        data = await response.json();
        console.log('API response received:', { 
          status: response.status, 
          success: data.success,
          message: data.message
        });
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { 
          success: false, 
          error: 'Format response tidak valid' 
        };
      }
      
      // Periksa apakah request berhasil berdasarkan status HTTP DAN success flag
      if (!response.ok || data.success === false) {
        const errorMessage = data?.message || 
          data?.error || 
          `Error ${response.status}: ${response.statusText}`;
        
        // Log lebih detail untuk debug
        console.error('Login failed:', { 
          status: response.status, 
          message: errorMessage,
          details: data?.details || 'No additional details'
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Jika berhasil dan ingin mengingat user, simpan token
      if (requestBody.remember && data.token) {
        try {
          localStorage.setItem('authToken', data.token);
          sessionStorage.setItem('userLoggedIn', 'true'); // Flag tambahan di session storage
        } catch (storageError) {
          console.warn('Failed to store token in localStorage', storageError);
          // Lanjutkan meskipun gagal menyimpan
        }
      }
      
      // Simpan data user di sessionStorage agar bisa diakses di seluruh aplikasi
      if (data.user) {
        try {
          sessionStorage.setItem('user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            // Jangan menyimpan data sensitif di sini
          }));
        } catch (storageError) {
          console.warn('Failed to store user data in sessionStorage', storageError);
          // Lanjutkan meskipun gagal menyimpan
        }
      }
      
      console.log('Login API success, returning data');
      return { 
        success: true, 
        data,
        user: data.user,
        token: data.token // Kembalikan token jika diperlukan di client
      };
    } catch (error) {
      console.error('Login API error:', error);
      
      // Beri pesan error yang lebih spesifik berdasarkan jenis kesalahan
      let errorMessage = 'Terjadi kesalahan pada server';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Email atau password salah';
      } else if (error.message.includes('429') || error.message.includes('too many')) {
        errorMessage = 'Terlalu banyak percobaan login. Silakan coba lagi nanti.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Format permintaan tidak valid. Pastikan data yang dimasukkan benar.';
      }
      
      return { 
        success: false, 
        error: error.message || errorMessage,
        details: error.details || null
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('Login form submitted', { email, passwordLength: password.length });
    
    // Basic validation
    if (!email || !password) {
      setError('Mohon lengkapi semua kolom');
      return;
    }
    
    // Simple email validation with improved regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Alamat email tidak valid');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Prepare credentials with consistent format
      const credentials = {
        email: email.trim().toLowerCase(),
        password,
        remember: rememberMe
      };
      
      // First try to use the login method from AuthContext if available
      let result;
      
      if (typeof login === 'function') {
        try {
          console.log('Attempting login via AuthContext');
          // Pass the rememberMe flag to the context login if it supports it
          const contextLoginResult = await login(credentials.email, credentials.password, credentials.remember);
          
          console.log('Context login result:', contextLoginResult);
          
          // Cek hasil dengan lebih detail - JANGAN HANYA KONVERSI KE BOOLEAN
          if (typeof contextLoginResult === 'object') {
            if (contextLoginResult.success === true) {
              // Format yang cocok dengan API (success flag)
              result = contextLoginResult;
            } else if (contextLoginResult.success === false) {
              // Gagal dengan pesan
              result = {
                success: false,
                error: contextLoginResult.message || contextLoginResult.error || 'Login gagal'
              };
            } else {
              // Objek tanpa flag success yang jelas, tidak dapat dipercaya
              console.warn('Context login result missing success flag, using direct API');
              result = await loginWithAPI(credentials);
            }
          } else if (contextLoginResult === true) {
            // Result adalah boolean true
            result = { success: true };
          } else if (contextLoginResult === false) {
            // Result adalah boolean false
            result = { success: false, error: 'Email atau password salah' };
          } else {
            // Hasil tidak jelas, gunakan API langsung
            console.warn('Context login result format unknown, using direct API');
            result = await loginWithAPI(credentials);
          }
        } catch (contextError) {
          console.warn('Context login failed, using direct API', contextError);
          // If context login fails, use direct API call as fallback
          result = await loginWithAPI(credentials);
        }
      } else {
        // If login is not available in context, use direct API call
        console.log('No login method in context, using direct API');
        result = await loginWithAPI(credentials);
      }
      
      console.log('Final login result:', { success: result.success, error: result.error });
      
      if (result.success !== true) {
        setError(result.error || 'Email atau password salah');
        setIsLoading(false);
        return;
      }
      
      // Show success animation
      setLoginSuccess(true);
      
      // Log successful login event (optional)
      console.log('Login successful', { email: credentials.email, timestamp: new Date().toISOString() });
      
      // Redirect after success animation
      setTimeout(() => {
        router.push('/chat');
      }, 1800);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-primary-900 relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Menghapus class bg-grid-pattern yang mungkin tidak didefinisikan */}
        <div className="absolute inset-0 opacity-5"></div>
        
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-accent/20"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -500, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              repeatType: "loop",
              ease: "linear",
              delay: Math.random() * 20
            }}
          />
        ))}
      </div>

      {/* Left Panel - Decorative for larger screens */}
      <div className="hidden md:flex md:w-2/5 bg-primary-800/40 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-10"
          >
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-full bg-accent/20 blur-xl"></div>
              {/* Image component dengan penanganan error */}
              <div className="relative z-10 w-[100px] h-[100px] flex items-center justify-center">
                <Image 
                  src="/images/logo.svg" 
                  alt="AI Peter Logo"
                  width={100}
                  height={100}
                  onError={(e) => {
                    // Fallback jika gambar gagal dimuat
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%234B5563'/%3E%3Ctext x='50%' y='50%' font-size='20' text-anchor='middle' fill='white' dominant-baseline='middle'%3ELogo%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="mt-6 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-50 to-accent"
            >
              AI Peter
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="mt-2 text-primary-300 text-center max-w-xs"
            >
              Asisten AI super modern yang dapat membantu tugas-tugas Anda dengan cerdas dan efisien
            </motion.p>
            
            <div className="mt-10 space-y-6 w-full max-w-xs">
              {/* Feature bullets */}
              {[
                "Respon cepat dan akurat",
                "UI/UX super modern dan dinamis",
                "Bantuan 24/7 untuk semua kebutuhan",
                "Kemampuan memahami konteks percakapan"
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.1 + (i * 0.2), duration: 0.5 }}
                  className="flex items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                    <FiCheck className="text-accent" />
                  </div>
                  <p className="text-primary-200">{feature}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Decorative elements */}
          <motion.div 
            className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-accent/5 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.7, 0.5] 
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
        {/* Back to home link */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-6 left-6"
        >
          <Link href="/" className="flex items-center text-primary-300 hover:text-primary-200 gap-1 transition-colors">
            <FiArrowLeft size={16} />
            <span>Kembali ke beranda</span>
          </Link>
        </motion.div>
        
        <div className="w-full max-w-md">
          {/* Login success animation */}
          <AnimatePresence>
            {loginSuccess ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="mb-10 flex flex-col items-center"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, times: [0, 0.7, 1] }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
                >
                  <FiCheck className="text-green-500" size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold text-primary-50 mb-2">Login Berhasil!</h2>
                <p className="text-primary-300 text-center">Mengalihkan ke halaman chat...</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Login header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-primary-50 mb-2">Login</h1>
                  <p className="text-primary-300">
                    Masuk untuk lanjut mengobrol dengan AI Peter
                  </p>
                </div>
                
                {/* Login form */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="bg-primary-800/40 backdrop-blur-sm border border-primary-700/50 rounded-xl p-6 shadow-xl"
                >
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center text-red-300 text-sm"
                    >
                      <FiAlertCircle className="flex-shrink-0 mr-2" size={18} />
                      <span>{error}</span>
                      <button 
                        onClick={() => setError('')}
                        className="ml-auto text-red-300 hover:text-red-200"
                      >
                        <FiX size={16} />
                      </button>
                    </motion.div>
                  )}
                  
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                      {/* Email Field */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-primary-200 mb-1">
                          Alamat Email
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiMail className="text-primary-400" size={18} />
                          </div>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full bg-primary-700/40 border border-primary-600 rounded-lg py-3 pl-10 pr-3 text-primary-100 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Password Field */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label htmlFor="password" className="block text-sm font-medium text-primary-200">
                            Password
                          </label>
                          <a href="#" className="text-xs text-accent hover:text-accent-light transition-colors">
                            Lupa password?
                          </a>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiLock className="text-primary-400" size={18} />
                          </div>
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full bg-primary-700/40 border border-primary-600 rounded-lg py-3 pl-10 pr-10 text-primary-100 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <FiEyeOff className="text-primary-400 hover:text-primary-200" size={18} />
                            ) : (
                              <FiEye className="text-primary-400 hover:text-primary-200" size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Remember Me */}
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-primary-600 text-accent focus:ring-accent/30 bg-primary-700"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-primary-300">
                          Ingat saya
                        </label>
                      </div>
                      
                      {/* Submit Button */}
                      <div className="pt-2">
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-accent hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all
                          ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : 'Login'}
                        </motion.button>
                      </div>
                    </div>
                  </form>
                </motion.div>
                
                {/* Register link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-6 text-center"
                >
                  <p className="text-primary-300">
                    Belum punya akun?{' '}
                    <Link href="/register" className="text-accent hover:text-accent-light font-medium transition-colors">
                      Daftar sekarang
                    </Link>
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
