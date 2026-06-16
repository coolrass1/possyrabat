'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface EmailLogRow {
  id: string;
  to: string;
  subject: string;
  status: string;
  created_at: number;
}

export default function EmailAdminPage() {
  const router = useRouter();
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && (data.member.role === 'committee' || data.member.role === 'owner')) {
          await fetchLog();
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  const fetchLog = async () => {
    const res = await fetch('/api/admin/email');
    if (res.ok) setLog(await res.json());
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNotice(null);
    const res = await fetch('/api/admin/email/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotice(`Broadcast sent to ${data.sent} member${data.sent === 1 ? '' : 's'}.`);
      setSubject('');
      setBody('');
      await fetchLog();
    } else {
      setNotice((await res.json()).error || 'Failed to broadcast');
    }
    setSending(false);
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Email
        </h1>
        <p className="text-[#C79A45] mb-6">Broadcast to members and review the transparency log</p>

        {notice && <div className="mb-4 p-3 rounded bg-[#7C9A5E] text-[#16291F] text-sm font-semibold">{notice}</div>}

        <form onSubmit={handleBroadcast} className="bg-[#1A3A2E] p-6 rounded mb-8 border border-[#C79A45] space-y-4">
          <input
            required
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded"
          />
          <textarea
            required
            placeholder="Message to all members…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 bg-[#C79A45] text-[#16291F] rounded font-semibold hover:bg-[#b8894a] disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Broadcast to all members'}
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Email log
        </h2>
        <div className="bg-[#1A3A2E] rounded border border-[#C79A45]/50 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1a13] border-b border-[#C79A45]/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">When</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">Subject</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[#C79A45]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C79A45]/20">
              {log.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#C79A45]">No emails sent yet</td></tr>
              ) : (
                log.map((row) => (
                  <tr key={row.id} className="hover:bg-[#2A4A3E]">
                    <td className="px-4 py-3 text-sm text-[#C79A45]">
                      {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.to}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{row.subject}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-[#7C9A5E] text-[#16291F] capitalize">{row.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
