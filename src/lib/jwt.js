import jwt from 'jsonwebtoken';

export const verifyJwtToken = async (token) => {
  try {
    if (!token) return null;
    
    // Get JWT secret from environment variable
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return null;
    }
    
    // Verify and return the decoded token
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
}; 