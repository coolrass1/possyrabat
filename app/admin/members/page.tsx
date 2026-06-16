'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  role: 'member' | 'committee' | 'owner';
  parcel_count: number;
  status: string;
}

export default function MembersAdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member', parcel_count: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && (data.member.role === 'committee' || data.member.role === 'owner')) {
          setMyRole(data.member.role);
          await fetchMembers();
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

  const fetchMembers = async () => {
    const res = await fetch('/api/admin/members');
    if (res.ok) setMembers(await res.json());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: '', email: '', password: '', role: 'member', parcel_count: 0 });
      setShowForm(false);
      await fetchMembers();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create member');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    setError(null);
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) await fetchMembers();
    else setError((await res.json()).error || 'Failed to change role');
  };

  const handleDeactivate = async (id: string, name: string | null) => {
    if (!confirm(`Deactivate ${name || 'this member'}? Their records are preserved.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchMembers();
    else setError((await res.json()).error || 'Failed to deactivate member');
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const isOwner = myRole === 'owner';

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Members
            </h1>
            <p className="text-[#C79A45]">Roster, roles, and parcel holdings</p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-[#C79A45] text-[#16291F] rounded font-semibold hover:bg-[#b8894a]"
            >
              {showForm ? 'Cancel' : 'Add Member'}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-[#B5532E] text-[#F3ECDD] text-sm">{error}</div>
        )}

        {isOwner && showForm && (
          <form onSubmit={handleCreate} className="bg-[#1A3A2E] p-6 rounded mb-8 border border-[#C79A45] grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <input required type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <input required type="password" placeholder="Temporary password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <input type="number" min={0} placeholder="Parcels" value={form.parcel_count}
              onChange={(e) => setForm({ ...form, parcel_count: Number(e.target.value) })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded">
              <option value="member">Member</option>
              <option value="committee">Committee</option>
              <option value="owner">Owner</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-[#7C9A5E] text-[#16291F] rounded font-semibold hover:bg-[#6b8950]">
              Create
            </button>
          </form>
        )}

        <div className="bg-[#1A3A2E] rounded border border-[#C79A45]/50 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1a13] border-b border-[#C79A45]/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">Email</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#C79A45]">Parcels</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">Role</th>
                {isOwner && <th className="px-4 py-3 text-center text-sm font-semibold text-[#C79A45]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C79A45]/20">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-[#2A4A3E]">
                  <td className="px-4 py-3 font-semibold">{m.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">{m.email}</td>
                  <td className="px-4 py-3 text-right font-figure">{m.parcel_count}</td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="px-2 py-1 bg-[#16291F] border border-[#C79A45] rounded text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="committee">Committee</option>
                        <option value="owner">Owner</option>
                      </select>
                    ) : (
                      <span className="capitalize">{m.role}</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeactivate(m.id, m.name)}
                        className="px-3 py-1 bg-[#B5532E] text-[#F3ECDD] rounded text-sm font-semibold hover:bg-[#9d4520]"
                      >
                        Deactivate
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
