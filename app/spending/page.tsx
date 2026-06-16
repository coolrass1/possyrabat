'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Balance {
  total_in: number;
  total_out: number;
  balance: number;
  currency: string;
}

interface LedgerItem {
  id: string;
  description: string;
  amount: number;
  aim: string;
  date: number;
  receipt_url?: string;
}

interface Ledger {
  court_case: number;
  construction: number;
  security: number;
  general: number;
  total: number;
  currency: string;
  percentages: Record<string, number>;
  items: LedgerItem[];
}

interface Custodian {
  custodian_name: string | null;
  account_masked: string | null;
  last_reconciled_at: number | null;
}

const AIM_LABELS: Record<string, string> = {
  court_case: 'Court Case',
  construction: 'Construction',
  security: 'Security',
  general: 'General',
};

const AIM_COLORS: Record<string, string> = {
  court_case: '#B5532E',
  construction: '#C79A45',
  security: '#7C9A5E',
  general: '#6B7280',
};

export default function SpendingPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [custodian, setCustodian] = useState<Custodian | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const balRes = await fetch('/api/fund/balance');
        if (!balRes.ok) {
          router.push('/login');
          return;
        }
        setBalance(await balRes.json());

        const ledRes = await fetch('/api/expenses/ledger');
        if (ledRes.ok) setLedger(await ledRes.json());

        const custRes = await fetch('/api/fund/custodian');
        if (custRes.ok) setCustodian(await custRes.json());
      } catch (err) {
        console.error('Error fetching spending data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  const aims = ['court_case', 'construction', 'security', 'general'];

  return (
    <div className="min-h-screen bg-[#16291F]">

      <main className="max-w-6xl mx-auto p-8">
        {/* Balance hero */}
        {balance && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">The Fund</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total In</p>
                <p className="text-2xl font-mono text-[#16291F]">€{balance.total_in.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total Out</p>
                <p className="text-2xl font-mono text-[#B5532E]">€{balance.total_out.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Balance</p>
                <p className="text-4xl font-mono font-bold text-[#C79A45]">€{balance.balance.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-[#7C9A5E] mt-4">
              In − Out = Balance · €{balance.total_in.toFixed(2)} − €{balance.total_out.toFixed(2)} = €
              {balance.balance.toFixed(2)}
            </p>
          </div>
        )}

        {/* Three-way allocation */}
        {ledger && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Spending by Aim</h2>
            <div className="space-y-4">
              {aims.map((aim) => {
                const amount = (ledger as any)[aim] as number;
                const pct = ledger.percentages?.[aim] ?? 0;
                return (
                  <div key={aim}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#16291F] font-medium">{AIM_LABELS[aim]}</span>
                      <span className="text-[#16291F] font-mono">
                        €{amount.toFixed(2)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E8DCC8] rounded-full h-3">
                      <div
                        className="h-3 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: AIM_COLORS[aim] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custodian panel */}
        {custodian && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">Custodian</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Held at</p>
                <p className="text-lg text-[#16291F]">{custodian.custodian_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Account</p>
                <p className="text-lg font-mono text-[#16291F]">{custodian.account_masked || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Last reconciled</p>
                <p className="text-lg text-[#16291F]">
                  {custodian.last_reconciled_at
                    ? new Date(custodian.last_reconciled_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Itemized ledger */}
        {ledger && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Spending Ledger</h2>
            {ledger.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#C79A45]">
                      <th className="text-left py-3 text-[#16291F] font-semibold">Date</th>
                      <th className="text-left py-3 text-[#16291F] font-semibold">Description</th>
                      <th className="text-left py-3 text-[#16291F] font-semibold">Aim</th>
                      <th className="text-right py-3 text-[#16291F] font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.items.map((item) => (
                      <tr key={item.id} className="border-b border-[#E8DCC8] hover:bg-[#F9F5F0]">
                        <td className="py-3 text-[#16291F]">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-3 text-[#16291F]">{item.description}</td>
                        <td className="py-3">
                          <span
                            className="inline-block px-2 py-1 rounded-full text-xs text-white"
                            style={{ backgroundColor: AIM_COLORS[item.aim] }}
                          >
                            {AIM_LABELS[item.aim]}
                          </span>
                        </td>
                        <td className="text-right py-3 font-mono text-[#16291F]">€{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[#7C9A5E]">No expenses recorded yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
