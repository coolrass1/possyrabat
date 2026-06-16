'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StatementSummary {
  id: string;
  year: number;
  month: number;
  total_in: number;
  total_out: number;
  balance: number;
  created_at: number;
}

export default function StatementsPage() {
  const router = useRouter();
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [generatingMonth, setGeneratingMonth] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setUserRole(data.member.role);
          fetchStatements();
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const fetchStatements = async () => {
    try {
      const res = await fetch('/api/statements');
      if (res.ok) {
        setStatements(await res.json());
      }
    } catch (err) {
      console.error('Error fetching statements:', err);
    }
  };

  const handleGenerateStatement = async (year: number, month: number, sendEmails: boolean) => {
    try {
      setGeneratingMonth({ year, month });
      const res = await fetch('/api/statements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, send_emails: sendEmails }),
      });

      if (res.ok) {
        await fetchStatements();
        alert(`Statement generated for ${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${sendEmails ? ' and emails sent!' : '!'}`);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error generating statement:', err);
      alert('Failed to generate statement');
    } finally {
      setGeneratingMonth(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const downloadStatement = (id: string, monthName: string) => {
    window.location.href = `/api/statements/${id}`;
  };

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
          <div className="flex gap-4">
            <a href="/" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Home</a>
            <a href="/contributions" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Contributions</a>
            <a href="/spending" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Spending</a>
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
        <h2 className="text-3xl font-bold text-[#F3ECDD] mb-8 font-serif">Monthly Statements</h2>

        {/* Generate Statement (Committee Only) */}
        {userRole !== 'member' && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-lg font-semibold text-[#16291F] mb-4">Generate Statement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Year</label>
                <input
                  type="number"
                  id="year"
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Month</label>
                <select
                  id="month"
                  defaultValue={new Date().getMonth()}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-end">
                <button
                  onClick={() => {
                    const year = parseInt((document.getElementById('year') as HTMLInputElement).value);
                    const month = parseInt((document.getElementById('month') as HTMLSelectElement).value);
                    handleGenerateStatement(year, month, false);
                  }}
                  disabled={!!generatingMonth}
                  className="flex-1 px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] disabled:opacity-50 transition-colors"
                >
                  {generatingMonth ? 'Generating...' : 'Generate'}
                </button>
                <button
                  onClick={() => {
                    const year = parseInt((document.getElementById('year') as HTMLInputElement).value);
                    const month = parseInt((document.getElementById('month') as HTMLSelectElement).value);
                    handleGenerateStatement(year, month, true);
                  }}
                  disabled={!!generatingMonth}
                  className="flex-1 px-4 py-2 bg-[#C79A45] text-white rounded-md hover:bg-[#b3892f] disabled:opacity-50 transition-colors"
                >
                  {generatingMonth ? 'Sending...' : '+ Send Emails'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statements List */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-semibold text-[#16291F] mb-6">Available Statements</h3>

          {statements.length > 0 ? (
            <div className="space-y-3">
              {statements.map((stmt) => {
                const monthName = new Date(stmt.year, stmt.month).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <div key={stmt.id} className="p-4 rounded-lg border border-[#E8DCC8] hover:bg-[#F9F5F0] transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-[#16291F]">{monthName}</p>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-[#7C9A5E]">In</p>
                            <p className="font-semibold text-[#16291F]">€{stmt.total_in.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[#7C9A5E]">Out</p>
                            <p className="font-semibold text-[#16291F]">€{stmt.total_out.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[#7C9A5E]">Balance</p>
                            <p className="font-semibold text-[#16291F]">€{stmt.balance.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-[#7C9A5E] mt-2">Generated {formatDate(stmt.created_at)}</p>
                      </div>
                      <button
                        onClick={() => downloadStatement(stmt.id, monthName)}
                        className="ml-4 px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[#7C9A5E] py-8">No statements available yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
