'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Target, 
  Coins, 
  User, 
  Calendar, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Notebook, 
  ShieldCheck, 
  UserCheck, 
  DollarSign, 
  Layers, 
  TrendingUp 
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Label } from '@/app/components/ui/label';
import { formatMoney } from '@/lib/utils';

interface SessionMember {
  id: string;
  name: string | null;
  role: 'member' | 'committee' | 'owner';
  email: string;
}

interface TargetQuarter {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
  target_amount: number;
  raised: number;
}

interface TargetMonth {
  id: string;
  quarter_id: string;
  name: string;
  target_amount: number;
}

interface MemberStanding {
  quarter: TargetQuarter;
  obligation: number;
  paid: number;
  balance: number;
  status: 'up_to_date' | 'behind';
  payments: Array<{
    id: string;
    amount: number;
    date_paid: number;
    method: string;
    notes: string | null;
    month_name: string | null;
  }>;
}

interface MemberOption {
  id: string;
  name: string | null;
  email: string;
  parcel_count: number;
}

interface ObligationRow {
  member_id: string;
  name: string | null;
  email: string;
  parcel_count: number;
  amount_due: number;
}

interface PaymentRow {
  id: string;
  member_id: string;
  member_name: string | null;
  member_email: string;
  quarter_name: string;
  month_id: string | null;
  amount: number;
  date_paid: number;
  method: string;
  notes: string | null;
  recorded_by: string;
}

const ALL_SECTIONS = [
  { href: '/land', label: 'Land', description: 'Co-op land parcel map and holdings registry' },
  { href: '/case', label: 'Case', description: 'Legal defense documentation, hearing schedules, and milestones' },
  { href: '/contributions', label: 'Contributions', description: 'Member monthly & quarterly contribution statuses' },
  { href: '/spending', label: 'Spending', description: 'Co-op balance sheet, expenses log and receipts' },
  { href: '/campaigns', label: 'Campaigns', description: 'Earmarked crowdfunding campaigns for legal push and security' },
  { href: '/meetings', label: 'Meetings', description: 'Dispute committee meetings schedule, action lists, and decisions' },
  { href: '/events', label: 'Events', description: 'Community gathering coordinates and schedules' },
  { href: '/community', label: 'Community', description: 'Co-op announcements, progress reports, and parcel forum' },
  { href: '/polls', label: 'Polls', description: 'Democratic voting on land disputes and allocation queries' },
  { href: '/statements', label: 'Statements', description: 'Financial statements summaries and reconciliation sheets' },
  { href: '/rules', label: 'Rules', description: 'Internal articles of association, bylaws, and dispute guides' },
  { href: '/profile', label: 'Profile', description: 'Member settings, contact details, and account summary' },
];

