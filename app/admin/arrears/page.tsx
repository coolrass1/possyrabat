'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ArrearsItem {
  id: string;
  name: string;
  parcel_count: number;
  obligation: number;
  paid: number;
  owed: number;
  status: 'paid' | 'partial' | 'outstanding';
}

interface ArrearsData {
  items: ArrearsItem[];
  total_owed: number;
  currency: string;
}

export default function ArrearsPage() {
  const router = useRouter();
  const [data, setData] = useState<ArrearsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'owed'>('owed');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const sessionData = await res.json();
        if (sessionData.authenticated && (sessionData.member.role === 'committee' || sessionData.member.role === 'owner')) {
          fetchArrears();
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

  const fetchArrears = async () => {
    try {
      const res = await fetch('/api/admin/arrears');
      if (res.ok) {
        const arrData = await res.json();
        const sorted = [...arrData.items];
        if (sortBy === 'owed') {
          sorted.sort((a, b) => b.owed - a.owed);
        } else {
          sorted.sort((a, b) => a.name.localeCompare(b.name));
        }
        setData({ ...arrData, items: sorted });
      }
    } catch (error) {
      console.error('Failed to fetch arrears:', error);
    }
  };

  useEffect(() => {
    if (!isLoading && data) {
      fetchArrears();
    }
  }, [sortBy, isLoading]);

  if (isLoading || !data) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[#7C9A5E] text-[#16291F]';
      case 'partial':
        return 'bg-[#C79A45] text-[#16291F]';
      case 'outstanding':
        return 'bg-[#B5532E] text-[#F3ECDD]';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Member Arrears Report
          </h1>
          <p className="text-lg text-[#C79A45]">Track outstanding contributions and obligations</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A3A2E] p-4 rounded border border-[#C79A45]/50">
            <p className="text-sm text-[#C79A45] font-semibold">Total Outstanding</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>
              {data.total_owed.toFixed(2)} {data.currency}
            </p>
          </div>

          <div className="bg-[#1A3A2E] p-4 rounded border border-[#C79A45]/50">
            <p className="text-sm text-[#C79A45] font-semibold">Members with Arrears</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>
              {data.items.length}
            </p>
          </div>

          <div className="bg-[#1A3A2E] p-4 rounded border border-[#C79A45]/50">
            <p className="text-sm text-[#C79A45] font-semibold">Avg. Outstanding</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>
              {(data.items.length > 0 ? data.total_owed / data.items.length : 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-[#1A3A2E] p-4 rounded border border-[#C79A45]/50">
            <p className="text-sm text-[#C79A45] font-semibold">Total Obligation</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>
              {(data.items.reduce((sum, item) => sum + item.obligation, 0)).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setSortBy('owed')}
            className={`px-4 py-2 rounded font-semibold ${
              sortBy === 'owed'
                ? 'bg-[#C79A45] text-[#16291F]'
                : 'bg-[#1A3A2E] text-[#C79A45] border border-[#C79A45] hover:bg-[#2A4A3E]'
            }`}
          >
            Sort by Amount Owed
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-4 py-2 rounded font-semibold ${
              sortBy === 'name'
                ? 'bg-[#C79A45] text-[#16291F]'
                : 'bg-[#1A3A2E] text-[#C79A45] border border-[#C79A45] hover:bg-[#2A4A3E]'
            }`}
          >
            Sort by Name
          </button>
        </div>

        {/* Arrears Table */}
        <div className="bg-[#1A3A2E] rounded border border-[#C79A45]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F1F1A] border-b border-[#C79A45]/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#C79A45]">Name</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#C79A45]">Parcels</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#C79A45]">Obligation</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#C79A45]">Paid</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#C79A45]">Outstanding</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-[#C79A45]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C79A45]/20">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#C79A45]">
                      No members with outstanding arrears
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#2A4A3E] transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold">{item.name}</td>
                      <td className="px-6 py-4 text-right text-[#C79A45]">{item.parcel_count}</td>
                      <td className="px-6 py-4 text-right">
                        {item.obligation.toFixed(2)} {data.currency}
                      </td>
                      <td className="px-6 py-4 text-right text-[#7C9A5E]">
                        {item.paid.toFixed(2)} {data.currency}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[#B5532E]">
                        {item.owed.toFixed(2)} {data.currency}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded text-sm font-semibold capitalize ${getStatusBadgeColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
