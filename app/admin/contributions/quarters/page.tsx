'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';

interface TargetQuarter {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
  target_amount: number;
  created_at: number;
}

interface MemberObligation {
  member_id: string;
  name: string | null;
  email: string;
  amount_due: number;
  parcel_count?: number;
}

export default function QuartersAdminPage() {
  const router = useRouter();
  const [quarters, setQuarters] = useState<TargetQuarter[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<TargetQuarter | null>(null);
  const [obligations, setObligations] = useState<MemberObligation[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showObligationsEditor, setShowObligationsEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create quarter form
  const [createForm, setCreateForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    target_amount: '',
  });

  // Bulk obligations form
  const [bulkForm, setBulkForm] = useState({
    strategy: 'equal',
  });

  // Individual obligation edits
  const [obligationEdits, setObligationEdits] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.authenticated || sessionData.member.role === 'member') {
          router.push('/login');
          return;
        }
        setMyRole(sessionData.member.role);

        // Fetch quarters
        const quartersRes = await fetch('/api/targets/quarters');
        if (quartersRes.ok) {
          const data = await quartersRes.json();
          setQuarters(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleCreateQuarter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createForm.name || !createForm.start_date || !createForm.end_date || !createForm.target_amount) {
      setError('All fields required');
      return;
    }

    const startDate = new Date(createForm.start_date).getTime();
    const endDate = new Date(createForm.end_date).getTime();
    const targetAmount = parseFloat(createForm.target_amount);

    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }

    try {
      const res = await fetch('/api/targets/quarters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          start_date: startDate,
          end_date: endDate,
          target_amount: targetAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create quarter');
        return;
      }

      // Refresh quarters list
      const quartersRes = await fetch('/api/targets/quarters');
      if (quartersRes.ok) {
        const data = await quartersRes.json();
        setQuarters(data);
      }

      setCreateForm({ name: '', start_date: '', end_date: '', target_amount: '' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Create quarter error:', err);
      setError('Failed to create quarter');
    }
  };

  const handleSelectQuarter = async (quarter: TargetQuarter) => {
    setSelectedQuarter(quarter);
    setShowObligationsEditor(true);
    setObligationEdits({});

    try {
      const res = await fetch(`/api/admin/targets/quarters/${quarter.id}/obligations`);
      if (res.ok) {
        const data = await res.json();
        setObligations(data);
      }
    } catch (err) {
      console.error('Fetch obligations error:', err);
      setError('Failed to load obligations');
    }
  };

  const handleBulkAssignObligations = async () => {
    if (!selectedQuarter) return;
    setError(null);

    try {
      const res = await fetch('/api/admin/targets/bulk-obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter_id: selectedQuarter.id,
          global_target: selectedQuarter.target_amount,
          strategy: bulkForm.strategy,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to assign obligations');
        return;
      }

      // Refresh obligations
      const obligRes = await fetch(`/api/admin/targets/quarters/${selectedQuarter.id}/obligations`);
      if (obligRes.ok) {
        const data = await obligRes.json();
        setObligations(data);
      }
    } catch (err) {
      console.error('Bulk assign error:', err);
      setError('Failed to assign obligations');
    }
  };

  const handleSaveObligation = async (memberId: string, amount: number) => {
    if (!selectedQuarter) return;
    setError(null);

    try {
      const res = await fetch('/api/admin/targets/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          quarter_id: selectedQuarter.id,
          amount_due: amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save obligation');
        return;
      }

      // Refresh obligations
      const obligRes = await fetch(`/api/admin/targets/quarters/${selectedQuarter.id}/obligations`);
      if (obligRes.ok) {
        const data = await obligRes.json();
        setObligations(data);
        setObligationEdits({});
      }
    } catch (err) {
      console.error('Save obligation error:', err);
      setError('Failed to save obligation');
    }
  };

  const getQuarterStatus = (quarter: TargetQuarter) => {
    const now = Date.now();
    if (now < quarter.start_date) return 'upcoming';
    if (now > quarter.end_date) return 'past';
    return 'active';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif">Loading quarters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
            className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Quarterly Targets</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">Create quarters and manage member obligations</p>
          </div>
        </div>

        {error && (
          <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E]">
            {error}
          </div>
        )}

        {/* Create Quarter Form */}
        {showCreateForm && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <CardTitle className="font-serif">Create New Quarter</CardTitle>
              <CardDescription>Define the target and timeline for this quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateQuarter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="q-name">Quarter Name</Label>
                  <Input
                    id="q-name"
                    placeholder="Q1 2027"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="bg-[#16291F] text-[#F3ECDD]"
                  />
                </div>
                <div>
                  <Label htmlFor="q-target">Global Target (€)</Label>
                  <Input
                    id="q-target"
                    type="number"
                    placeholder="4000000"
                    value={createForm.target_amount}
                    onChange={(e) => setCreateForm({ ...createForm, target_amount: e.target.value })}
                    className="bg-[#16291F] text-[#F3ECDD]"
                  />
                </div>
                <div>
                  <Label htmlFor="q-start">Start Date</Label>
                  <Input
                    id="q-start"
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="bg-[#16291F] text-[#F3ECDD]"
                  />
                </div>
                <div>
                  <Label htmlFor="q-end">End Date</Label>
                  <Input
                    id="q-end"
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="bg-[#16291F] text-[#F3ECDD]"
                  />
                </div>
                <Button type="submit" variant="moss" className="md:col-span-2">
                  Create Quarter
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quarters List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-2xl">Quarters</CardTitle>
              <CardDescription>Manage quarterly targets and member obligations</CardDescription>
            </div>
            <Button
              variant="brass"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : <Plus className="h-4 w-4 mr-2" />}
              {showCreateForm ? 'Cancel' : 'New Quarter'}
            </Button>
          </CardHeader>
          <CardContent>
            {quarters.length > 0 ? (
              <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Global Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quarters.map((q) => (
                      <TableRow key={q.id} className="hover:bg-[#e8dcc8]/10">
                        <TableCell className="font-semibold text-[#16291F]">{q.name}</TableCell>
                        <TableCell className="text-[#7C9A5E] text-sm">
                          {new Date(q.start_date).toLocaleDateString()} – {new Date(q.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[#C79A45]">
                          €{q.target_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              getQuarterStatus(q) === 'active'
                                ? 'moss'
                                : getQuarterStatus(q) === 'upcoming'
                                  ? 'brass'
                                  : 'clay'
                            }
                          >
                            {getQuarterStatus(q)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectQuarter(q)}
                            className="h-8"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Obligations
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-[#7C9A5E]">No quarters created yet</p>
            )}
          </CardContent>
        </Card>

        {/* Member Obligations Editor */}
        {showObligationsEditor && selectedQuarter && (
          <Card className="border border-[#7C9A5E]/30">
            <CardHeader>
              <CardTitle className="font-serif">
                Member Obligations: {selectedQuarter.name}
              </CardTitle>
              <CardDescription>
                Global target: €{selectedQuarter.target_amount.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Assignment */}
              <div className="bg-[#f3ecdd] p-4 rounded-lg space-y-3">
                <h3 className="font-bold text-[#16291F]">Quick Assign</h3>
                <div className="flex gap-3">
                  <select
                    value={bulkForm.strategy}
                    onChange={(e) => setBulkForm({ ...bulkForm, strategy: e.target.value })}
                    className="px-3 py-2 bg-white border border-[#C79A45] rounded-md text-[#16291F]"
                  >
                    <option value="equal">Equal split among all members</option>
                  </select>
                  <Button variant="moss" onClick={handleBulkAssignObligations} size="sm">
                    Apply
                  </Button>
                </div>
              </div>

              {/* Individual Obligations */}
              <div className="space-y-3">
                <h3 className="font-bold text-[#16291F]">Member Obligations</h3>
                {obligations.length > 0 ? (
                  <div className="space-y-2">
                    {obligations.map((ob) => (
                      <div key={ob.member_id} className="flex items-center gap-3 p-3 bg-white border border-[#e8dcc8]/40 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold text-[#16291F]">{ob.name || '—'}</p>
                          <p className="text-xs text-[#7C9A5E] font-mono">{ob.email}</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={obligationEdits[ob.member_id] ?? ob.amount_due}
                          onChange={(e) =>
                            setObligationEdits({
                              ...obligationEdits,
                              [ob.member_id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32 bg-[#16291F] text-[#F3ECDD]"
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveObligation(ob.member_id, obligationEdits[ob.member_id] ?? ob.amount_due)}
                          className="h-9"
                        >
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#7C9A5E] text-sm italic">No members found</p>
                )}
              </div>

              <Button variant="outline" onClick={() => setShowObligationsEditor(false)} className="w-full">
                Done
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
