'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('inputting');
  const [message, setMessage] = useState('Enter your email and the 6-digit verification code sent to your inbox.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    // Get email from URL parameters
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setMessage(`Enter the 6-digit verification code sent to ${emailParam}`);
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

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      setMessage('Both email and verification code are required.');
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setMessage('Verification code must be 6 digits.');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setMessage('Verifying your email...');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerificationStatus('error');
        setMessage(data.error || 'Email verification failed. Please try again or contact support.');
      } else {
        setVerificationStatus('success');
        setMessage(data.message);
        
        // If password needs to be set, redirect to set-password page
        if (data.passwordChangeRequired) {
          setPasswordNeeded(true);
          setTimeout(() => {
            router.push(`/set-password?email=${encodeURIComponent(email)}`);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error during email verification:', error);
      setVerificationStatus('error');
      setMessage('An error occurred during verification. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setMessage('Please enter your email address to resend the verification code.');
      return;
    }

    setIsVerifying(true);
    setMessage('Sending a new verification code...');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Failed to send verification code. Please try again later.');
      } else {
        setMessage('A new verification code has been sent to your email.');
        // If email sending failed, use the verification code from response
        if (data.verificationCode) {
          setMessage(`${data.message} For testing, use this code: ${data.verificationCode}`);
        }
      }
    } catch (error) {
      console.error('Error resending verification code:', error);
      setMessage('An error occurred while sending verification code. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'inputting':
        return (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        );
      case 'verifying':
        return (
          <div className="w-16 h-16 mx-auto mb-6">
            <div className="spinner w-16 h-16"></div>
          </div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Blob 1 */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"
          style={{
            top: '20%',
            left: '10%',
          }}
        />
        {/* Floating Blob 2 */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
          style={{
            top: '60%',
            right: '10%',
          }}
        />
        
        {/* Interactive Gradient Following Mouse */}
        <div 
          className="absolute w-96 h-96 bg-gradient-radial from-cyan-500/10 to-transparent rounded-full transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>
      
      {/* Back to Register Link */}
      <Link 
        href="/register" 
        className="absolute top-6 left-6 z-50 glass-card p-3 hover-lift group transition-all duration-300"
      >
        <div className="flex items-center space-x-2 text-white/80 hover:text-white">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Register</span>
        </div>
      </Link>
      
      {/* Main Verify Email Container */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-1000 ${
        isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="glass-card-3d p-8 hover-lift text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
              ⚡ Healthify
            </div>
            <h1 className="text-3xl font-bold mb-2 text-shimmer bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Email Verification
            </h1>
            <p className="text-gray-300">
              Secure your account with email verification
            </p>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <div className="mb-8">
            <div className={`p-4 rounded-xl backdrop-blur-sm border ${
              verificationStatus === 'success' 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30' 
                : verificationStatus === 'error'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400/30'
                : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30'
            }`}>
              <p className={`${
                verificationStatus === 'success' 
                  ? 'text-green-200' 
                  : verificationStatus === 'error'
                  ? 'text-red-200'
                  : 'text-blue-200'
              }`}>
                {message}
              </p>
            </div>
          </div>

          {/* Verification Form */}
          {(verificationStatus === 'inputting' || verificationStatus === 'error') && (
            <form onSubmit={handleVerification} className="space-y-6">
              <div className="space-y-2">
                <label className="form-label text-gray-200">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`form-input pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                      !!searchParams.get('email') ? 'cursor-not-allowed bg-white/5' : ''
                    }`}
                    placeholder="Enter your email address"
                    required
                    disabled={isVerifying || !!searchParams.get('email')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-gray-200">Verification Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="form-input pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 text-center tracking-widest text-xl font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={isVerifying}
                    pattern="\d{6}"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <button
                type="submit"
                className={`button-primary w-full py-4 text-lg font-semibold relative overflow-hidden group hover-lift bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 ${
                  isVerifying ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isVerifying}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></span>
                <span className="relative flex items-center justify-center">
                  {isVerifying ? (
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
            </form>
          )}

          {/* Resend Code Button */}
          {(verificationStatus === 'inputting' || verificationStatus === 'error') && (
            <div className="mt-6">
              <button
                onClick={handleResendCode}
                className="w-full py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover-lift disabled:opacity-70"
                disabled={isVerifying || !email}
              >
                <span className="flex items-center justify-center text-gray-300">
                  {isVerifying ? (
                    <>
                      <div className="spinner w-4 h-4 mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      🔄 Resend Code
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
          
          {/* Success Actions */}
          {verificationStatus === 'success' && !passwordNeeded && (
            <div className="mt-8">
              <Link 
                href="/login"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover-lift transition-all duration-300"
              >
                <span className="flex items-center">
                  🔑 Go to Login
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>
          )}

          {/* Password Setup Redirect */}
          {verificationStatus === 'success' && passwordNeeded && (
            <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-center">
                <div className="spinner w-5 h-5 mr-3"></div>
                <span className="text-purple-200">Redirecting to set your password...</span>
              </div>
            </div>
          )}

          {/* Alternative Actions */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-300 mb-4 text-sm">
              Need help or have a different account?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <Link 
                href="/register" 
                className="text-gray-400 hover:text-white transition-colors underline"
              >
                Create New Account
              </Link>
              <Link 
                href="/login" 
                className="text-gray-400 hover:text-white transition-colors underline"
              >
                Back to Login
              </Link>
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