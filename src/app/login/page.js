'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { signIn, getSession } from 'next-auth/react';

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Extract the callback URL from query parameters
  useEffect(() => {
    const callback = searchParams.get('callbackUrl');
    if (callback) {
      setCallbackUrl(decodeURIComponent(callback));
    }

    // Trigger form animation
    setIsFormVisible(true);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    setMessage('');

    try {
      // Use direct window redirect for Google OAuth
      window.location.href = '/api/auth/signin/google?callbackUrl=' + encodeURIComponent('/auth/success');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('An error occurred during Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 text-gray-800 dark:text-white relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Blob 1 - More Subtle */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob"
          style={{
            top: '10%',
            left: '5%',
          }}
        />
        {/* Floating Blob 2 - More Subtle */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-indigo-200/30 to-cyan-200/30 dark:from-indigo-500/10 dark:to-cyan-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob animation-delay-2000"
          style={{
            top: '60%',
            right: '5%',
          }}
        />

        {/* Interactive Gradient Following Mouse - Subtle */}
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-blue-300/20 dark:from-blue-400/10 to-transparent rounded-full transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] dark:opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Back to Home Link */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-xl shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-700/50 group transition-all duration-300"
      >
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </div>
      </Link>

      {/* Main Login Container */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-1000 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl">
          {/* Subtle Decorative Elements */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-40"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full opacity-40"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-40"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full opacity-40"></div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              ⚡ Healthify
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base">
              Sign in to access your healthcare dashboard
            </p>
            <div className="mt-4 w-16 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto"></div>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-200">{message}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-200">{error}</span>
              </div>
            </div>
          )}

          {callbackUrl && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-200 text-sm">You need to log in to access the requested page</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="form-label text-gray-700 dark:text-gray-200 font-semibold">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10 bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-blue-600/20 dark:focus:ring-blue-500/20 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-900/70"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading || isResending}
                />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300"></div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="form-label text-gray-700 dark:text-gray-200 font-semibold">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10 pr-12 bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-blue-600/20 dark:focus:ring-blue-500/20 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-900/70"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading || isResending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300 focus:outline-none hover:scale-110"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300"></div>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300 hover:underline inline-flex items-center font-medium">
                Forgot your password?
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <button
              type="submit"
              className={`w-full py-4 text-lg font-semibold relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${isLoading || isResending ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
                }`}
              disabled={isLoading || isResending}
            >
              <span className="relative flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="spinner w-5 h-5 mr-3 animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    🔑 Sign In
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Google OAuth Sign-In */}
          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              className={`w-full py-4 px-6 border border-gray-200 dark:border-white/20 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300 hover-lift group relative overflow-hidden transform ${isGoogleLoading || isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 hover:border-blue-300 dark:hover:border-white/40'
                }`}
              disabled={isGoogleLoading || isLoading}
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-red-500/10 dark:to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center justify-center text-gray-700 dark:text-white">
                {isGoogleLoading ? (
                  <>
                    <div className="spinner w-5 h-5 mr-3 animate-spin border-gray-600 dark:border-gray-400 border-t-transparent"></div>
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3 transform group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                    <svg className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Email Verification Section */}
          {needsVerification && (
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-amber-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-semibold text-amber-200">Email Verification Required</h3>
              </div>
              <p className="mb-4 text-amber-100">
                Your email is not verified. Please verify your email to continue.
              </p>
              <button
                onClick={handleResendVerification}
                className={`w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover-lift transition-all duration-300 ${isResending ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                disabled={isResending}
              >
                {isResending ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-3"></div>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    📧 Verify Email Now
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Password Setup Required */}
          {needsPassword && (
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-semibold text-purple-200">Password Setup Required</h3>
              </div>
              <p className="text-purple-100">
                You need to set your password to complete registration. Redirecting...
              </p>
              <div className="mt-4 flex items-center">
                <div className="spinner w-5 h-5 mr-3"></div>
                <span className="text-purple-200">Redirecting to password setup...</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Don't have an account yet?
            </p>
            <Link
              href="/register"
              className="group inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-white/20 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300 hover-lift text-blue-600 dark:text-white"
            >
              <span className="flex items-center">
                🎆 Create Account
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Additional Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 flex justify-center space-x-6 text-sm">
            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors">Forgot Password?</a>
            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors">Need Help?</a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          © 2024 Healthify. All rights reserved. Your health, secured.
        </p>
      </div>
    </div>
  );
}
