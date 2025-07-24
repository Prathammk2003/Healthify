'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

/**
 * AuthChecker component
 * 
 * This component silently checks and fixes authentication tokens on client side
 */
export default function AuthChecker() {
  const { verifyToken } = useAuth();
  
  useEffect(() => {
    // Run token verification on component mount
    const checkAuth = async () => {
      try {
        // Get tokens from storage
        const localToken = localStorage.getItem('token');
        const sessionToken = sessionStorage.getItem('token');
        
        if (!localToken && !sessionToken) {
          return;
        }
        
        // Check if tokens match
        if (localToken && sessionToken && localToken !== sessionToken) {
          // Use verifyToken to fix this issue
          verifyToken();
        } else {
          // Just verify the token
          verifyToken();
        }
      } catch (error) {
        // Silent catch
      }
    };
    
    // Run the check
    checkAuth();
    
    // We don't need to re-run this effect
  }, [verifyToken]);
  
  // This component doesn't render anything
  return null;
} 