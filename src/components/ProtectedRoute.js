'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

/**
 * ProtectedRoute component
 * 
 * Wraps components that should only be accessible to authenticated users.
 * If user is not authenticated, they are redirected to the login page.
 * 
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - Child components to render if authenticated
 * @param {string[]} props.allowedRoles - Optional array of roles allowed to access the route (e.g. ['admin', 'doctor'])
 * @returns {JSX.Element|null} The protected component or null during redirect
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, role, verifyToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Verify that the token is valid
    const isValid = verifyToken();
    if (!isValid) {
      console.log('Invalid authentication token, redirecting to login');
      router.push('/login');
      return;
    }

    // If roles are specified, check if the user has an allowed role
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      console.log('User does not have required role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, role, router, verifyToken, allowedRoles]);

  // If not authenticated, show a loading state
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If authenticated, render the children
  return children;
} 