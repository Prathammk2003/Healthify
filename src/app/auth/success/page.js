'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AuthSuccess() {
  const { data: session, status } = useSession();
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      if (status === 'loading' || hasProcessed) return;
      
      if (status === 'authenticated' && session?.user && !isAuthenticated) {
        try {
          setHasProcessed(true);
          
          // If we have a NextAuth session, update our AuthProvider
          login({
            token: 'nextauth-session',
            userId: session.user.id,
            role: session.user.role || 'patient',
            isAdmin: session.user.isAdmin || false,
          });
          
          // Redirect based on user role
          const redirectPath = session.user.isAdmin 
            ? '/dashboard/admin' 
            : session.user.role === 'doctor' 
              ? '/dashboard/doctor' 
              : '/dashboard';
              
          setTimeout(() => {
            router.push(redirectPath);
          }, 1500);
          
        } catch (error) {
          console.error('Error processing OAuth success:', error);
          setError('Error processing authentication. Please try again.');
          setIsProcessing(false);
          setHasProcessed(false);
        }
      } else if (status === 'authenticated' && session?.user && isAuthenticated) {
        // Already authenticated, just redirect
        const redirectPath = session.user.isAdmin 
          ? '/dashboard/admin' 
          : session.user.role === 'doctor' 
            ? '/dashboard/doctor' 
            : '/dashboard';
            
        router.push(redirectPath);
      } else if (status === 'unauthenticated') {
        setError('Authentication failed. Please try logging in again.');
        setIsProcessing(false);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    handleOAuthSuccess();
  }, [session, status, login, router, isAuthenticated, hasProcessed]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="glass-card-3d p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover-lift"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
        <div className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
      </div>
      
      <div className="glass-card-3d p-8 max-w-md w-full text-center relative z-10">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold mb-4 text-shimmer bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to Healthify!
            </h1>
            <p className="text-gray-300 mb-6">
              Setting up your account and redirecting to your dashboard...
            </p>
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse animation-delay-400"></div>
            </div>
          </>
        ) : (
          <>
            <div className="text-green-400 text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-4">Authentication Successful!</h1>
            <p className="text-gray-300">Redirecting to your dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
}
