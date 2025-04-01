'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  userId: null,
  token: null,
  role: null,
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userId: null,
    token: null,
    role: null,
    isAdmin: false,
  });

  useEffect(() => {
    // Check if we have auth data in localStorage
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (token && userId) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Debug - Auth token payload:', payload);
        if (payload.exp * 1000 < Date.now()) {
          // Token is expired, clear auth data
          console.log('Debug - Token expired, logging out');
          logout();
          return;
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
        return;
      }

      console.log('Debug - Setting auth state with isAdmin:', isAdmin);
      setAuthState({
        isAuthenticated: true,
        token,
        userId,
        role,
        isAdmin: !!isAdmin,
      });
    }
  }, []);

  // Add periodic session verification
  useEffect(() => {
    // Only check if user is logged in
    if (!authState.isAuthenticated) return;

    const checkActiveSession = async () => {
      try {
        // Check for active sessions flag by making a request to the API
        const response = await fetch('/api/auth/session-check', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authState.token}`
          }
        });
        
        if (!response.ok) {
          console.log('Session check failed - logging out user');
          logout();
        }
      } catch (error) {
        console.log('Error checking session status - logging out user');
        logout();
      }
    };

    // Run the check immediately and then every 30 seconds
    checkActiveSession();
    const interval = setInterval(checkActiveSession, 30000);

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token]);

  const login = (userData) => {
    const { token, userId, role, isAdmin } = userData;
    
    // Save to localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    if (role) localStorage.setItem('role', role);
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    
    // Update state
    setAuthState({
      isAuthenticated: true,
      token,
      userId,
      role,
      isAdmin: !!isAdmin,
    });
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('isAdmin');
    
    // Update state
    setAuthState({
      isAuthenticated: false,
      token: null,
      userId: null,
      role: null,
      isAdmin: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 