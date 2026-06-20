'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useLanguage } from '@/app/components/LanguageProvider';

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('changePassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('changePassword.mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || t('changePassword.failed'));
        return;
      }

      router.replace('/');
    } catch {
      setError(t('changePassword.failed'));
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
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-3xl font-serif text-[#16291F]">
              {t('changePassword.title')}
            </CardTitle>
            <CardDescription className="text-sm text-[#7C9A5E] mt-1">
              {t('changePassword.subtitle')}
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
                <Label htmlFor="password">{t('changePassword.newPassword')}</Label>
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

              <div className="space-y-1">
                <Label htmlFor="confirm">{t('changePassword.confirm')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/60" />
                  <Input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" variant="moss" disabled={isLoading} className="w-full mt-2">
                {isLoading ? t('changePassword.saving') : t('changePassword.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
