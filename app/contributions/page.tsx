'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contribution {
  id: string;
  amount: number;
  date: number;
  method?: string;
  notes?: string;
  recorded_by: string;
}

interface History {
  items: Contribution[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Standing {
  parcel_count: number;
  per_parcel_fee: number;
  obligation: number;
  paid: number;
  balance: number;
  status: string;
  currency: string;
}

export default function ContributionsPage() {
  const router = useRouter();
  const [history, setHistory] = useState<History | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/contributions/my-history?page=${page}&limit=10`);
        if (!res.ok) {
          router.push('/login');
          return;
        }
        setHistory(await res.json());
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [page, router]);

  useEffect(() => {
    const fetchStanding = async () => {
      try {
        const res = await fetch('/api/contributions/my-standing');
        if (res.ok) {
          setStanding(await res.json());
        }
      } catch (err) {
        console.error('Error fetching standing:', err);
      }
    };

    fetchStanding();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
          <div className="flex gap-4">
            <a href="/" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Home</a>
            <a href="/land" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Land</a>
            <a href="/profile" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Profile</a>
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
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {standing && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-[#16291F] mb-2 font-serif">My Standing</h2>
            <p className="text-[#7C9A5E] mb-6">
              For your {standing.parcel_count} parcels you owe €{standing.obligation.toFixed(2)};
              {' '}paid €{standing.paid.toFixed(2)}.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Obligation</p>
                <p className="text-2xl font-bold text-[#16291F]">€{standing.obligation.toFixed(2)}</p>
                <p className="text-xs text-[#7C9A5E] mt-1">
                  {standing.parcel_count} × €{standing.per_parcel_fee}/parcel
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Paid</p>
                <p className="text-2xl font-bold text-[#C79A45]">€{standing.paid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${
                    standing.balance >= 0 ? 'bg-[#7C9A5E]' : 'bg-[#B5532E]'
                  }`}
                >
                  {standing.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-[#16291F] mb-6 font-serif">Contribution History</h2>

          {history && history.items.length > 0 ? (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#C79A45]">
                      <th className="text-left py-3 text-[#16291F] font-semibold">Date</th>
                      <th className="text-right py-3 text-[#16291F] font-semibold">Amount</th>
                      <th className="text-left py-3 text-[#16291F] font-semibold">Method</th>
                      <th className="text-left py-3 text-[#16291F] font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((contrib) => (
                      <tr key={contrib.id} className="border-b border-[#E8DCC8] hover:bg-[#F9F5F0]">
                        <td className="py-3 text-[#16291F]">
                          {new Date(contrib.date).toLocaleDateString()}
                        </td>
                        <td className="text-right py-3 text-[#16291F] font-semibold text-[#C79A45]">
                          €{contrib.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-[#16291F] capitalize">{contrib.method || '—'}</td>
                        <td className="py-3 text-[#7C9A5E] text-sm">{contrib.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {history.pages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: history.pages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`px-4 py-2 rounded-md transition ${
                        page === i + 1
                          ? 'bg-[#7C9A5E] text-white'
                          : 'bg-[#E8DCC8] text-[#16291F] hover:bg-[#D8CCC8]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[#7C9A5E]">No contributions recorded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
