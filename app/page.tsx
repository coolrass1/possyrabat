'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function Home() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated) {
          setMember(data.member);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16291F]">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
            }}
            className="px-4 py-2 bg-[#B5532E] hover:bg-[#9d4520] rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-[#16291F] mb-4 font-serif">Welcome</h2>
          {member && (
            <div className="space-y-4 text-[#16291F]">
              <p>
                <span className="font-semibold">Name:</span> {member.name || 'Not set'}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {member.email}
              </p>
              <p>
                <span className="font-semibold">Role:</span>{' '}
                <span className="capitalize px-3 py-1 bg-[#7C9A5E] text-white rounded-full text-sm">
                  {member.role}
                </span>
              </p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-[#C79A45]">
            <p className="text-[#7C9A5E]">
              The platform is currently being built. More features coming soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
