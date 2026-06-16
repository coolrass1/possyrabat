'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuditEntry } from '@/lib/types';

const ENTITY_TYPES = ['contribution', 'expense', 'case', 'case_step', 'member', 'parcel'];

interface AuditLogsResponse {
  entries: AuditEntry[];
  total: number;
}

export default function AuditPage() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [entityType, setEntityType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: limit.toString(), offset: (page * limit).toString() });
      if (entityType) params.append('entity_type', entityType);
      if (startDate) params.append('start_date', new Date(startDate).getTime().toString());
      if (endDate) params.append('end_date', new Date(endDate).getTime().toString());

      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) {
        if (res.status === 403) router.push('/');
        return;
      }

      const data: AuditLogsResponse = await res.json();
      setAuditLogs(data.entries);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setUserRole(data.member.role);
          if (data.member.role === 'member') {
            router.push('/');
          }
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

  useEffect(() => {
    if (userRole && userRole !== 'member') {
      fetchAuditLogs();
    }
  }, [page, entityType, startDate, endDate, userRole]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDiff = (before: Record<string, any> | null, after: Record<string, any>) => {
    if (!before) {
      return (
        <div className="text-xs text-[#7C9A5E]">
          {Object.entries(after).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="text-xs space-y-1">
        {Object.keys(before).map((key) => (
          <div key={key}>
            <span className="font-semibold">{key}:</span>
            <span className="text-[#B5532E]"> {JSON.stringify(before[key])}</span>
            {' → '}
            <span className="text-[#7C9A5E]">{JSON.stringify(after[key])}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16291F]">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  if (userRole === 'member') {
    return null;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
          <div className="flex gap-4">
            <a href="/" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">
              Home
            </a>
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

      <main className="max-w-7xl mx-auto p-8">
        <h2 className="text-3xl font-bold text-[#F3ECDD] mb-8 font-serif">Audit Log</h2>

        {/* Filters */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-[#16291F] mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#16291F] mb-2">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
              >
                <option value="">All Types</option>
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#16291F] mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#16291F] mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setEntityType('');
                  setStartDate('');
                  setEndDate('');
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <p className="text-sm text-[#7C9A5E] mb-4">
            Showing {auditLogs.length === 0 ? 0 : page * limit + 1} to{' '}
            {Math.min((page + 1) * limit, total)} of {total} entries
          </p>

          {auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border-l-4 bg-white"
                  style={{
                    borderColor:
                      entry.action === 'created'
                        ? '#7C9A5E'
                        : entry.action === 'updated'
                        ? '#C79A45'
                        : '#B5532E',
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#16291F]">
                        {entry.entity_type.toUpperCase()} • {entry.entity_id}
                      </p>
                      <p className="text-sm text-[#7C9A5E]">
                        Action: <span className="font-semibold capitalize">{entry.action}</span>
                      </p>
                    </div>
                    <span className="text-xs text-[#7C9A5E]">{formatDate(entry.created_at)}</span>
                  </div>

                  <div className="bg-[#F9F5F0] p-3 rounded mb-2">
                    {renderDiff(entry.before_values, entry.after_values)}
                  </div>

                  <p className="text-xs text-[#7C9A5E]">
                    Performed by: <span className="font-semibold">{entry.performed_by}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#7C9A5E] py-8">No audit entries found</p>
          )}

          {/* Pagination */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <span className="text-[#F3ECDD]">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
