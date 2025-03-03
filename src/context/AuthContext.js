'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Context for authentication
const AuthContext = createContext();

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth().
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        setLoading(true);
        console.log('Checking auth status...');
        
        // Coba fetch data user dari API
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          credentials: 'include', // Include cookies
          cache: 'no-store'
        });

        // Jika response OK, user terautentikasi
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            console.log('User authenticated:', data.user.email);
            setUser(data.user);
            
            // Simpan di sessionStorage untuk fallback
            try {
              sessionStorage.setItem('user', JSON.stringify(data.user));
            } catch (e) {
              console.warn('Failed to store user in sessionStorage', e);
            }
          } else {
            console.log('Auth verification failed:', data.message || 'Unknown error');
            // Reset user jika verificasi gagal
            setUser(null);
            sessionStorage.removeItem('user');
          }
        } else {
          console.log('Auth API returned error:', response.status);
          // Reset user jika endpoint mengembalikan error
          setUser(null);
          
          // Coba ambil dari sessionStorage sebagai fallback
          const storedUser = sessionStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('Using stored user data as fallback');
              setUser(parsedUser);
            } catch (e) {
              console.warn('Failed to parse user from sessionStorage');
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
        
        // Fallback untuk offline mode atau ketika API tidak tersedia
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.warn('Failed to parse stored user data');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Registering new user:', userData.email);
      
      const response = await axios.post('/api/auth/register', userData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      const data = response.data;

      // Handle successful registration
      if (data.success && data.user) {
        console.log('Registration successful for:', data.user.email);
        
        // MongoDB membuat _id, pastikan format user data konsisten
        const userData = {
          id: data.user.id, // Sudah dalam format string dari MongoDB ObjectId
          name: data.user.name,
          email: data.user.email,
          // tambahkan field lain jika diperlukan
        };
        
        setUser(userData);
        
        // Simpan di sessionStorage
        try {
          sessionStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          console.warn('Failed to store user in sessionStorage', e);
        }
        
        return { success: true, user: userData };
      } else {
        // Handle registration errors
        const errorMessage = data.message || 'Pendaftaran gagal';
        console.error('Registration failed:', errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Terjadi kesalahan saat mendaftar';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Logging in user:', email);
      
      const response = await axios.post('/api/auth/login', 
        { email, password, remember },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );

      const data = response.data;

      // Handle successful login
      if (data.success && data.user) {
        console.log('Login successful for:', data.user.email);
        
        // MongoDB membuat _id, pastikan format user data konsisten
        const userData = {
          id: data.user.id, // Sudah dalam format string dari MongoDB ObjectId
          name: data.user.name,
          email: data.user.email,
          // tambahkan field lain jika diperlukan
        };
        
        setUser(userData);
        
        // Simpan di sessionStorage untuk fallback
        try {
          sessionStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          console.warn('Failed to store user in sessionStorage', e);
        }
        
        return { success: true, user: userData };
      } else {
        // Handle login errors
        const errorMessage = data.message || 'Login gagal';
        console.error('Login failed:', errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Terjadi kesalahan saat login';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      console.log('Logging out user');
      
      // Bersihkan data user
      setUser(null);
      
      // Hapus dari sessionStorage
      sessionStorage.removeItem('user');
      
      // Hapus cookies (client-side)
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'user-logged-in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect ke login
      router.push('/login');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Refresh auth state - berguna untuk update setelah perubahan profil
  const refreshAuth = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log('Auth refresh successful');
          setUser(data.user);
          
          // Update sessionStorage
          sessionStorage.setItem('user', JSON.stringify(data.user));
          return { success: true, user: data.user };
        }
      }
      
      // Jika gagal, tetap gunakan data user yang ada
      return { success: false };
    } catch (error) {
      console.error('Auth refresh error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // User getter dengan fallback ke sessionStorage
  const getUser = () => {
    if (user) return user;
    
    // Jika user tidak ada di state, coba ambil dari sessionStorage
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Update state juga
        setUser(parsedUser);
        return parsedUser;
      }
    } catch (e) {
      console.warn('Failed to get user from sessionStorage');
    }
    
    return null;
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // The value that will be supplied to any consuming components
  const contextValue = {
    user: getUser(),
    loading,
    error,
    login,
    logout,
    register,
    refreshAuth,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook that shorthands the context
export function useAuth() {
  return useContext(AuthContext);
}