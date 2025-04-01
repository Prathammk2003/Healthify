import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import User from '@/models/User';

/**
 * Validates a JWT token from the request headers
 * @param {Request} req - The request object
 * @returns {Promise<Object|null>} - The user object or null if invalid
 */
export async function validateJWT(req) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return null;
    }

    // Connect to database if not already connected
    await connectDB();

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
} 