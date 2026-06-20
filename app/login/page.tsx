'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, Lock, Mail, AlertCircle } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

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
        <Card className="border border-[#e8dcc8]/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-[#16291F]/10 flex items-center justify-center text-[#C79A45]">
                <Sprout className="h-6 w-6 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl font-serif text-[#16291F]">Possyrabat</CardTitle>
            <CardDescription className="text-sm text-[#7C9A5E] mt-1">
              Member Association Portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/60" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="name@domain.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/60" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="moss"
                disabled={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-[#e8dcc8]/20 pt-4">
            <p className="text-center text-xs text-[#7C9A5E]">
              Contact your committee administrator for credential access
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
