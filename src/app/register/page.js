'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('patient');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    // Trigger form animation
    setIsFormVisible(true);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        setMessage(data.message);
        if (data.requiresVerification) {
          setShowVerification(true);
          setUserId(data.user.id);
          // If email sending failed, use the verification code from response
          if (data.verificationCode) {
            setMessage(`${data.message} For testing, use this code: ${data.verificationCode}`);
          }
        } else {
          // Clear form if not showing verification
          setName('');
          setEmail('');
          setRole('patient');

          // Wait a moment before redirecting
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      }
    } catch (err) {
      setError('An error occurred during registration');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
      } else {
        if (data.passwordChangeRequired) {
          // Redirect to set password page
          router.push(`/set-password?email=${encodeURIComponent(email)}`);
        } else {
          setMessage('Email verified successfully! Redirecting to login...');
          // Clear form
          setName('');
          setEmail('');
          setRole('patient');
          setVerificationCode('');
          setShowVerification(false);

          // Wait a moment before redirecting
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      }
    } catch (err) {
      setError('An error occurred during verification');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;

    setMessage('Resending verification code...');
    setError('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code');
      } else {
        setMessage(data.message);
        // If email sending failed, use the verification code from response
        if (data.verificationCode) {
          setMessage(`${data.message} For testing, use this code: ${data.verificationCode}`);
        }
      }
    } catch (err) {
      setError('An error occurred while resending the code');
      console.error('Resend code error:', err);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    setMessage('');

    try {
      // Use direct window redirect for Google OAuth
      window.location.href = '/api/auth/signin/google?callbackUrl=' + encodeURIComponent('/auth/success');
    } catch (error) {
      console.error('Google sign-up error:', error);
      setError('An error occurred during Google sign-up. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Blob 1 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"
          style={{
            top: '20%',
            left: '10%',
          }}
        />
        {/* Floating Blob 2 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
          style={{
            top: '60%',
            right: '10%',
          }}
        />

        {/* Interactive Gradient Following Mouse */}
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-purple-500/10 to-transparent rounded-full transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Back to Home Link */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 glass-card p-3 hover-lift group transition-all duration-300"
      >
        <div className="flex items-center space-x-2 text-white/80 hover:text-white">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </div>
      </Link>

      {/* Main Register Container */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-1000 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
        <div className="glass-card-3d p-8 hover-lift">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
              ⚡ Healthify
            </div>
            <h1 className="text-3xl font-bold mb-2 text-shimmer bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {showVerification ? 'Verify Your Email' : 'Join Healthify'}
            </h1>
            <p className="text-gray-300">
              {showVerification
                ? 'Enter the verification code sent to your email'
                : 'Create your account to start managing your health'
              }
            </p>
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

          {!showVerification ? (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="form-label text-gray-200">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-200 group-focus-within:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                    placeholder="Enter your full name"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-gray-200">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-200 group-focus-within:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-gray-200">Account Type</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-200 group-focus-within:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-input pl-10 bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/20"
                    disabled={isLoading}
                  >
                    <option value="patient" className="bg-gray-800 text-white">🧑‍⚕️ Patient</option>
                    <option value="doctor" className="bg-gray-800 text-white">👩‍⚕️ Doctor</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={`button-primary w-full py-4 text-lg font-semibold relative overflow-hidden group hover-lift bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                disabled={isLoading}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></span>
                <span className="relative flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-3"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      🎆 Create Account
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>
          ) : (
            /* Email Verification Form */
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <label className="form-label text-gray-200">Verification Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-200 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="form-input pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 text-center tracking-widest text-xl font-mono"
                    placeholder="000000"
                    maxLength={6}
                    pattern="\d{6}"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Enter the 6-digit code sent to <span className="text-blue-400">{email}</span>
                </p>
              </div>

              <button
                type="submit"
                className={`button-primary w-full py-4 text-lg font-semibold relative overflow-hidden group hover-lift bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                disabled={isLoading}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></span>
                <span className="relative flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-3"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      ✓ Verify Email
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                className="w-full py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover-lift disabled:opacity-70"
                disabled={isLoading}
              >
                <span className="flex items-center justify-center text-gray-300">
                  🔄 Resend Code
                </span>
              </button>
            </form>
          )}

          {/* Google OAuth Sign-Up - Only show during registration, not verification */}
          {!showVerification && (
            <div className="mt-6">
              <button
                onClick={handleGoogleSignUp}
                className={`w-full py-4 px-6 border border-white/20 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover-lift group relative overflow-hidden ${isGoogleLoading || isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                disabled={isGoogleLoading || isLoading}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <span className="relative flex items-center justify-center text-white">
                  {isGoogleLoading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-3"></div>
                      Creating account with Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-gray-400">or</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-300 mb-4">
              Already have an account?
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center justify-center px-6 py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover-lift"
            >
              <span className="flex items-center text-white">
                🔑 Sign In
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Additional Information */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center text-sm text-gray-400">
              <p className="mb-2">By creating an account, you agree to our</p>
              <div className="space-x-4">
                <a href="#" className="hover:text-white transition-colors underline">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors underline">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-gray-400 text-sm">
          © 2024 Healthify. All rights reserved. Your health, secured.
        </p>
      </div>
    </div>
  );
}
