'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Case {
  id: string;
  title: string;
  stage: string;
  next_hearing_date: number | null;
  opposing_party: string;
}

interface FundData {
  balance: number;
  totalContributions: number;
  totalExpenses: number;
  byAim: {
    court_case: number;
    construction: number;
    security: number;
  };
}

const AIM_LABELS: Record<string, string> = {
  court_case: 'Court Case',
  construction: 'Construction',
  security: 'Security',
};

export default function Home() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated) {
          setMember(data.member);

          // Fetch case data for countdown
          try {
            const casesRes = await fetch('/api/case');
            if (casesRes.ok) {
              const cases = await casesRes.json();
              if (Array.isArray(cases) && cases.length > 0) {
                setCaseData(cases[0]);
              }
            }
          } catch (err) {
            console.error('Error fetching case:', err);
          }

          // Fetch fund data
          try {
            const fundRes = await fetch('/api/fund');
            if (fundRes.ok) {
              setFundData(await fundRes.json());
            }
          } catch (err) {
            console.error('Error fetching fund data:', err);
          }
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
        {/* Five Pillars Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Pillar 1: Case Status */}
          {caseData && (
            <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#16291F] mb-4 font-serif">The Court Case</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Status</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[#16291F] font-semibold">{caseData.title}</p>
                    <span className="px-3 py-1 bg-[#B5532E] text-white rounded-full text-xs font-semibold">
                      {caseData.stage}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Opponent</p>
                  <p className="text-[#16291F]">{caseData.opposing_party}</p>
                </div>
                {caseData.next_hearing_date && (
                  <div className="bg-[#B5532E] bg-opacity-10 p-3 rounded border-l-4 border-[#B5532E]">
                    <p className="text-sm text-[#B5532E] font-semibold">Next Hearing</p>
                    <p className="text-[#16291F] font-semibold">
                      {new Date(caseData.next_hearing_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-[#7C9A5E]">
                      {Math.ceil((caseData.next_hearing_date - Date.now()) / (1000 * 60 * 60 * 24))} days from now
                    </p>
                  </div>
                )}
                <a href="/case" className="text-[#B5532E] font-semibold text-sm hover:underline">
                  View Full Case →
                </a>
              </div>
            </div>
          )}

          {/* Pillar 2: Fund & Balance */}
          {fundData && (
            <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#16291F] mb-4 font-serif">Shared Fund</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-[#7C9A5E] font-semibold mb-1">Current Balance</p>
                  <p className="text-4xl font-bold text-[#C79A45]">€{fundData.balance.toLocaleString()}</p>
                </div>

                {/* Three-way allocation bars */}
                <div className="space-y-2">
                  {Object.entries(fundData.byAim).map(([aim, amount]) => {
                    const percent = fundData.totalExpenses > 0 ? (amount / fundData.totalExpenses) * 100 : 0;
                    return (
                      <div key={aim}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-[#16291F]">
                            {AIM_LABELS[aim]}
                          </span>
                          <span className="text-xs text-[#7C9A5E]">€{amount}</span>
                        </div>
                        <div className="w-full bg-[#E8DCC8] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              aim === 'court_case'
                                ? 'bg-[#B5532E]'
                                : aim === 'construction'
                                ? 'bg-[#C79A45]'
                                : 'bg-[#7C9A5E]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-[#7C9A5E] pt-2 border-t border-[#E8DCC8]">
                  <p>In: €{fundData.totalContributions.toLocaleString()}</p>
                  <p>Out: €{fundData.totalExpenses.toLocaleString()}</p>
                </div>

                <a href="/spending" className="text-[#C79A45] font-semibold text-sm hover:underline block">
                  View Full Ledger →
                </a>
              </div>
            </div>
          )}

          {/* Pillar 3: My Parcels */}
          {member && (
            <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#16291F] mb-4 font-serif">My Land Holdings</h3>
              <div className="space-y-3">
                <div className="bg-[#7C9A5E] bg-opacity-10 p-4 rounded border-l-4 border-[#7C9A5E]">
                  <p className="text-sm text-[#7C9A5E] font-semibold">Parcels Held</p>
                  <p className="text-3xl font-bold text-[#16291F]">{member.parcel_count}</p>
                </div>
                <a href="/land" className="text-[#7C9A5E] font-semibold text-sm hover:underline">
                  View Estate Map →
                </a>
              </div>
            </div>
          )}
        </div>

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
