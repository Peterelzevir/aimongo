// src/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { createUser, checkUserExists } from '@/lib/db';

// Prevent caching for this route
export const dynamic = 'force-dynamic';

// Edge Runtime compatibility
export const runtime = 'nodejs';

// Secret key untuk JWT - gunakan .env di aplikasi nyata
const JWT_SECRET = process.env.JWT_SECRET || 'ai-peter-secret-key-change-this';

// Siapkan secret key dalam format yang diperlukan jose
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handler OPTIONS untuk CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Register a new user
 */
export async function POST(request) {
  try {
    // Track request for debugging
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`User registration request from IP: ${clientIp}`);

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { name, email, password } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Data tidak lengkap. Nama, email, dan password diperlukan.', 
          code: 'invalid_data' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format email tidak valid', 
          code: 'invalid_email' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate password strength (at least 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password harus minimal 8 karakter', 
          code: 'weak_password' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if user already exists
    try {
      const userExists = await checkUserExists(email);
      
      if (userExists) {
        console.log('Registration failed: Email already exists:', email);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Email sudah terdaftar. Silakan gunakan email lain atau login.', 
            code: 'email_exists' 
          },
          { status: 409, headers: corsHeaders }
        );
      }
    } catch (dbError) {
      console.error('Database error when checking existing user:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Terjadi kesalahan saat memeriksa email', 
          code: 'database_error' 
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // No need to hash password here as it's done in createUser
    
    // Create new user
    let newUser;
    try {
      newUser = await createUser({
        name,
        email,
        password,
        // Status and createdAt are handled in the createUser function
      });
      
      console.log('User created successfully:', newUser._id);
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Gagal membuat akun. Silakan coba lagi.', 
          code: 'create_error' 
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Generate JWT token
    let token;
    try {
      // Convert MongoDB ObjectId to string if needed
      const userId = newUser._id.toString ? newUser._id.toString() : newUser._id;
      
      token = await new SignJWT({ 
        id: userId,
        email: newUser.email,
        name: newUser.name,
        iat: Math.floor(Date.now() / 1000)
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getSecretKey());
      
      console.log('JWT token generated for user:', newUser._id);
    } catch (tokenError) {
      console.error('Error generating token:', tokenError);
      // We'll continue without a token
      // User can still login later
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Registrasi berhasil',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email
      },
      ...(token && { token }) // Only include token if generated successfully
    }, { headers: corsHeaders });
    
    // Set auth cookie if token was generated
    if (token) {
      response.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    // Add security headers
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    // Make sure CORS headers are preserved
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan saat registrasi', 
        code: 'server_error' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
