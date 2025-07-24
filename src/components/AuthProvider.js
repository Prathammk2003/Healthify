'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

export function AuthProvider({ children }) {
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
    // Skip in SSR context
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
      
      setAuthState({
        isAuthenticated: true,
        token,
        userId,
        role,
        isAdmin: !!isAdmin,
      });
    } else if (token) {
      // Token exists but is invalid
      console.warn('Found invalid token, logging out');
      logout();
    }

    // Add event listener for when browser/tab is closing
    const handleBeforeUnload = async (event) => {
      if (authState.isAuthenticated && authState.token) {
        // The keepalive flag in the fetch ensures the request completes
        // even as the page is unloading
        serverLogout(authState.token);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [authState.isAuthenticated, authState.token]);

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
    
    // Try to notify the server about the logout
    if (token) {
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

export const useAuth = () => useContext(AuthContext); 