'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to dashboard on success
      router.push('/');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#16291F] to-[#0d1a13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#16291F] mb-2 font-serif">Possyrabat</h1>
          <p className="text-[#7C9A5E] mb-8">Member Association Portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#B5532E] text-white px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#16291F] mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                placeholder="alice@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#16291F] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#7C9A5E] text-white py-2 rounded-md font-medium hover:bg-[#6d8a50] disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#16291F]">
            Contact your committee administrator for access
          </p>
        </div>
      </div>
    </div>
  );
}
