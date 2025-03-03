// src/models/User.js
import mongoose from 'mongoose';
import validator from 'validator';

// Define User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama harus diisi'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email harus diisi'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Format email tidak valid']
  },
  password: {
    type: String,
    required: [true, 'Password harus diisi'],
    minlength: [6, 'Password minimal 6 karakter'],
    select: false // Don't include password in query results by default
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'suspended'],
    default: 'active'
  },
  avatar: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLoginAt: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  passwordResetAt: Date
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
});

// Important: We're NOT adding any password hashing in the model
// This is because db.js is already handling all the password operations

// Method to sanitize user object for responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Create or get User model
// Use the approach that works with Next.js - models might be initialized multiple times
let User;

try {
  // Try to get the existing model to avoid model overwrite error
  User = mongoose.model('User');
} catch (error) {
  // Model doesn't exist yet, create it
  User = mongoose.model('User', userSchema);
}

export default User;
