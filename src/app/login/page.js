'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');

  // Extract the callback URL from query parameters
  useEffect(() => {
    const callback = searchParams.get('callbackUrl');
    if (callback) {
      setCallbackUrl(decodeURIComponent(callback));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    setNeedsVerification(false);
    setNeedsPassword(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsVerification) {
          setNeedsVerification(true);
          setError(data.error);
        } else if (data.passwordChangeRequired) {
          setNeedsPassword(true);
          setError(data.error);
          // Redirect to set password page
          setTimeout(() => {
            router.push(`/set-password?email=${encodeURIComponent(email)}`);
          }, 1500);
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        // Login successful
        login({
          token: data.token,
          userId: data.user._id,
          role: data.user.role,
          isAdmin: data.user.isAdmin,
        });

        setMessage('Login successful! Redirecting...');
        
        // Determine where to redirect based on callback URL or user role
        if (callbackUrl) {
          // Redirect to the original URL the user was trying to access
          router.push(callbackUrl);
        } else {
          // Default redirect based on role
          const redirectPath = data.user.role === 'admin' ? '/dashboard/admin' : '/dashboard';
          router.push(redirectPath);
        }
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setMessage('');
    setIsResending(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend verification email');
      } else {
        setMessage('Verification code has been sent to your email.');
        // If email sending failed, use the verification code from response
        if (data.verificationCode) {
          setMessage(`${data.message} For testing, use this code: ${data.verificationCode}`);
        }
        
        // Redirect to verification page with the entered email
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 1500);
      }
    } catch (err) {
      setError('An error occurred while resending verification email');
      console.error('Resend verification error:', err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">Login</h2>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {callbackUrl && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded text-sm">
            You need to log in to access the requested page
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading || isResending}
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                required
                disabled={isLoading || isResending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 font-medium disabled:opacity-70"
            disabled={isLoading || isResending}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {needsVerification && (
          <div className="mt-4">
            <p className="mb-3 text-amber-600 dark:text-amber-400">
              Your email is not verified. Please verify your email to continue.
            </p>
            <button
              onClick={handleResendVerification}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition duration-200 font-medium disabled:opacity-70"
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Verify Email Now'}
            </button>
          </div>
        )}

        {needsPassword && (
          <div className="mt-4">
            <p className="mb-3 text-amber-600 dark:text-amber-400">
              You need to set your password to complete registration. Redirecting...
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register">
              <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                Register
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
