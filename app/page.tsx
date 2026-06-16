'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  parcel_count: number;
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
  thisMonthContributions: number;
  byAim: {
    court_case: number;
    construction: number;
    security: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'contribution' | 'expense' | 'case_step';
  timestamp: number;
  title: string;
  description: string;
  amount?: number;
}

interface EstateMapData {
  id: string;
  image_data: string;
  caption: string | null;
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
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [estateMap, setEstateMap] = useState<EstateMapData | null>(null);
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

          // Fetch activity feed
          try {
            const activityRes = await fetch('/api/activity?limit=10');
            if (activityRes.ok) {
              setActivityFeed(await activityRes.json());
            }
          } catch (err) {
            console.error('Error fetching activity feed:', err);
          }

          // Fetch the estate map (the home screen's centerpiece)
          try {
            const mapRes = await fetch('/api/estate-map');
            if (mapRes.ok) {
              setEstateMap(await mapRes.json());
            }
          } catch (err) {
            console.error('Error fetching estate map:', err);
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
      <main className="max-w-6xl mx-auto p-8">
        {/* The estate map — the reason the group exists, opens the home screen */}
        <section className="mb-8">
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg overflow-hidden">
            {estateMap ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={estateMap.image_data}
                  alt={estateMap.caption || 'Estate survey map'}
                  className="w-full max-h-[420px] object-cover"
                />
                <div className="p-4 flex items-center justify-between">
                  <p className="text-[#16291F] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
                    {estateMap.caption || 'Our estate'}
                  </p>
                  <a href="/land" className="text-[#7C9A5E] font-semibold text-sm hover:underline">
                    View holdings →
                  </a>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <p className="text-[#16291F] text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-fraunces)' }}>
                  The estate map
                </p>
                <p className="text-[#7C9A5E]">
                  No map uploaded yet. The committee can add the survey map from the Land page.
                </p>
                <a href="/land" className="inline-block mt-4 text-[#C79A45] font-semibold hover:underline">
                  Go to Land →
                </a>
              </div>
            )}
          </div>
        </section>

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

                <div className="bg-[#7C9A5E] bg-opacity-10 p-3 rounded text-center">
                  <p className="text-xs text-[#7C9A5E] font-semibold">This Month's Contributions</p>
                  <p className="text-xl font-bold text-[#16291F]">
                    €{fundData.thisMonthContributions.toLocaleString()}
                  </p>
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

        {/* Activity Feed */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Recent Activity</h2>

          {activityFeed.length > 0 ? (
            <div className="space-y-4">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    item.type === 'contribution'
                      ? 'bg-[#7C9A5E] bg-opacity-5 border-[#7C9A5E]'
                      : item.type === 'expense'
                      ? 'bg-[#C79A45] bg-opacity-5 border-[#C79A45]'
                      : 'bg-[#B5532E] bg-opacity-5 border-[#B5532E]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[#16291F]">{item.title}</p>
                    <span className="text-xs text-[#7C9A5E]">
                      {new Date(item.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-[#16291F]">{item.description}</p>
                  {item.amount && (
                    <p
                      className={`text-sm font-semibold mt-2 ${
                        item.type === 'contribution' ? 'text-[#7C9A5E]' : 'text-[#C79A45]'
                      }`}
                    >
                      €{item.amount}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#7C9A5E] text-center py-8">No recent activity</p>
          )}
        </div>

      </main>
    </div>
  );
}
