'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Use the login function from AuthContext
      login({
        token: data.token,
        userId: data.user._id,
        role: data.user.role,
        isAdmin: data.user.isAdmin,
      });

      // Redirect based on user role or admin status
      if (data.user.isAdmin) {
        router.push('/dashboard/admin');
      } else if (data.user.role === 'doctor') {
        router.push('/dashboard/doctor');
      } else {
        router.push('/dashboard/patient');
      }
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow-lg rounded-lg border">
      <h2 className="text-2xl font-bold text-center mb-4">Login</h2>
      
      {error && (
        <p className="text-red-600 bg-red-100 p-2 rounded text-center mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          className="w-full p-3 border rounded-lg shadow-sm text-gray-900 focus:ring focus:ring-blue-300"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-3 border rounded-lg shadow-sm text-gray-900 focus:ring focus:ring-blue-300"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
          Login
        </button>
      </form>
    </div>
  );
}
