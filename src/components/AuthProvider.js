'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

// Create a simple cookie utility
const Cookies = {
  get: (name) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  set: (name, value, options = {}) => {
    if (typeof document === 'undefined') return;
    const cookieStr = name + '=' + encodeURIComponent(value);
    const optionsStr = Object.entries(options)
      .reduce((acc, [key, val]) => {
        if (key === 'expires' && typeof val === 'number') {
          const d = new Date();
          d.setTime(d.getTime() + val * 864e5);
          return acc + '; expires=' + d.toUTCString();
        }
        return acc + '; ' + key + (val === true ? '' : '=' + val);
      }, '');
    document.cookie = cookieStr + optionsStr;
  },
  remove: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
};

const AuthContext = createContext({
  isAuthenticated: false,
  userId: null,
  token: null,
  role: null,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  verifyToken: () => false,
});

// Export AuthContext for the useAuth hook
export { AuthContext };

// Create a useAuth hook for easier consumption of the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userId: null,
    token: null,
    role: null,
    isAdmin: false,
  });

  // Function to check if a token is valid
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      // Check if token has the correct format
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Parse the payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      
      // Check if token is expired
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  // Function to handle server-side logout
  const serverLogout = async (token) => {
    if (!token) return;
    
    try {
      // Call the API to end the session server-side
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Use keepalive to ensure the request completes even if page is closing
        keepalive: true
      });
    } catch (error) {
      console.error('Error during server logout:', error);
    }
  };

  useEffect(() => {
    // Handle NextAuth session
    if (status === 'loading') return; // Still loading
    
    if (status === 'authenticated' && session?.user) {
      // NextAuth session is active - generate a JWT token for API calls
      const generateJWTForNextAuth = async () => {
        try {
          const response = await fetch('/api/auth/oauth-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              role: session.user.role || 'patient'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Generated JWT token for NextAuth user');
            
            // Store the JWT token for API calls
            sessionStorage.setItem('token', data.token);
            localStorage.setItem('token', data.token);
            Cookies.set('token', data.token, { 
              secure: true,
              sameSite: 'strict',
              path: '/',
              expires: 7
            });
            
            // Update auth state with real JWT token
            setAuthState(prevState => {
              if (prevState.token !== data.token || prevState.userId !== session.user.id) {
                return {
                  isAuthenticated: true,
                  userId: session.user.id,
                  token: data.token, // Use real JWT token instead of 'nextauth-session'
                  role: session.user.role || 'patient',
                  isAdmin: session.user.isAdmin || false,
                };
              }
              return prevState;
            });
          } else {
            console.error('Failed to generate JWT token for NextAuth user');
            // Fallback to nextauth-session if token generation fails
            setAuthState(prevState => {
              if (prevState.token !== 'nextauth-session' || prevState.userId !== session.user.id) {
                return {
                  isAuthenticated: true,
                  userId: session.user.id,
                  token: 'nextauth-session',
                  role: session.user.role || 'patient',
                  isAdmin: session.user.isAdmin || false,
                };
              }
              return prevState;
            });
          }
        } catch (error) {
          console.error('Error generating JWT token for NextAuth user:', error);
          // Fallback to nextauth-session
          setAuthState(prevState => {
            if (prevState.token !== 'nextauth-session' || prevState.userId !== session.user.id) {
              return {
                isAuthenticated: true,
                userId: session.user.id,
                token: 'nextauth-session',
                role: session.user.role || 'patient',
                isAdmin: session.user.isAdmin || false,
              };
            }
            return prevState;
          });
        }
      };
      
      // Only generate token if we don't already have a valid JWT
      const existingToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!existingToken || existingToken === 'nextauth-session' || !isTokenValid(existingToken)) {
        generateJWTForNextAuth();
      } else {
        // We already have a valid JWT token
        setAuthState(prevState => {
          if (prevState.token !== existingToken || prevState.userId !== session.user.id) {
            return {
              isAuthenticated: true,
              userId: session.user.id,
              token: existingToken,
              role: session.user.role || 'patient',
              isAdmin: session.user.isAdmin || false,
            };
          }
          return prevState;
        });
      }
      
      return;
    }
    
    // Fall back to JWT token authentication for local auth
    if (typeof window === 'undefined') return;
    
    // Check if we have auth data in localStorage or sessionStorage
    const sessionToken = sessionStorage.getItem('token');
    const localToken = localStorage.getItem('token');
    const cookieToken = Cookies.get('token');
    
    // Prioritize session token, fall back to localStorage, then cookie
    const token = sessionToken || localToken || cookieToken;
    
    // If tokens exist but don't match, use the valid one
    if ((sessionToken && localToken && sessionToken !== localToken) || 
        (cookieToken && sessionToken && cookieToken !== sessionToken) ||
        (cookieToken && localToken && cookieToken !== localToken)) {
      
      const isSessionValid = isTokenValid(sessionToken);
      const isLocalValid = isTokenValid(localToken);
      const isCookieValid = isTokenValid(cookieToken);
      
      // Find the valid token and sync across all storage mechanisms
      if (isSessionValid) {
        localStorage.setItem('token', sessionToken);
        Cookies.set('token', sessionToken, { secure: true, sameSite: 'strict', path: '/' });
      } else if (isLocalValid) {
        sessionStorage.setItem('token', localToken);
        Cookies.set('token', localToken, { secure: true, sameSite: 'strict', path: '/' });
      } else if (isCookieValid) {
        sessionStorage.setItem('token', cookieToken);
        localStorage.setItem('token', cookieToken);
      }
    }
    
    if (token && isTokenValid(token)) {
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      const role = sessionStorage.getItem('role') || localStorage.getItem('role');
      const isAdmin = sessionStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === 'true';
      
      // Ensure consistency between storages
      sessionStorage.setItem('token', token);
      localStorage.setItem('token', token);
      Cookies.set('token', token, { secure: true, sameSite: 'strict', path: '/' });
      
      if (userId) {
        sessionStorage.setItem('userId', userId);
        localStorage.setItem('userId', userId);
      }
      
      setAuthState(prevState => {
        // Only update if different to prevent loops
        if (prevState.token !== token || prevState.userId !== userId) {
          return {
            isAuthenticated: true,
            token,
            userId,
            role,
            isAdmin: !!isAdmin,
          };
        }
        return prevState;
      });
    } else if (token) {
      // Token exists but is invalid
      console.warn('Found invalid token, logging out');
      logout();
    } else if (status === 'unauthenticated') {
      // Neither NextAuth session nor JWT token
      setAuthState(prevState => {
        // Only update if different to prevent loops
        if (prevState.isAuthenticated) {
          return {
            isAuthenticated: false,
            token: null,
            userId: null,
            role: null,
            isAdmin: false,
          };
        }
        return prevState;
      });
    }

    // Add event listener for when browser/tab is closing
    const handleBeforeUnload = async (event) => {
      const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (currentToken && currentToken !== 'nextauth-session') {
        serverLogout(currentToken);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session, status]); // Removed authState dependencies to prevent loops

  const login = (userData) => {
    const { token, userId, role, isAdmin } = userData;
    
    if (!token || !userId) {
      console.error('Missing token or userId in login data');
      return;
    }
    
    // Save to both sessionStorage and localStorage for better compatibility
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('userId', userId);
    if (role) sessionStorage.setItem('role', role);
    sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    if (role) localStorage.setItem('role', role);
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    
    // Also save token to a cookie for middleware authentication
    Cookies.set('token', token, { 
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: 7 // 7 days expiry to match JWT expiration
    });
    
    // Update state
    setAuthState({
      isAuthenticated: true,
      token,
      userId,
      role,
      isAdmin: !!isAdmin,
    });
  };

  const logout = async () => {
    const token = authState.token || sessionStorage.getItem('token') || localStorage.getItem('token');
    
    // If using NextAuth session, sign out through NextAuth
    if (session || authState.token === 'nextauth-session') {
      await signOut({ redirect: false });
    }
    
    // Try to notify the server about the logout for JWT tokens
    if (token && token !== 'nextauth-session') {
      await serverLogout(token);
    }
    
    // Clear localStorage and sessionStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('isAdmin');
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('isAdmin');
    
    // Remove token cookie
    Cookies.remove('token');
    
    // Update state
    setAuthState({
      isAuthenticated: false,
      token: null,
      userId: null,
      role: null,
      isAdmin: false,
    });
  };
  
  // Method to verify token validity and refresh auth state
  const verifyToken = () => {
    // If using NextAuth session, check session status
    if (session || authState.token === 'nextauth-session') {
      return status === 'authenticated';
    }
    
    // For JWT tokens, check validity
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || Cookies.get('token');
    const isValid = isTokenValid(token);
    
    if (!isValid && authState.isAuthenticated) {
      console.warn('Token verification failed, logging out');
      logout();
    }
    
    return isValid;
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        verifyToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 