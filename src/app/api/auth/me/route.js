// src/app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { getUserById, getUserByEmail, updateUser } from '@/lib/db';

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS, PUT',
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
 * Extract token from various sources
 * @param {Request} request - Next.js request object
 * @returns {string|null} The token or null if not found
 */
function getAuthToken(request) {
  // 1. Try to get token from cookie first
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('auth-token')?.value;
  
  if (tokenCookie) {
    console.log('Token found in cookie');
    return tokenCookie;
  }
  
  // 2. Try to get token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Token found in Authorization header');
    return authHeader.substring(7);
  }
  
  // 3. Try to get token from query parameter (useful for WebSocket connections)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    console.log('Token found in URL parameter');
    return tokenParam;
  }
  
  console.log('No token found in request');
  return null;
}

/**
 * Verify JWT token and return payload if valid
 * @param {string} token - JWT token to verify
 * @returns {Object} Result object with success status and payload or error
 */
async function verifyToken(token) {
  try {
    console.log('Verifying JWT token');
    const { payload } = await jwtVerify(
      token, 
      getSecretKey(),
      {
        algorithms: ['HS256']
      }
    );
    console.log('Token verified successfully');
    return { success: true, payload };
  } catch (verifyError) {
    console.error('Token verification failed:', verifyError.message);
    
    // More specific error message based on error type
    let errorMessage = 'Token tidak valid';
    let errorCode = 'token_invalid';
    
    if (verifyError.code === 'ERR_JWT_EXPIRED') {
      errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      errorCode = 'token_expired';
    } else if (verifyError.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      errorMessage = 'Token tidak valid. Silakan login kembali.';
      errorCode = 'token_invalid';
    }
    
    return { 
      success: false, 
      message: errorMessage, 
      code: errorCode 
    };
  }
}

/**
 * Helper function to refresh token
 * @param {Object} user - User data
 * @returns {Promise<string>} New JWT token
 */
