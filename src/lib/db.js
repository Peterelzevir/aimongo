/**
 * User Database Module for Next.js with MongoDB
 * 
 * Provides user management functionality with MongoDB Atlas:
 * - User registration
 * - User authentication
 * - User management
 */

import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * Create a demo user if no users exist in the database
 * For testing purposes only
 */
export async function seedDemoUser() {
  try {
    await connectToDatabase();
    
    // Check if any users exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`Database already contains ${userCount} users, skipping demo user creation`);
      return;
    }
    
    // Create demo user
    const demoUser = new User({
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'password123', // Will be hashed by pre-save hook
      status: 'active'
    });
    
    await demoUser.save();
    console.log('Demo user added successfully');
  } catch (error) {
    console.error('Error seeding demo user:', error);
  }
}

// Run seeding when module is imported (in development)
if (process.env.NODE_ENV !== 'production') {
  seedDemoUser().catch(console.error);
}

/**
 * Check if user exists by email
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if user exists
 */
export async function checkUserExists(email) {
  if (!email) return false;
  
  try {
    await connectToDatabase();
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw new Error('Failed to check user existence: ' + error.message);
  }
}

/**
 * Get all users from database
 * @returns {Promise<Array>} - List of users (without passwords)
 */
export async function getUsers() {
  try {
    await connectToDatabase();
    const users = await User.find();
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Get user by email
 * @param {string} email - Email of user to find
 * @returns {Promise<Object|null>} - User object or null if not found
 */
export async function getUserByEmail(email) {
  if (!email) return null;
  
  try {
    await connectToDatabase();
    // Include password for authentication purposes
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log(`getUserByEmail: Looking for ${email.toLowerCase()}, Found:`, user ? 'Yes' : 'No');
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user by ID
 * @param {string} id - ID of user to find
 * @returns {Promise<Object|null>} - User object or null if not found
 */
export async function getUserById(id) {
  if (!id) return null;
  
  try {
    await connectToDatabase();
    const user = await User.findById(id);
    console.log(`getUserById: Looking for ID ${id}, Found:`, user ? 'Yes' : 'No');
    return user;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Add new user
 * @param {Object} userData - New user data {name, email, password}
 * @returns {Promise<Object>} - Newly created user (without password)
 */
export async function createUser(userData) {
  if (!userData || !userData.email || !userData.name || !userData.password) {
    throw new Error('Data pengguna tidak lengkap');
  }
  
  // Normalize email
  const normalizedEmail = userData.email.trim().toLowerCase();
  
  try {
    await connectToDatabase();
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new Error('Email sudah terdaftar');
    }
    
    // Create new user
    const newUser = new User({
      name: userData.name.trim(),
      email: normalizedEmail,
      password: userData.password,
      status: 'active'
    });
    
    console.log('Adding new user:', newUser.email);
    await newUser.save();
    
    // Get users for debugging
    const usersCount = await User.countDocuments();
    console.log(`Database now contains ${usersCount} user(s)`);
    
    // Return user without password
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user data
 * @param {string} userId - ID of user to update
 * @param {Object} updateData - Data to update {name, email, etc}
 * @returns {Promise<Object|null>} - Updated user or null if failed
 */
export async function updateUser(userId, updateData) {
  if (!userId || !updateData) {
    throw new Error('ID user dan data update harus diisi');
  }
  
  try {
    await connectToDatabase();
    
    // If email is being updated, check if it's already in use
    if (updateData.email) {
      const normalizedEmail = updateData.email.toLowerCase().trim();
      const existingUser = await User.findOne({ 
        email: normalizedEmail,
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        throw new Error('Email sudah digunakan oleh pengguna lain');
      }
      
      // Update email to normalized version
      updateData.email = normalizedEmail;
    }
    
    // Handling special case for password
    if (updateData.password) {
      // Password will be hashed by the pre-save middleware in the model
      // But here we need to use findByIdAndUpdate, which won't trigger pre-save
      // So we hash it manually
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
    
    // Update user with new data and timestamps
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true } // Return updated object and run validators
    );
    
    if (!updatedUser) {
      throw new Error('User tidak ditemukan');
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Verify user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object|null>} - User data if successful or null if failed
 */
export async function verifyCredentials(email, password) {
  if (!email || !password) {
    return null;
  }
  
  try {
    await connectToDatabase();
    
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Verifying credentials for:', normalizedEmail);
    
    // Get user with password included
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      console.log('User not found:', normalizedEmail);
      return null;
    }
    
    // Check user status
    if (user.status === 'disabled' || user.status === 'suspended') {
      console.warn(`Login attempt by inactive user: ${email}`);
      return null;
    }
    
    // Verify password using the model method
    const passwordMatch = await user.verifyPassword(password);
    console.log('Password match result:', passwordMatch);
    
    if (!passwordMatch) {
      return null;
    }
    
    // Update last login time
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    
    // Return user without password
    return user;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
}

/**
 * Delete user
 * @param {string} userId - ID of user to delete
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteUser(userId) {
  if (!userId) {
    throw new Error('ID user harus diisi');
  }
  
  try {
    await connectToDatabase();
    const result = await User.findByIdAndDelete(userId);
    
    if (!result) {
      throw new Error('User tidak ditemukan');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Check if database is ready
 * @returns {Promise<boolean>} Success status
 */
export async function checkDatabaseHealth() {
  try {
    await connectToDatabase();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Disable/enable user account
 * @param {string} userId - ID of user to change status
 * @param {string} status - New status ('active', 'disabled', 'suspended')
 * @returns {Promise<Object|null>} Updated user
 */
export async function updateUserStatus(userId, status) {
  if (!userId || !status || !['active', 'disabled', 'suspended'].includes(status)) {
    throw new Error('ID user dan status yang valid harus diisi');
  }
  
  return updateUser(userId, { status });
}

/**
 * Reset user password
 * @param {string} email - User email
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
export async function resetPassword(email, newPassword) {
  if (!email || !newPassword || newPassword.length < 6) {
    throw new Error('Email dan password baru (min. 6 karakter) harus diisi');
  }
  
  try {
    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      throw new Error('User tidak ditemukan');
    }
    
    user.password = newPassword;
    user.passwordResetAt = new Date();
    await user.save();
    
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

/**
 * Debug: dump users for troubleshooting
 * @returns {Promise<Array>} Array of basic user data
 */
export async function debugDumpUsers() {
  try {
    await connectToDatabase();
    const users = await User.find();
    
    console.log(`Database contains ${users.length} users`);
    
    return users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      hasPassword: true,
      status: user.status,
      createdAt: user.createdAt
    }));
  } catch (error) {
    console.error('Error dumping users:', error);
    return [];
  }
}