'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, PlusCircle, Flame, Calendar, ArrowLeft, Coins, AlertCircle, Percent } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Label } from '@/app/components/ui/label';

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

const AIM_BADGE_VARIANTS: Record<string, 'destructive' | 'brass' | 'moss' | 'secondary'> = {
  court_case: 'destructive',
  construction: 'brass',
  security: 'moss',
  general: 'secondary',
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Campaigns Ledger...</p>
        </div>
      </div>
    );
  }

  const isCommittee = role === 'committee' || role === 'owner';

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Funding Campaigns</h1>
              <p className="text-[#7C9A5E] text-sm mt-0.5">Time-bound funding pushes designated for specific co-op aims.</p>
            </div>
          </div>
          {isCommittee && (
            <Button variant="brass" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Create Campaign'}
            </Button>
          )}
        </div>

        {/* Create Campaign Form */}
        {isCommittee && showForm && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif">New Funding Campaign</CardTitle>
              </div>
              <CardDescription>Setup specific fundraising milestones and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#16291F]">
                <div className="md:col-span-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    required
                    placeholder="e.g. Legal defense retainer fund, fencing materials..."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="campaign-purpose">Campaign Purpose</Label>
                  <Input
                    id="campaign-purpose"
                    placeholder="Brief plain-language summary of what funds will buy..."
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-aim">Designated Aim</Label>
                  <Select
                    id="campaign-aim"
                    value={form.aim}
                    onChange={(e) => setForm({ ...form, aim: e.target.value })}
                  >
                    <option value="court_case">Court Case</option>
                    <option value="construction">Construction</option>
                    <option value="security">Security</option>
                    <option value="general">General</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="campaign-target">Target Amount (€)</Label>
                  <Input
                    id="campaign-target"
                    type="number"
                    min={1}
                    value={form.target_amount}
                    onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-deadline">Campaign Deadline</Label>
                  <Input
                    id="campaign-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <Button type="submit" variant="moss" className="w-full md:w-auto">
                    Create Campaign
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Campaigns Listing */}
        <div className="space-y-6">
          {campaigns.length === 0 ? (
            <Card className="text-center p-12 bg-[#F3ECDD] border border-[#7C9A5E]/20">
              <CardContent className="space-y-3">
                <Flame className="h-10 w-10 mx-auto text-[#7C9A5E]" />
                <h3 className="text-lg font-bold font-serif text-[#16291F]">No Active Campaigns</h3>
                <p className="text-[#7C9A5E] text-xs max-w-xs mx-auto">
                  There are no current funding campaigns active. Pushes will appear here when posted by the committee.
                </p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((c) => (
              <Card key={c.id} className="border border-[#e8dcc8]/60 shadow-md">
                <CardHeader className="pb-2 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#e8dcc8]/20">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-2xl font-serif text-[#16291F]">{c.name}</CardTitle>
                      <Badge variant={AIM_BADGE_VARIANTS[c.aim] || 'secondary'} className="text-[10px] uppercase font-bold">
                        {AIM_LABELS[c.aim]}
                      </Badge>
                    </div>
                    {c.deadline && (
                      <CardDescription className="text-xs text-[#7C9A5E] mt-1.5 flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" /> deadline by {new Date(c.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </CardDescription>
                    )}
                  </div>
                  <div>
                    <Badge variant={c.status === 'active' ? 'moss' : c.status === 'completed' ? 'brass' : 'destructive'} className="text-xs font-bold px-3 py-0.5">
                      {c.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {c.purpose && <p className="text-sm text-[#16291F] leading-relaxed">{c.purpose}</p>}

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[#7C9A5E] font-semibold flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5" /> €{c.progress.raised.toLocaleString()} raised
                      </span>
                      <span className="font-mono text-[#16291F] font-bold">of €{c.progress.target.toLocaleString()}</span>
                    </div>
                    <Progress value={c.progress.percent} />
                    <p className="text-right text-[10px] font-mono font-bold text-[#C79A45] mt-1 flex items-center justify-end gap-1">
                      <Percent className="h-3 w-3" /> {c.progress.percent}% achieved
                    </p>
                  </div>

                  {isCommittee && c.status === 'active' && (
                    <div className="flex gap-2 pt-2 border-t border-[#e8dcc8]/20">
                      <Button variant="moss" size="sm" onClick={() => setStatus(c.id, 'completed')}>
                        Mark Completed
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setStatus(c.id, 'cancelled')}>
                        Cancel Campaign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
