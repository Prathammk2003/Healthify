'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { login } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('OAuth callback - Session status:', status);
    console.log('OAuth callback - Session data:', session);
    
    if (status === 'loading') return; // Still loading

    if (status === 'authenticated' && session?.user && !isRedirecting) {
      setIsRedirecting(true);
      
      console.log('OAuth Callback: Generating JWT token for OAuth user');
      
      // Generate a proper JWT token for the OAuth user
      const generateTokenForOAuthUser = async () => {
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
            const tokenData = await response.json();
            
            // Integration with custom AuthProvider using the generated JWT token
            login({
              token: tokenData.token,
              userId: session.user.id,
              role: session.user.role || 'patient',
              isAdmin: session.user.isAdmin || false,
            });

            // Redirect based on user role
            const redirectPath = session.user.role === 'admin' ? '/dashboard/admin' : '/dashboard';
            
            console.log('OAuth callback: redirecting to', redirectPath);
            
            // Use a slight delay to ensure state is updated
            setTimeout(() => {
              router.push(redirectPath);
            }, 500);
          } else {
            console.error('Failed to generate JWT token for OAuth user');
            // Fallback: use user ID as token (original behavior)
            login({
              token: session.user.id,
              userId: session.user.id,
              role: session.user.role || 'patient',
              isAdmin: session.user.isAdmin || false,
            });
            
            const redirectPath = session.user.role === 'admin' ? '/dashboard/admin' : '/dashboard';
            setTimeout(() => {
              router.push(redirectPath);
            }, 500);
          }
        } catch (error) {
          console.error('Error generating OAuth token:', error);
          // Fallback: use user ID as token (original behavior)
          login({
            token: session.user.id,
            userId: session.user.id,
            role: session.user.role || 'patient',
            isAdmin: session.user.isAdmin || false,
          });
          
          const redirectPath = session.user.role === 'admin' ? '/dashboard/admin' : '/dashboard';
          setTimeout(() => {
            router.push(redirectPath);
          }, 500);
        }
      };
      
      generateTokenForOAuthUser();
    } else if (status === 'unauthenticated') {
      // Redirect to login if not authenticated
      console.log('OAuth callback: not authenticated, redirecting to login');
      router.push('/login?error=OAuthError');
    }
  }, [session, status, login, router, isRedirecting]);

  if (status === 'loading' || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4 animate-spin"></div>
          <p className="text-lg">
            {status === 'loading' ? 'Completing sign-in...' : 'Redirecting to dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="spinner w-8 h-8 mx-auto mb-4 animate-spin"></div>
        <p className="text-lg">Processing authentication...</p>
      </div>
    </div>
  );
}