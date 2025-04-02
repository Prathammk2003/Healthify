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
    // Check if we have auth data in localStorage or sessionStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const role = sessionStorage.getItem('role') || localStorage.getItem('role');
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === 'true';
    
    if (token && userId) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          // Token is expired, clear auth data
          logout();
          return;
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
        return;
      }

      setAuthState({
        isAuthenticated: true,
        token,
        userId,
        role,
        isAdmin: !!isAdmin,
      });
    }
  }, []);

  // Removing the periodic session verification that could be causing issues
  // We'll rely on JWT expiration instead

  const login = (userData) => {
    const { token, userId, role, isAdmin } = userData;
    
    // Save to sessionStorage instead of localStorage for better security
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('userId', userId);
    if (role) sessionStorage.setItem('role', role);
    sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    
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
    // Clear localStorage and sessionStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('isAdmin');
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('isAdmin');
    
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