export default function CotisationsPage() {
  const router = useRouter();
  
  // States
  const [member, setMember] = useState<SessionMember | null>(null);
  const [overview, setOverview] = useState<{
    globalTarget: number;
    globalRaised: number;
    activeQuarter: TargetQuarter | null;
    quarters: TargetQuarter[];
  } | null>(null);
  const [standings, setStandings] = useState<MemberStanding[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Admin sub-states
  const [selectedQuarterId, setSelectedQuarterId] = useState<string>('');
  const [obligations, setObligations] = useState<ObligationRow[]>([]);
  const [months, setMonths] = useState<TargetMonth[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'obligations' | 'history' | 'sections'>('payments');
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [currency, setCurrency] = useState<string>('XOF');
  const [globalTargetInput, setGlobalTargetInput] = useState<string>('0');
  const [perParcelFee, setPerParcelFee] = useState<number>(0);

  // Payment logger form state
  const [paymentForm, setPaymentForm] = useState({
    member_id: '',
    quarter_id: '',
    month_id: '',
    amount: '',
    date_paid: new Date().toISOString().slice(0, 10),
    method: 'bank_transfer',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Format a monetary amount as whole euros (rounded, with thousands separators)
  const eur = (n: number) => Math.round(n).toLocaleString();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.authenticated) {
          router.push('/login');
          return;
        }
        if (sessionData.member.role === 'member') {
          router.push('/contributions');
          return;
        }
        setMember(sessionData.member);

        // Fetch target overview
        const overviewRes = await fetch('/api/targets/overview');
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          setOverview(overviewData);
          if (overviewData.activeQuarter) {
            setSelectedQuarterId(overviewData.activeQuarter.id);
            setPaymentForm((prev) => ({ ...prev, quarter_id: overviewData.activeQuarter.id }));
          } else if (overviewData.quarters.length > 0) {
            setSelectedQuarterId(overviewData.quarters[0].id);
            setPaymentForm((prev) => ({ ...prev, quarter_id: overviewData.quarters[0].id }));
          }
        }

        // Fetch standings
        const standingRes = await fetch('/api/targets/my-standing');
        if (standingRes.ok) {
          setStandings(await standingRes.json());
        }

        // If admin/committee, fetch options and logs
        if (sessionData.member.role !== 'member') {
          const membersRes = await fetch('/api/parcel-holdings/all');
          if (membersRes.ok) setMembers(await membersRes.json());

          const paymentsRes = await fetch('/api/targets/payments');
          if (paymentsRes.ok) setPayments(await paymentsRes.json());

          // Fetch visible sections settings
          const settingsRes = await fetch('/api/settings');
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData.enabled_sections) {
              setEnabledSections(settingsData.enabled_sections);
            }
            if (settingsData.currency) setCurrency(settingsData.currency);
            if (settingsData.global_target !== undefined) {
              setGlobalTargetInput(String(settingsData.global_target));
            }
            if (settingsData.per_parcel_fee !== undefined) {
              setPerParcelFee(settingsData.per_parcel_fee);
            }
          }
        }
      } catch (err) {
        console.error('Fetch cotisations error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Load obligations when quarter selection changes
  useEffect(() => {
    if (!selectedQuarterId || (member && member.role === 'member')) return;

    const fetchObligationsAndMonths = async () => {
      try {
        const obRes = await fetch(`/api/targets/obligations?quarter_id=${selectedQuarterId}`);
        if (obRes.ok) setObligations(await obRes.json());

        const monthsRes = await fetch(`/api/targets/months?quarter_id=${selectedQuarterId}`);
        if (monthsRes.ok) setMonths(await monthsRes.json());
      } catch (err) {
        console.error('Error fetching obligations/months:', err);
      }
    };

    fetchObligationsAndMonths();
  }, [selectedQuarterId, member]);

  // Load months for form when form quarter changes
  useEffect(() => {
    if (!paymentForm.quarter_id) return;
    fetch(`/api/targets/months?quarter_id=${paymentForm.quarter_id}`)
      .then((r) => r.json())
      .then((data) => setMonths(data))
      .catch((e) => console.error(e));
  }, [paymentForm.quarter_id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!paymentForm.member_id) return setFormError('Select a member');
    if (!paymentForm.quarter_id) return setFormError('Select a quarter');
    
    const amount = parseFloat(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setFormError('Amount must be greater than 0');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/targets/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: paymentForm.member_id,
          quarter_id: paymentForm.quarter_id,
          month_id: paymentForm.month_id || null,
          amount,
          date_paid: new Date(paymentForm.date_paid).getTime(),
          method: paymentForm.method,
          notes: paymentForm.notes || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setFormError(errorData.error || 'Failed to record payment');
        return;
      }

      setFormSuccess('Payment recorded successfully');
      setPaymentForm((prev) => ({ ...prev, amount: '', notes: '', member_id: '' }));
      
      // Refresh statistics
      const overviewRes = await fetch('/api/targets/overview');
      if (overviewRes.ok) setOverview(await overviewRes.json());

      const standingRes = await fetch('/api/targets/my-standing');
      if (standingRes.ok) setStandings(await standingRes.json());

      const paymentsRes = await fetch('/api/targets/payments');
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
    } catch (err) {
      setFormError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveObligations = async () => {
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/targets/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter_id: selectedQuarterId,
          obligations: obligations.map((o) => ({
            member_id: o.member_id,
            amount_due: o.amount_due,
          })),
        }),
      });

      if (res.ok) {
        setFormSuccess('Obligations updated successfully');
        
        // Refresh standings
        const standingRes = await fetch('/api/targets/my-standing');
        if (standingRes.ok) setStandings(await standingRes.json());
      } else {
        setFormError('Failed to save obligations');
      }
    } catch (err) {
      setFormError('Failed to save obligations');
    } finally {
      setSubmitting(false);
    }
  };

  const updateObligationAmount = (memberId: string, amount: number) => {
    setObligations(
      obligations.map((o) => (o.member_id === memberId ? { ...o, amount_due: amount } : o))
    );
  };

  const toggleSection = (href: string) => {
    setEnabledSections((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const handleSaveSections = async () => {
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled_sections: enabledSections,
        }),
      });

      if (res.ok) {
        setFormSuccess('Visible sections updated successfully');
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to update visible sections');
      }
    } catch (err) {
      setFormError('Failed to update visible sections');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGovernance = async () => {
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          global_target: Number(globalTargetInput) || 0,
        }),
      });

      if (res.ok) {
        setFormSuccess('Currency and lifetime target updated successfully');
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to update governance settings');
      }
    } catch (err) {
      setFormError('Failed to update governance settings');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Target Ledger...</p>
        </div>
      </div>
    );
  }

  const isCommittee = member && member.role !== 'member';
  const isOwner = member && member.role === 'owner';
  const currencyLabel = formatMoney(0, currency).replace(/[\d\s]/g, '') || currency;

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Target Contributions</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">Democratic allocations towards the €3,600,000 co-op dispute and development goals.</p>
          </div>
        </div>

        {/* Progress Metrics cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Global Target */}
            <Card className="border border-[#e8dcc8]/30 shadow-lg relative overflow-hidden bg-[#f3ecdd]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#B5532E]" />
                  <CardTitle className="text-xl font-serif text-[#16291F]">Global Target</CardTitle>
                </div>
                <CardDescription>Target timeline: July 1, 2026 – Dec 31, 2027</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Raised Contributions</span>
                    <p className="text-3xl font-black text-[#16291F] font-figure">
                      €{eur(overview.globalRaised)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Co-op Milestone</span>
                    <p className="text-xl font-bold text-[#C79A45] font-figure">
                      of €{eur(overview.globalTarget)}
                    </p>
                  </div>
                </div>

                <Progress value={(overview.globalRaised / overview.globalTarget) * 100} />
                <p className="text-right text-[10px] font-mono font-bold text-[#C79A45]">
                  {((overview.globalRaised / overview.globalTarget) * 100).toFixed(1)}% Completed
                </p>
              </CardContent>
            </Card>

            {/* Active Quarter Target */}
            {overview.activeQuarter && (
              <Card className="border border-[#e8dcc8]/30 shadow-lg relative overflow-hidden bg-[#f3ecdd]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#7C9A5E]" />
                      <CardTitle className="text-xl font-serif text-[#16291F]">Active Quarter Target</CardTitle>
                    </div>
                    <Badge variant="moss" className="font-mono">
                      {overview.activeQuarter.name}
                    </Badge>
                  </div>
                  <CardDescription>
                    Calendar: {new Date(overview.activeQuarter.start_date).toLocaleDateString()} – {new Date(overview.activeQuarter.end_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Quarter Raised</span>
                      <p className="text-3xl font-black text-[#16291F] font-figure">
                        €{eur(overview.activeQuarter.raised)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Quarter Goal</span>
                      <p className="text-xl font-bold text-[#7C9A5E] font-figure">
                        of €{eur(overview.activeQuarter.target_amount)}
                      </p>
                    </div>
                  </div>

                  <Progress value={(overview.activeQuarter.raised / overview.activeQuarter.target_amount) * 100} />
                  <p className="text-right text-[10px] font-mono font-bold text-[#7C9A5E]">
                    {((overview.activeQuarter.raised / overview.activeQuarter.target_amount) * 100).toFixed(1)}% Completed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* My Standing Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#7C9A5E]" />
              <CardTitle className="font-serif text-2xl text-[#16291F]">My Target Standings</CardTitle>
            </div>
            <CardDescription>Verify your individual quarterly obligations and recorded deposits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {standings.length > 0 ? (
              <div className="space-y-6">
                {standings.map((s) => (
                  <div key={s.quarter.id} className="border border-[#e8dcc8]/60 rounded-xl p-6 bg-[#f9f5f0] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8dcc8]/30 pb-3">
                      <div>
                        <h4 className="text-lg font-bold text-[#16291F] font-serif">{s.quarter.name} Dues</h4>
                        <span className="text-[10px] font-mono text-[#7C9A5E]">
                          Duration: {new Date(s.quarter.start_date).toLocaleDateString()} – {new Date(s.quarter.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.status === 'up_to_date' ? 'moss' : 'clay'} className="font-bold">
                          {s.status === 'up_to_date' ? 'Up to date' : 'In arrears'}
                        </Badge>
                        <span className={`text-sm font-bold font-mono ${s.balance > 0 ? 'text-[#B5532E]' : 'text-[#7C9A5E]'}`}>
                          {s.balance > 0 ? `€${eur(s.balance)}` : s.balance < 0 ? `+€${eur(Math.abs(s.balance))}` : '€0'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-center sm:text-left">
                      <div className="bg-[#e8dcc8]/30 p-3 rounded-lg">
                        <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">Assigned Obligation</span>
                        <span className="text-base font-black text-[#16291F] font-figure">€{eur(s.obligation)}</span>
                      </div>
                      <div className="bg-[#e8dcc8]/30 p-3 rounded-lg">
                        <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">Paid Standings</span>
                        <span className="text-base font-black text-[#C79A45] font-figure">€{eur(s.paid)}</span>
                      </div>
                      <div className="bg-[#e8dcc8]/30 p-3 rounded-lg flex flex-col justify-center sm:col-span-1 md:col-span-1">
                        <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">Outstanding Balance</span>
                        <span className={`text-base font-bold font-mono ${s.balance > 0 ? 'text-[#B5532E]' : 'text-[#7C9A5E]'}`}>
                          {s.balance > 0 ? `€${eur(s.balance)}` : s.balance < 0 ? `+€${eur(Math.abs(s.balance))}` : '€0'}
                        </span>
                      </div>
                    </div>

                    {/* Earmarked payments list */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-[10px] uppercase font-bold text-[#7C9A5E] tracking-wider">Payments Logged For {s.quarter.name}</Label>
                      {s.payments.length > 0 ? (
                        <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="py-2.5 text-xs">When</TableHead>
                                <TableHead className="py-2.5 text-xs text-right">Amount</TableHead>
                                <TableHead className="py-2.5 text-xs">Method</TableHead>
                                <TableHead className="py-2.5 text-xs">Earmark Month</TableHead>
                                <TableHead className="py-2.5 text-xs">Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.payments.map((p) => (
                                <TableRow key={p.id} className="hover:bg-[#e8dcc8]/10 text-xs">
                                  <TableCell className="py-2 font-mono text-[11px] text-[#16291F]">
                                    {new Date(p.date_paid).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-bold text-[#C79A45] py-2">
                                    €{eur(p.amount)}
                                  </TableCell>
                                  <TableCell className="capitalize py-2 text-[#16291F]">
                                    {p.method.replace('_', ' ')}
                                  </TableCell>
                                  <TableCell className="py-2 font-semibold text-[#7C9A5E]">
                                    {p.month_name || 'Unspecified'}
                                  </TableCell>
                                  <TableCell className="text-[#7C9A5E] py-2 italic text-[11px] max-w-[150px] truncate">
                                    {p.notes || '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-xs text-[#7C9A5E] italic">No transactions recorded for this period.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-[#7C9A5E] text-sm italic">No standings tracked yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Committee / Admin Section */}
        {isCommittee && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader className="border-b border-[#e8dcc8]/20 flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="font-serif text-2xl text-[#16291F]">Council Controller</CardTitle>
                <CardDescription>Target allocations setup, manual obligations input, and payments loggers</CardDescription>
              </div>
              <div className="flex bg-[#0d1a13]/85 p-1 rounded-lg gap-1 border border-[#e8dcc8]/10">
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'payments' ? 'bg-[#C79A45] text-[#16291F]' : 'text-[#F3ECDD]/70 hover:text-[#F3ECDD]'
                  }`}
                >
                  Record Payment
                </button>
                <button
                  onClick={() => setActiveTab('obligations')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'obligations' ? 'bg-[#C79A45] text-[#16291F]' : 'text-[#F3ECDD]/70 hover:text-[#F3ECDD]'
                  }`}
                >
                  Set Obligations
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'history' ? 'bg-[#C79A45] text-[#16291F]' : 'text-[#F3ECDD]/70 hover:text-[#F3ECDD]'
                  }`}
                >
                  Payments history
                </button>
                <button
                  onClick={() => setActiveTab('sections')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'sections' ? 'bg-[#C79A45] text-[#16291F]' : 'text-[#F3ECDD]/70 hover:text-[#F3ECDD]'
                  }`}
                >
                  Section Controls
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              
              {formError && (
                <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E] mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-[#7C9A5E]/15 border-l-4 border-[#7C9A5E] p-3 rounded text-sm text-[#7C9A5E] mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {formSuccess}
                </div>
              )}

              {/* Tab 1: Record Target Payment */}
              {activeTab === 'payments' && (
                <form onSubmit={handleRecordPayment} className="space-y-4 max-w-2xl text-[#16291F]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pay-member">Select Member Profile</Label>
                      <Select
                        id="pay-member"
                        value={paymentForm.member_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, member_id: e.target.value })}
                        required
                      >
                        <option value="">Choose member...</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pay-quarter">Target Quarter</Label>
                      <Select
                        id="pay-quarter"
                        value={paymentForm.quarter_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, quarter_id: e.target.value })}
                        required
                      >
                        {overview && overview.quarters.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pay-month">Earmark Month (Optional)</Label>
                      <Select
                        id="pay-month"
                        value={paymentForm.month_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, month_id: e.target.value })}
                      >
                        <option value="">No month specific earmark</option>
                        {months.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pay-amount">Payment Amount (€)</Label>
                      <Input
                        id="pay-amount"
                        type="number"
                        min={0.01}
                        step="0.01"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="pay-date">Date Paid</Label>
                      <Input
                        id="pay-date"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={paymentForm.date_paid}
                        onChange={(e) => setPaymentForm({ ...paymentForm, date_paid: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="pay-method">Transfer Method</Label>
                      <Select
                        id="pay-method"
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        required
                      >
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cash">Cash</option>
                        <option value="mobile_money">Mobile money</option>
                        <option value="other">Other</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pay-notes">Notes (optional)</Label>
                    <Input
                      id="pay-notes"
                      placeholder="e.g. wire reference numbers, invoice hashes..."
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    />
                  </div>

                  <Button type="submit" variant="moss" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? 'Recording...' : 'Record Payment Receipt'}
                  </Button>
                </form>
              )}

              {/* Tab 2: Set member Obligations */}
              {activeTab === 'obligations' && (
                <div className="space-y-6 text-[#16291F]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f9f5f0] p-4 rounded-lg border border-[#e8dcc8]/60">
                    <div className="max-w-xs">
                      <Label htmlFor="ob-quarter">Configure Quarter Obligations</Label>
                      <Select
                        id="ob-quarter"
                        value={selectedQuarterId}
                        onChange={(e) => setSelectedQuarterId(e.target.value)}
                      >
                        {overview && overview.quarters.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="text-xs text-[#7C9A5E] leading-relaxed">
                      <p>• Dues are set manually for simplicity.</p>
                      <p>• Recommended formula reference: <strong>Parcel Count × {formatMoney(perParcelFee, currency)} per parcel</strong>.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Parcel count</TableHead>
                          <TableHead>Suggested Obligation</TableHead>
                          <TableHead className="w-[180px]">Quarterly Obligation ({currencyLabel})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obligations.map((o) => {
                          const parcelCount = o.parcel_count ?? 0;
                          return (
                            <TableRow key={o.member_id} className="hover:bg-[#e8dcc8]/10">
                              <TableCell className="py-3">
                                <p className="font-bold text-[#16291F]">{o.name || 'Anonymous'}</p>
                                <span className="text-[10px] text-[#7C9A5E] font-mono">{o.email}</span>
                              </TableCell>
                              <TableCell className="py-3 font-mono font-semibold text-[#16291F]">
                                {parcelCount} parcels
                              </TableCell>
                              <TableCell className="py-3 font-mono text-[#7C9A5E]">
                                {formatMoney(parcelCount * perParcelFee, currency)} <span className="text-[10px] text-[#7C9A5E]/80">(fee model)</span>
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={o.amount_due}
                                  onChange={(e) => updateObligationAmount(o.member_id, Number(e.target.value))}
                                  className="h-9 py-1 px-2 font-mono text-sm font-semibold text-[#16291F] focus:ring-[#7C9A5E]"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <Button onClick={handleSaveObligations} variant="moss" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? 'Saving...' : 'Save Obligations'}
                  </Button>
                </div>
              )}

              {/* Tab 3: History Log */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {payments.length > 0 ? (
                    <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white text-[#16291F]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Quarter</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id} className="hover:bg-[#e8dcc8]/10 text-xs">
                              <TableCell className="py-3 font-mono text-[11px] text-[#16291F]">
                                {new Date(p.date_paid).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="py-3">
                                <p className="font-semibold text-[#16291F]">{p.member_name || 'Anonymous'}</p>
                                <span className="text-[10px] text-[#7C9A5E] font-mono block">{p.member_email}</span>
                              </TableCell>
                              <TableCell className="py-3 font-bold text-[#7C9A5E]">{p.quarter_name}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-base text-[#C79A45] py-3">
                                €{eur(p.amount)}
                              </TableCell>
                              <TableCell className="capitalize py-3">{p.method.replace('_', ' ')}</TableCell>
                              <TableCell className="text-[#7C9A5E] py-3 max-w-[200px] truncate italic text-[11px]">
                                {p.notes || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-[#7C9A5E] text-xs italic bg-white border border-[#e8dcc8]/40 rounded-lg">
                      No payments logged in history.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 4: Section Controls */}
              {activeTab === 'sections' && (
                <div className="space-y-6 text-[#16291F]">
                  {isOwner && (
                    <div className="bg-[#f9f5f0] p-5 rounded-lg border border-[#C79A45]/50 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-serif text-lg font-bold text-[#16291F]">Currency & Lifetime Target</h3>
                        <p className="text-xs text-[#7C9A5E] leading-relaxed">
                          Owner-only. Sets the currency used across the portal and the lifetime global target the
                          cumulative cooperative progress is measured against.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="gov-currency" className="text-xs font-bold text-[#16291F]">Currency</label>
                          <select
                            id="gov-currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full rounded-lg border border-[#e8dcc8]/60 bg-white px-3 py-2 text-sm text-[#16291F]"
                          >
                            <option value="XOF">CFA franc (XOF)</option>
                            <option value="EUR">Euro (EUR)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="gov-target" className="text-xs font-bold text-[#16291F]">Lifetime global target</label>
                          <input
                            id="gov-target"
                            type="number"
                            min="0"
                            value={globalTargetInput}
                            onChange={(e) => setGlobalTargetInput(e.target.value)}
                            className="w-full rounded-lg border border-[#e8dcc8]/60 bg-white px-3 py-2 text-sm text-[#16291F]"
                          />
                        </div>
                      </div>
                      <Button onClick={handleSaveGovernance} variant="moss" disabled={submitting} className="w-full sm:w-auto">
                        {submitting ? 'Saving...' : 'Save Currency & Target'}
                      </Button>
                    </div>
                  )}

                  <div className="bg-[#f9f5f0] p-5 rounded-lg border border-[#e8dcc8]/60 space-y-2">
                    <h3 className="font-serif text-lg font-bold text-[#16291F]">Member Section Visibility Controls</h3>
                    <p className="text-xs text-[#7C9A5E] leading-relaxed">
                      Toggle which sections of the co-op portal are enabled and visible for regular members. 
                      Deactivated sections will be hidden from their navigation menu and blocked from direct URL access.
                      Committee members and owners will always retain complete access to all sections.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_SECTIONS.map((sec) => {
                      const isEnabled = enabledSections.includes(sec.href);
                      return (
                        <div
                          key={sec.href}
                          onClick={() => toggleSection(sec.href)}
                          className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-start gap-4 ${
                            isEnabled
                              ? 'bg-white border-[#C79A45] shadow-md transform scale-[1.01]'
                              : 'bg-white/50 border-[#e8dcc8]/40 opacity-70 hover:opacity-90'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => {}} // handled by parent onClick
                              className="h-4.5 w-4.5 rounded border-[#e8dcc8]/60 text-[#C79A45] focus:ring-[#C79A45]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#16291F]">{sec.label}</span>
                              <span className="font-mono text-[10px] text-[#7C9A5E] bg-[#e8dcc8]/30 px-1.5 py-0.5 rounded">
                                {sec.href}
                              </span>
                            </div>
                            <p className="text-xs text-[#7C9A5E] leading-snug">{sec.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-[#e8dcc8]/20 flex gap-3">
                    <Button onClick={handleSaveSections} variant="moss" disabled={submitting} className="w-full sm:w-auto">
                      {submitting ? 'Saving...' : 'Apply Visibility Settings'}
                    </Button>
                    <Button
                      onClick={() => setEnabledSections(['/land', '/case', '/contributions', '/spending', '/meetings'])}
                      variant="outline"
                      className="border-[#e8dcc8]/30 text-[#16291F] hover:bg-[#e8dcc8]/20"
                    >
                      Reset to Default
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
