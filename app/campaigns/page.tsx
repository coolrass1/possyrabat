'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CampaignRow {
  id: string;
  name: string;
  purpose: string | null;
  aim: string;
  target_amount: number;
  deadline: number | null;
  status: string;
  progress: { raised: number; target: number; percent: number };
}

const AIM_LABELS: Record<string, string> = {
  court_case: 'Court Case',
  construction: 'Construction',
  security: 'Security',
  general: 'General',
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    purpose: '',
    aim: 'court_case',
    target_amount: 1000,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setRole(data.member.role);
          await fetchCampaigns();
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

  const fetchCampaigns = async () => {
    const res = await fetch('/api/campaigns');
    if (res.ok) setCampaigns(await res.json());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        target_amount: Number(form.target_amount),
        deadline: form.deadline ? new Date(form.deadline).getTime() : null,
      }),
    });
    if (res.ok) {
      setForm({ name: '', purpose: '', aim: 'court_case', target_amount: 1000, deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
      setShowForm(false);
      await fetchCampaigns();
    }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchCampaigns();
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const isCommittee = role === 'committee' || role === 'owner';

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Campaigns</h1>
            <p className="text-[#C79A45]">Time-bound funding pushes for our shared aims</p>
          </div>
          {isCommittee && (
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-[#C79A45] text-[#16291F] rounded font-semibold hover:bg-[#b8894a]">
              {showForm ? 'Cancel' : 'New Campaign'}
            </button>
          )}
        </div>

        {isCommittee && showForm && (
          <form onSubmit={handleCreate} className="bg-[#1A3A2E] p-6 rounded mb-8 border border-[#C79A45] grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded md:col-span-2" />
            <input placeholder="Purpose" value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded md:col-span-2" />
            <select value={form.aim} onChange={(e) => setForm({ ...form, aim: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded">
              <option value="court_case">Court Case</option>
              <option value="construction">Construction</option>
              <option value="security">Security</option>
              <option value="general">General</option>
            </select>
            <input type="number" min={1} placeholder="Target (€)" value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <input type="date" value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <button type="submit" className="px-4 py-2 bg-[#7C9A5E] text-[#16291F] rounded font-semibold md:col-span-2">Create</button>
          </form>
        )}

        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 bg-[#1A3A2E] rounded border border-[#7C9A5E]/30">
              <p className="text-[#C79A45]">No campaigns yet</p>
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="bg-[#1A3A2E] p-6 rounded border border-[#C79A45]/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>{c.name}</h2>
                    <p className="text-sm text-[#C79A45]">{AIM_LABELS[c.aim]}{c.deadline ? ` · by ${new Date(c.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                    c.status === 'active' ? 'bg-[#7C9A5E] text-[#16291F]' : c.status === 'completed' ? 'bg-[#C79A45] text-[#16291F]' : 'bg-[#B5532E] text-[#F3ECDD]'
                  }`}>{c.status}</span>
                </div>
                {c.purpose && <p className="text-[#F3ECDD]/80 mb-4">{c.purpose}</p>}

                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-figure">€{c.progress.raised.toLocaleString()} raised</span>
                  <span className="text-[#C79A45] font-figure">of €{c.progress.target.toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#16291F] rounded h-4 overflow-hidden">
                  <div className="h-full bg-[#C79A45] transition-all" style={{ width: `${Math.min(100, c.progress.percent)}%` }} />
                </div>
                <p className="text-right text-xs text-[#C79A45] mt-1 font-figure">{c.progress.percent}%</p>

                {isCommittee && c.status === 'active' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setStatus(c.id, 'completed')}
                      className="px-3 py-1.5 bg-[#7C9A5E] text-[#16291F] rounded text-sm font-semibold">Mark completed</button>
                    <button onClick={() => setStatus(c.id, 'cancelled')}
                      className="px-3 py-1.5 bg-[#B5532E] text-[#F3ECDD] rounded text-sm font-semibold">Cancel</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
