import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

/**
 * Validates authentication from either JWT token or NextAuth session
 * @param {Request} req - The request object
 * @returns {Promise<Object|null>} - The user object or null if invalid
 */
export async function validateJWT(req) {
  try {
    // First, try to validate JWT token from Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('🔐 validateJWT: Authorization header present:', !!authHeader);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('🔐 validateJWT: Token extracted, length:', token?.length);

      if (token) {
        try {
          // Verify the JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('🔐 validateJWT: JWT verified successfully, userId:', decoded?.id);

          if (decoded && decoded.id) {
            // Connect to database if not already connected
            await connectDB();

            // Find the user
            const user = await User.findById(decoded.id);
            if (user) {
              console.log('🔐 validateJWT: User found in database:', user.email);
              return user;
            } else {
              console.log('🔐 validateJWT: User not found in database for ID:', decoded.id);
            }
          }
        } catch (jwtError) {
          console.log('🔐 validateJWT: JWT verification failed, trying NextAuth session:', jwtError.message);
        }
      }
    }

    // If JWT validation fails, try NextAuth session
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (token) {
        // Connect to database if not already connected
        await connectDB();

        // Prefer token.id (set by our callbacks) over token.sub
        const userId = token.id || token.sub;

        // Validate that userId is a valid ObjectId (24 hex characters)
        // This prevents "Cast to ObjectId failed" errors when using Google IDs
        if (userId && /^[0-9a-fA-F]{24}$/.test(userId)) {
          // Find the user by ID from NextAuth token
          const user = await User.findById(userId);
          if (user) {
            return user;
          }
        } else {
          console.log(`validateJWT: Invalid ObjectId format for userId: ${userId}`);
        }
      }
    } catch (nextAuthError) {
      console.log('NextAuth session validation failed:', nextAuthError.message);
    }

    return null;
  } catch (error) {
    console.error('Authentication validation error:', error);
    return null;
  }
} 