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

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  parcel_count: number;
  obligation: number;
  paid: number;
  balance: number;
  status: string;
}

export default function ContributionsPage() {
  const router = useRouter();
  const [history, setHistory] = useState<History | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof RosterEntry>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    member_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'cash',
    notes: '',
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshRoster = async () => {
    try {
      const res = await fetch('/api/contributions/open-roster?limit=100');
      if (res.ok) {
        const data = await res.json();
        setRoster(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching roster:', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!paymentForm.member_id) {
      setPaymentError('Select a member');
      return;
    }
    const amount = parseFloat(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: paymentForm.member_id,
          amount,
          date: new Date(paymentForm.date).getTime(),
          method: paymentForm.method,
          notes: paymentForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || 'Failed to record payment');
        return;
      }

      setPaymentForm({
        member_id: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        method: 'cash',
        notes: '',
      });
      setShowPaymentForm(false);
      await refreshRoster();
    } catch (err) {
      console.error('Error recording payment:', err);
      setPaymentError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSort = (key: keyof RosterEntry) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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

  useEffect(() => {
    refreshRoster();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUserRole(data.member.role);
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      }
    };

    fetchRole();
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

        {/* Record payment — committee/owner only */}
        {userRole && userRole !== 'member' && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#16291F] font-serif">Record a Payment</h2>
              <button
                onClick={() => setShowPaymentForm((s) => !s)}
                className="px-4 py-2 rounded-md bg-[#7C9A5E] text-white hover:bg-[#6a8650] transition"
              >
                {showPaymentForm ? 'Cancel' : 'Record Payment'}
              </button>
            </div>

            {showPaymentForm && (
              <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentError && (
                  <p className="md:col-span-2 text-[#B5532E] text-sm">{paymentError}</p>
                )}
                <select
                  required
                  value={paymentForm.member_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, member_id: e.target.value })}
                  className="px-4 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                >
                  <option value="">Select member…</option>
                  {roster.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="Amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="px-4 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                />
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="px-4 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                />
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="px-4 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="other">Other</option>
                </select>
                <input
                  placeholder="Notes (optional)"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="px-4 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] md:col-span-2"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-[#C79A45] text-white hover:bg-[#b58a3a] transition disabled:opacity-50 md:col-span-2"
                >
                  {submitting ? 'Recording…' : 'Record Payment'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Open roster — transparent accountability view */}
        {roster.length > 0 && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#16291F] font-serif">Open Roster</h2>
              <input
                type="search"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search member…"
                className="px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#C79A45]">
                    {([
                      ['name', 'Member', 'left'],
                      ['parcel_count', 'Parcels', 'right'],
                      ['obligation', 'Obligation', 'right'],
                      ['paid', 'Paid', 'right'],
                      ['status', 'Status', 'left'],
                    ] as [keyof RosterEntry, string, 'left' | 'right'][]).map(([key, label, align]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className={`py-3 text-[#16291F] font-semibold cursor-pointer select-none hover:text-[#C79A45] text-${align}${
                          key === 'status' ? ' pl-6' : ''
                        }`}
                      >
                        {label}
                        {sortKey === key && (
                          <span className="ml-1 text-[#C79A45]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster
                    .filter((m) =>
                      (m.name || '').toLowerCase().includes(rosterSearch.toLowerCase())
                    )
                    .slice()
                    .sort((a, b) => {
                      const av = a[sortKey];
                      const bv = b[sortKey];
                      let cmp: number;
                      if (typeof av === 'number' && typeof bv === 'number') {
                        cmp = av - bv;
                      } else {
                        cmp = String(av).localeCompare(String(bv));
                      }
                      return sortDir === 'asc' ? cmp : -cmp;
                    })
                    .map((m) => (
                      <tr key={m.id} className="border-b border-[#E8DCC8] hover:bg-[#F9F5F0]">
                        <td className="py-3 text-[#16291F]">
                          <div>{m.name}</div>
                          <div className="text-xs text-[#7C9A5E]">{m.email}</div>
                        </td>
                        <td className="text-right py-3 text-[#16291F]">{m.parcel_count}</td>
                        <td className="text-right py-3 font-mono text-[#16291F]">€{m.obligation.toFixed(2)}</td>
                        <td className="text-right py-3 font-mono text-[#C79A45]">€{m.paid.toFixed(2)}</td>
                        <td className="py-3 pl-6">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${
                              m.balance >= 0 ? 'bg-[#7C9A5E]' : 'bg-[#B5532E]'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
