import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '9d2c6d8f-f47e-4c39-92d3-ff8c15b6c8a2';

/**
 * Verify a JWT token and return the decoded payload
 * 
 * @param {string} token - The JWT token to verify
 * @returns {Object|null} - The decoded token payload or null if invalid
 */
export const verifyJwtToken = async (token) => {
  try {
    // Basic token format validation
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      console.error('JWT Verification Error: Token is missing or malformed');
      return null;
    }
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      console.log('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token signature or malformed token');
    } else if (error.name === 'NotBeforeError') {
      console.log('Token not yet valid');
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
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
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '90d' }
  );
}; 