'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, Key, Layers, ArrowLeft, BadgeAlert, ShieldAlert } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Member Roster...</p>
        </div>
      </div>
    );
  }

  const isOwner = myRole === 'owner';

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Member Registry</h1>
              <p className="text-[#7C9A5E] text-sm mt-0.5">Manage co-op profiles, permissions, roles, and parcel counts.</p>
            </div>
          </div>
          {isOwner && (
            <Button variant="brass" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Register Member'}
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E] flex items-center gap-2">
            <BadgeAlert className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Register Member Form */}
        {isOwner && showForm && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif">Add Cooperative Profile</CardTitle>
              </div>
              <CardDescription>Setup coordinate handles, initial temporary login keys, and parcel counts</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#16291F]">
                <div>
                  <Label htmlFor="member-name">Full Name</Label>
                  <Input
                    id="member-name"
                    required
                    placeholder="Alice Cooper"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-email">Email Coordinate</Label>
                  <Input
                    id="member-email"
                    required
                    type="email"
                    placeholder="alice@domain.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-password">Temporary Password</Label>
                  <Input
                    id="member-password"
                    required
                    type="password"
                    placeholder="Temporary login key"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-parcels">Assigned Parcels</Label>
                  <Input
                    id="member-parcels"
                    type="number"
                    min={0}
                    placeholder="Number of parcels"
                    value={form.parcel_count}
                    onChange={(e) => setForm({ ...form, parcel_count: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-role">Registry Permission Role</Label>
                  <Select
                    id="member-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="member">Member</option>
                    <option value="committee">Committee</option>
                    <option value="owner">Owner</option>
                  </Select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <Button type="submit" variant="moss" className="w-full md:w-auto">
                    Create Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Member Roster List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#7C9A5E]" />
              <CardTitle className="font-serif text-xl">Roster Registry</CardTitle>
            </div>
            <CardDescription>Consolidated listing of cooperative members and permission scopes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Coordinates</TableHead>
                  <TableHead className="text-right">Parcels Held</TableHead>
                  <TableHead>Permission Role</TableHead>
                  {isOwner && <TableHead className="text-center">Deactivation</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="hover:bg-[#e8dcc8]/20">
                    <TableCell className="py-4 font-semibold text-[#16291F]">{m.name || '—'}</TableCell>
                    <TableCell className="py-4 text-xs font-mono text-[#7C9A5E]">{m.email}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-base text-[#C79A45] py-4">
                      {m.parcel_count}
                    </TableCell>
                    <TableCell className="py-4 text-[#16291F]">
                      {isOwner ? (
                        <div className="max-w-[150px]">
                          <Select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            className="h-8 py-1 text-xs"
                          >
                            <option value="member">Member</option>
                            <option value="committee">Committee</option>
                            <option value="owner">Owner</option>
                          </Select>
                        </div>
                      ) : (
                        <Badge variant="moss" className="capitalize text-xs font-bold">
                          {m.role}
                        </Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-center py-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(m.id, m.name)}
                          className="h-7 px-2.5 text-xs font-bold"
                        >
                          Deactivate
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
