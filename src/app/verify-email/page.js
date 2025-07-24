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

  useEffect(() => {
    // Get email from URL parameters
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setMessage(`Enter the 6-digit verification code sent to ${emailParam}`);
    }
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
          <div className="text-blue-500 p-4 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        );
      case 'verifying':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        );
      case 'success':
        return (
          <div className="bg-green-100 text-green-700 p-4 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-100 text-red-700 p-4 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md w-96 text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Email Verification</h2>
        
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>

        {(verificationStatus === 'inputting' || verificationStatus === 'error') && (
          <form onSubmit={handleVerification} className="mb-6">
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1 text-left">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
                disabled={isVerifying || !!searchParams.get('email')}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1 text-left">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-xl"
                required
                disabled={isVerifying}
                pattern="\d{6}"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 font-medium disabled:opacity-70"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}

        {(verificationStatus === 'inputting' || verificationStatus === 'error') && (
          <div className="mt-4">
            <button
              onClick={handleResendCode}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition duration-200 font-medium disabled:opacity-70"
              disabled={isVerifying || !email}
            >
              {isVerifying ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        )}
        
        {verificationStatus === 'success' && !passwordNeeded && (
          <div className="flex justify-center">
            <Link href="/login">
              <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200">
                Go to Login
              </button>
            </Link>
          </div>
        )}

        {verificationStatus === 'success' && passwordNeeded && (
          <p className="text-gray-700 dark:text-gray-300">
            Redirecting to set your password...
          </p>
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