import { validateJWT } from './auth-utils'; // Use validateJWT instead of direct jwt
import { ObjectId } from 'mongodb';

// Use the secret from validateJWT which properly handles environment variables
const JWT_SECRET = process.env.JWT_SECRET || '9d2c6d8f-f47e-4c39-92d3-ff8c15b6c8a2';

/**
 * Verify a JWT token and return the decoded payload
 * 
 * @param {string} token - The JWT token to verify
 * @returns {Object|null} - The decoded token payload or null if invalid
 */
export const verifyJwtToken = async (token) => {
  try {
    console.log('🔑 verifyJwtToken: Starting verification, token length:', token?.length);
    
    // Basic token format validation
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      console.error('🔑 JWT Verification Error: Token is missing or malformed');
      return null;
    }
    
    // Use our validateJWT utility which handles both JWT and NextAuth
    // Create a mock request object for validateJWT
    const mockReq = {
      headers: {
        get: (name) => {
          if (name.toLowerCase() === 'authorization') {
            return `Bearer ${token}`;
          }
          return null;
        }
      }
    };
    
    console.log('🔑 verifyJwtToken: Calling validateJWT');
    const user = await validateJWT(mockReq);
    const result = user ? { id: user._id, email: user.email, role: user.role } : null;
    console.log('🔑 verifyJwtToken: Result:', result ? `User ${result.email}` : 'null');
    return result;
  } catch (error) {
    console.error('🔑 JWT Verification Error:', error);
    
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      console.log('🔑 Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('🔑 Invalid token signature or malformed token');
    } else if (error.name === 'NotBeforeError') {
      console.log('🔑 Token not yet valid');
    }
    
    return null;
  }
};

/**
 * Generate a JWT token for a user
 * 
 * @param {Object} payload - The data to include in the token
 * @param {string} expiresIn - Token expiration time (default: '7d')
 * @returns {string} - The generated JWT token
 */
export const generateToken = (payload, expiresIn = '7d') => {
  // This function is kept for backward compatibility but should be replaced with validateJWT
  return require('jsonwebtoken').sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Get sanitized user data (remove sensitive fields)
 * 
 * @param {Object} user - The user object from database
 * @returns {Object} - User object with sensitive fields removed
 */
export const getSafeUser = (user) => {
  if (!user) return null;
  
  // Convert to plain object if it's a Mongoose document
  const userObj = user.toObject ? user.toObject() : { ...user };
  
  // Remove sensitive fields
  const { password, __v, ...safeUser } = userObj;
  return safeUser;
};

export const generateRefreshToken = (user) => {
  // This function is kept for backward compatibility but should be replaced with validateJWT
  return require('jsonwebtoken').sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '90d' }
  );
};

/**
 * Verify authentication from request headers
 * 
 * @param {Request} request - The request object
 * @returns {Object} - Authentication result with success flag and user data
 */
export const verifyAuth = async (request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No valid authorization header' };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return { success: false, error: 'Invalid token' };
    }
    
    return {
      success: true,
      userId: decoded.id,
      userEmail: decoded.email,
      userRole: decoded.role,
      decoded
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Authentication failed' };
  }
};