async function refreshToken(user) {
  // Convert MongoDB ObjectId to string if needed
  const userId = user._id.toString ? user._id.toString() : user._id;
  
  return new SignJWT({ 
    id: userId,
    email: user.email,
    name: user.name,
    ...(user.role && { role: user.role }),
    // Add timestamp for additional security
    iat: Math.floor(Date.now() / 1000)
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

/**
 * GET handler - Get current user info
 */
export async function GET(request) {
  try {
    // Track request for debugging
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`User verification request from IP: ${clientIp}`);
    
    // Get token from either cookie, header, or query param
    const token = getAuthToken(request);
    
    if (!token) {
      console.log('No authentication token found');
      return NextResponse.json(
        { success: false, message: 'Tidak terautentikasi', code: 'no_token' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="api"',
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...corsHeaders
          }
        }
      );
    }
    
    // Verify token with jose
    const verifyResult = await verifyToken(token);
    if (!verifyResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: verifyResult.message, 
          code: verifyResult.code
        },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...corsHeaders
          }
        }
      );
    }
    
    const payload = verifyResult.payload;
    
    // Get user data from database with error handling
    let user;
    try {
      console.log('Getting user data for ID:', payload.id);
      
      // Try to get user by ID
      user = await getUserById(payload.id);
      
      // If failed, try to get by email as fallback
      if (!user && payload.email) {
        console.log('User not found by ID, trying by email:', payload.email);
        user = await getUserByEmail(payload.email);
      }
      
      console.log('User data retrieved:', user ? 'Success' : 'Not found');
    } catch (dbError) {
      console.error('Database error when fetching user:', dbError);
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil data pengguna', code: 'database_error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    if (!user) {
      console.log('User not found for ID:', payload.id);
      return NextResponse.json(
        { success: false, message: 'User tidak ditemukan', code: 'user_not_found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Check if account is disabled
    if (user.status === 'disabled' || user.status === 'suspended') {
      console.log('Account is disabled/suspended:', user._id);
      return NextResponse.json(
        { success: false, message: 'Akun tidak aktif', code: 'account_inactive' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Check if token needs refresh (if it's set to expire within 15 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const needsRefresh = payload.exp && currentTime >= (payload.exp - 15 * 60);
    
    let refreshedToken = null;
    
    // Create new token if refresh is needed
    if (needsRefresh) {
      try {
        console.log('Refreshing token for user:', user._id);
        refreshedToken = await refreshToken(user);
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        // Continue without refreshed token
      }
    }
    
    // Update last active timestamp
    try {
      await updateUser(user._id, { lastActiveAt: new Date() });
    } catch (updateError) {
      console.warn('Could not update lastActiveAt timestamp:', updateError);
      // Non-critical error, continue
    }
    
    console.log('Creating successful response for user:', user._id);
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString ? user._id.toString() : user._id,
        name: user.name,
        email: user.email,
        status: user.status || 'active',
        // Add any other non-sensitive user data here that frontend needs
        ...(user.lastLoginAt && { lastLogin: user.lastLoginAt }),
        ...(user.lastActiveAt && { lastActive: user.lastActiveAt }),
        ...(user.avatar && { avatar: user.avatar }),
        ...(user.role && { role: user.role }),
        ...(user.preferences && { preferences: user.preferences }),
        ...(user.settings && { settings: user.settings }),
        createdAt: user.createdAt || null,
      },
      tokenRefreshed: !!refreshedToken
    }, { headers: corsHeaders });
    
    // If token was refreshed, update the cookie
    if (refreshedToken) {
      console.log('Setting refreshed token in cookie');
      response.cookies.set({
        name: 'auth-token',
        value: refreshedToken,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Also include the new token in the response for API clients
      response._json.token = refreshedToken;
    }
    
    // Add security headers
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    // Make sure CORS headers are preserved
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    console.log('Auth verification successful for user:', user._id);
    return response;
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan saat verifikasi', 
        code: 'server_error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT handler - Update current user info
 */
export async function PUT(request) {
  try {
    // Track request for debugging
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`User update request from IP: ${clientIp}`);
    
    // Get token from either cookie, header, or query param
    const token = getAuthToken(request);
    
    if (!token) {
      console.log('No authentication token found');
      return NextResponse.json(
        { success: false, message: 'Tidak terautentikasi', code: 'no_token' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="api"',
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...corsHeaders
          }
        }
      );
    }
    
    // Verify token with jose
    const verifyResult = await verifyToken(token);
    if (!verifyResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: verifyResult.message, 
          code: verifyResult.code
        },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...corsHeaders
          }
        }
      );
    }
    
    const payload = verifyResult.payload;
    
    // Get user data to verify existence
    let user;
    try {
      console.log('Getting user data for ID:', payload.id);
      user = await getUserById(payload.id);
      
      if (!user && payload.email) {
        console.log('User not found by ID, trying by email:', payload.email);
        user = await getUserByEmail(payload.email);
      }
      
      if (!user) {
        console.log('User not found for update operation');
        return NextResponse.json(
          { success: false, message: 'User tidak ditemukan', code: 'user_not_found' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      if (user.status === 'disabled' || user.status === 'suspended') {
        console.log('Account is disabled/suspended:', user._id);
        return NextResponse.json(
          { success: false, message: 'Akun tidak aktif', code: 'account_inactive' },
          { status: 403, headers: corsHeaders }
        );
      }
    } catch (dbError) {
      console.error('Database error when fetching user:', dbError);
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil data pengguna', code: 'database_error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Parse user update data
    let updateData;
    try {
      updateData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Format data tidak valid', code: 'invalid_data' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate update data
    const allowedFields = ['name', 'avatar', 'preferences', 'settings', 'currentPassword', 'newPassword'];
    const updateFields = {};
    
    // Extract allowed fields only
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updateData[key];
      }
    });
    
    // Handle password change if requested
    if (updateData.currentPassword && updateData.newPassword) {
      // Handle password change in a separate function if needed
      // This would typically involve verifying the current password
      // and then updating to the new password
      
      // For now, we'll skip password changes - this would be implemented based on your authentication system
      delete updateFields.currentPassword;
      delete updateFields.newPassword;
      
      // Note: Add your password change logic here
      console.log('Password change requested but not implemented in this route');
    }
    
    // Ensure we have something to update
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada data yang diubah', code: 'no_changes' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Update user in database
    let updatedUser;
    try {
      updatedUser = await updateUser(user._id, updateFields);
      console.log('User updated successfully:', user._id);
    } catch (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Gagal mengupdate data pengguna: ' + updateError.message, 
          code: 'update_error' 
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Generate fresh token to reflect updated user data
    let newToken;
    try {
      newToken = await refreshToken(updatedUser);
    } catch (tokenError) {
      console.error('Error generating fresh token:', tokenError);
      // Non-critical error, continue without new token
    }
    
    // Create response with updated user data
    const response = NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui',
      user: {
        id: updatedUser._id.toString ? updatedUser._id.toString() : updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status || 'active',
        ...(updatedUser.lastLoginAt && { lastLogin: updatedUser.lastLoginAt }),
        ...(updatedUser.lastActiveAt && { lastActive: updatedUser.lastActiveAt }),
        ...(updatedUser.avatar && { avatar: updatedUser.avatar }),
        ...(updatedUser.role && { role: updatedUser.role }),
        ...(updatedUser.preferences && { preferences: updatedUser.preferences }),
        ...(updatedUser.settings && { settings: updatedUser.settings }),
        updatedAt: updatedUser.updatedAt || new Date(),
      }
    }, { headers: corsHeaders });
    
    // If we generated a new token, set it in cookie
    if (newToken) {
      response.cookies.set({
        name: 'auth-token',
        value: newToken,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Also include the new token in the response for API clients
      response._json.token = newToken;
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
    console.error('User update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan saat memperbarui data', 
        code: 'server_error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
