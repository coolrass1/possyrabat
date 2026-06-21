'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Coins, 
  User, 
  Calendar, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Target,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { useLanguage } from '@/app/components/LanguageProvider';
import { formatMoney } from '@/lib/utils';

interface MonthBreakdown {
  month_id: string;
  name: string;
  target: number;
  paid: number;
  status: 'completed' | 'partial' | 'pending' | 'overdue';
}
interface QuarterBreakdown {
  quarter: { id: string; name: string };
  target: number;
  paid: number;
  remaining: number;
  overpaid: number;
  behind_by: number;
  months: MonthBreakdown[];
}

interface TargetQuarter {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
  target_amount: number;
  raised: number;
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

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  parcel_count: number;
  obligation: number;
  paid: number;
  balance: number;
  status: string;
}

export default function ContributionsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // State variables
  const [member, setMember] = useState<any | null>(null);
  const [overview, setOverview] = useState<{
    globalTarget: number;
    globalRaised: number;
    activeQuarter: TargetQuarter | null;
    quarters: TargetQuarter[];
  } | null>(null);
  const [standings, setStandings] = useState<MemberStanding[]>([]);
  
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof RosterEntry>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-standing' | 'roster'>('my-standing');
  const [breakdown, setBreakdown] = useState<QuarterBreakdown | null>(null);

  // Format a monetary amount as whole euros (rounded, with thousands separators)
  const eur = (n: number) => Math.round(n).toLocaleString();

  // Payment recording form state (committee/owner only)
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    member_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'cash',
    notes: '',
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.authenticated) {
          router.push('/login');
          return;
        }
        setMember(sessionData.member);

        // Fetch targets overview
        const overviewRes = await fetch('/api/targets/overview');
        if (overviewRes.ok) {
          setOverview(await overviewRes.json());
        }

        // Fetch standings
        const standingRes = await fetch('/api/targets/my-standing');
        if (standingRes.ok) {
          setStandings(await standingRes.json());
        }

        // Fetch the active-quarter monthly breakdown
        const breakdownRes = await fetch('/api/targets/my-breakdown');
        if (breakdownRes.ok) {
          const bd = await breakdownRes.json();
          setBreakdown(bd.breakdown);
        }

        // Fetch roster
        const rosterRes = await fetch('/api/contributions/open-roster?limit=100');
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          setRoster(rosterData.items || []);
        }

        // Set user role for payment form visibility
        setUserRole(sessionData.member.role);
      } catch (err) {
        console.error('Fetch contributions error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Refresh roster on mount
  useEffect(() => {
    refreshRoster();
  }, []);

  const refreshRoster = async () => {
    try {
      const res = await fetch('/api/contributions/open-roster?limit=100');
      if (res.ok) {
        const data = await res.json();
        setRoster(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching roster:', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!paymentForm.member_id) {
      setPaymentError('Select a member');
      return;
    }
    const amount = parseFloat(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: paymentForm.member_id,
          amount,
          date: new Date(paymentForm.date).getTime(),
          method: paymentForm.method,
          notes: paymentForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || 'Failed to record payment');
        return;
      }

      setPaymentForm({
        member_id: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        method: 'cash',
        notes: '',
      });
      setShowPaymentForm(false);
      await refreshRoster();
    } catch (err) {
      console.error('Error recording payment:', err);
      setPaymentError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSort = (key: keyof RosterEntry) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRoster = [...roster]
    .filter((entry) => {
      const search = rosterSearch.toLowerCase();
      return (
        entry.name.toLowerCase().includes(search) ||
        entry.email.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer': return t('common.bankTransfer');
      case 'cash': return t('common.cash');
      case 'mobile_money': return t('common.mobileMoney');
      default: return t('common.other');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.backToHome')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">{t('contributions.title')}</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">{t('contributions.subtitle')}</p>
          </div>
        </div>

        {/* Overview Widgets */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Global Target */}
            <Card className="border border-[#e8dcc8]/30 shadow-lg relative overflow-hidden bg-[#f3ecdd]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#B5532E]" />
                  <CardTitle className="text-xl font-serif text-[#16291F]">{t('contributions.disputeTarget')}</CardTitle>
                </div>
                <CardDescription>{t('contributions.timelineLabel')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('contributions.raisedContributions')}</span>
                    <p className="text-3xl font-black text-[#16291F] font-figure">
                      €{eur(overview.globalRaised)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('contributions.coopMilestone')}</span>
                    <p className="text-xl font-bold text-[#C79A45] font-figure">
                      {t('home.ofGoal').replace('{goal}', eur(overview.globalTarget))}
                    </p>
                  </div>
                </div>

                <Progress value={(overview.globalRaised / overview.globalTarget) * 100} />
                <p className="text-right text-[10px] font-mono font-bold text-[#C79A45]">
                  {((overview.globalRaised / overview.globalTarget) * 100).toFixed(1)}% {t('common.completed')}
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
                      <CardTitle className="text-xl font-serif text-[#16291F]">{t('contributions.activeQuarterTarget')}</CardTitle>
                    </div>
                    <Badge variant="moss" className="font-mono">
                      {overview.activeQuarter.name}
                    </Badge>
                  </div>
                  <CardDescription>
                    {t('contributions.timelinePeriod')}: {new Date(overview.activeQuarter.start_date).toLocaleDateString()} – {new Date(overview.activeQuarter.end_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('contributions.quarterRaised')}</span>
                      <p className="text-3xl font-black text-[#16291F] font-figure">
                        €{eur(overview.activeQuarter.raised)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('contributions.quarterGoal')}</span>
                      <p className="text-xl font-bold text-[#7C9A5E] font-figure">
                        {t('home.ofGoal').replace('{goal}', eur(overview.activeQuarter.target_amount))}
                      </p>
                    </div>
                  </div>

                  <Progress value={(overview.activeQuarter.raised / overview.activeQuarter.target_amount) * 100} />
                  <p className="text-right text-[10px] font-mono font-bold text-[#7C9A5E]">
                    {((overview.activeQuarter.raised / overview.activeQuarter.target_amount) * 100).toFixed(1)}% {t('common.completed')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-[#e8dcc8]/10 gap-4 pb-1">
          <button
            onClick={() => setActiveTab('my-standing')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'my-standing'
                ? 'border-[#C79A45] text-[#F3ECDD]'
                : 'border-transparent text-[#F3ECDD]/60 hover:text-[#F3ECDD]'
            }`}
          >
            {t('contributions.myObligationsTab')}
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'roster'
                ? 'border-[#C79A45] text-[#F3ECDD]'
                : 'border-transparent text-[#F3ECDD]/60 hover:text-[#F3ECDD]'
            }`}
          >
            {t('contributions.rosterTab')}
          </button>
        </div>

        {/* Tab Content: Standing & Obligations */}
        {activeTab === 'my-standing' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#7C9A5E]" />
                <CardTitle className="font-serif text-2xl text-[#16291F]">{t('contributions.individualStandings')}</CardTitle>
              </div>
              <CardDescription>{t('contributions.individualStandingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {breakdown && (
                <div className="border border-[#e8dcc8]/60 rounded-xl p-6 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-lg font-bold text-[#16291F] font-serif">
                      {t('contributions.monthlyTitle')} — {breakdown.quarter.name}
                    </h4>
                    {breakdown.behind_by > 0 ? (
                      <span className="text-sm font-bold font-mono text-[#B5532E]">
                        {t('contributions.behindByLabel')} {formatMoney(breakdown.behind_by)}
                      </span>
                    ) : breakdown.overpaid > 0 ? (
                      <span className="text-sm font-bold font-mono text-[#7C9A5E]">
                        {t('contributions.paidInFull')} · {t('contributions.overpaidByLabel')} {formatMoney(breakdown.overpaid)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold font-mono text-[#16291F]">
                        {formatMoney(breakdown.remaining)} {t('contributions.remainingCol').toLowerCase()}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('contributions.monthCol')}</TableHead>
                          <TableHead>{t('contributions.targetCol')}</TableHead>
                          <TableHead>{t('contributions.paidCol')}</TableHead>
                          <TableHead>{t('contributions.remainingCol')}</TableHead>
                          <TableHead>{t('contributions.statusCol')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdown.months.map((m) => {
                          const remaining = Math.max(0, m.target - m.paid);
                          const statusLabel = {
                            completed: t('contributions.statusCompleted'),
                            partial: t('contributions.statusPartial'),
                            pending: t('contributions.statusPending'),
                            overdue: t('contributions.statusOverdue'),
                          }[m.status];
                          const statusVariant =
                            m.status === 'completed' ? 'moss' : m.status === 'overdue' ? 'clay' : 'secondary';
                          return (
                            <TableRow key={m.month_id}>
                              <TableCell className="font-bold text-[#16291F]">{m.name}</TableCell>
                              <TableCell className="font-mono">{formatMoney(m.target)}</TableCell>
                              <TableCell className="font-mono text-[#C79A45]">{formatMoney(m.paid)}</TableCell>
                              <TableCell className="font-mono">{formatMoney(remaining)}</TableCell>
                              <TableCell>
                                <Badge variant={statusVariant as any} className="font-bold">{statusLabel}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {standings.length > 0 ? (
                <div className="space-y-6">
                  {standings.map((s) => (
                    <div key={s.quarter.id} className="border border-[#e8dcc8]/60 rounded-xl p-6 bg-[#f9f5f0] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8dcc8]/30 pb-3">
                        <div>
                          <h4 className="text-lg font-bold text-[#16291F] font-serif">{s.quarter.name} {t('contributions.duesSuffix')}</h4>
                          <span className="text-[10px] font-mono text-[#7C9A5E]">
                            {t('contributions.timelinePeriod')}: {new Date(s.quarter.start_date).toLocaleDateString()} – {new Date(s.quarter.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.status === 'up_to_date' ? 'moss' : 'clay'} className="font-bold">
                            {s.status === 'up_to_date' ? t('contributions.statusUpToDate') : t('contributions.statusBehind')}
                          </Badge>
                          <span className={`text-sm font-bold font-mono ${s.balance > 0 ? 'text-[#B5532E]' : 'text-[#7C9A5E]'}`}>
                            {s.balance > 0 ? `€${eur(s.balance)}` : s.balance < 0 ? `+€${eur(Math.abs(s.balance))}` : '€0'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-center sm:text-left">
                        <div className="bg-[#e8dcc8]/30 p-3 rounded-lg">
                          <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">{t('contributions.obligationAmount')}</span>
                          <span className="text-base font-black text-[#16291F] font-figure">€{eur(s.obligation)}</span>
                        </div>
                        <div className="bg-[#e8dcc8]/30 p-3 rounded-lg">
                          <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">{t('contributions.paidStandings')}</span>
                          <span className="text-base font-black text-[#C79A45] font-figure">€{eur(s.paid)}</span>
                        </div>
                        <div className="bg-[#e8dcc8]/30 p-3 rounded-lg flex flex-col justify-center">
                          <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-0.5">{t('contributions.discrepancy')}</span>
                          <span className={`text-base font-bold font-mono ${s.balance > 0 ? 'text-[#B5532E]' : 'text-[#7C9A5E]'}`}>
                            {s.balance > 0 ? `€${eur(s.balance)}` : s.balance < 0 ? `+€${eur(Math.abs(s.balance))}` : '€0'}
                          </span>
                        </div>
                      </div>

                      {/* Earmarked payments list */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] uppercase font-bold text-[#7C9A5E] tracking-wider block">{t('contributions.paymentsLoggedFor').replace('{quarter}', s.quarter.name)}</span>
                        {s.payments.length > 0 ? (
                          <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="py-2.5 text-xs">{t('contributions.when')}</TableHead>
                                  <TableHead className="py-2.5 text-xs text-right">{t('contributions.amount')}</TableHead>
                                  <TableHead className="py-2.5 text-xs">{t('contributions.method')}</TableHead>
                                  <TableHead className="py-2.5 text-xs">{t('contributions.earmarkMonth')}</TableHead>
                                  <TableHead className="py-2.5 text-xs">{t('contributions.notes')}</TableHead>
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
                                      {getMethodLabel(p.method)}
                                    </TableCell>
                                    <TableCell className="py-2 font-semibold text-[#7C9A5E]">
                                      {p.month_name || t('contributions.unspecified')}
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
                          <p className="text-xs text-[#7C9A5E] italic">{t('contributions.noTransactions')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-[#7C9A5E] text-sm italic">{t('contributions.noStandings')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab Content: Transparency Roster */}
        {activeTab === 'roster' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#7C9A5E]" />
                    <CardTitle className="font-serif text-2xl text-[#16291F]">{t('contributions.transparencyRoster')}</CardTitle>
                  </div>
                  <CardDescription>{t('contributions.transparencyRosterDesc')}</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7C9A5E]" />
                  <Input
                    placeholder={t('contributions.searchPlaceholder')}
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-9 bg-[#f3ecdd] border-[#e8dcc8]/40 text-[#16291F] focus:ring-[#7C9A5E] h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sortedRoster.length > 0 ? (
                <div className="overflow-x-auto border border-[#e8dcc8]/45 rounded-lg bg-white text-[#16291F]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => toggleSort('name')} className="cursor-pointer select-none">
                          <div className="flex items-center gap-1">{t('contributions.memberHeader')} <ArrowUpDown className="h-3.5 w-3.5 text-[#7C9A5E]" /></div>
                        </TableHead>
                        <TableHead onClick={() => toggleSort('parcel_count')} className="cursor-pointer select-none text-right">
                          <div className="flex items-center gap-1 justify-end">{t('contributions.parcelsHeader')} <ArrowUpDown className="h-3.5 w-3.5 text-[#7C9A5E]" /></div>
                        </TableHead>
                        <TableHead onClick={() => toggleSort('obligation')} className="cursor-pointer select-none text-right">
                          <div className="flex items-center gap-1 justify-end">{t('contributions.targetObligationHeader')} <ArrowUpDown className="h-3.5 w-3.5 text-[#7C9A5E]" /></div>
                        </TableHead>
                        <TableHead onClick={() => toggleSort('paid')} className="cursor-pointer select-none text-right">
                          <div className="flex items-center gap-1 justify-end">{t('contributions.paidHeader')} <ArrowUpDown className="h-3.5 w-3.5 text-[#7C9A5E]" /></div>
                        </TableHead>
                        <TableHead onClick={() => toggleSort('balance')} className="cursor-pointer select-none text-right">
                          <div className="flex items-center gap-1 justify-end">{t('contributions.discrepancyHeader')} <ArrowUpDown className="h-3.5 w-3.5 text-[#7C9A5E]" /></div>
                        </TableHead>
                        <TableHead>{t('contributions.statusHeader')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRoster.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-[#e8dcc8]/10 text-xs">
                          <TableCell className="py-3 font-semibold text-[#16291F]">
                            <div>{entry.name}</div>
                            <div className="text-[10px] text-[#7C9A5E] font-mono font-medium">{entry.email}</div>
                          </TableCell>
                          <TableCell className="text-right py-3 font-mono font-semibold">{entry.parcel_count} {t('contributions.parcelsSuffix')}</TableCell>
                          <TableCell className="text-right py-3 font-mono">€{eur(entry.obligation)}</TableCell>
                          <TableCell className="text-right py-3 font-mono font-bold text-[#C79A45]">€{eur(entry.paid)}</TableCell>
                          <TableCell className={`text-right py-3 font-mono font-semibold ${entry.balance > 0 ? 'text-[#B5532E]' : 'text-[#7C9A5E]'}`}>
                            {entry.balance > 0 ? `€${eur(entry.balance)}` : entry.balance < 0 ? `+€${eur(Math.abs(entry.balance))}` : '€0'}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={entry.status === 'up to date' ? 'moss' : 'clay'} className="font-bold text-[10px]">
                              {entry.status === 'up to date' ? t('contributions.statusUpToDate') : t('contributions.statusBehind')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-[#7C9A5E] text-xs italic bg-white border border-[#e8dcc8]/40 rounded-lg">
                  {t('contributions.noMembersMatch')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Record payment — committee/owner only */}
        {userRole && userRole !== 'member' && (
          <Card className="border border-[#e8dcc8]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-[#7C9A5E]" />
                  <CardTitle className="font-serif">{t('contributions.recordPayment')}</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="bg-[#7C9A5E] text-white hover:bg-[#6a8650]"
                >
                  {showPaymentForm ? t('common.cancel') : t('contributions.addPayment')}
                </Button>
              </div>
              <CardDescription>{t('contributions.recordPaymentDesc')}</CardDescription>
            </CardHeader>

            {showPaymentForm && (
              <CardContent>
                <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentError && (
                    <div className="md:col-span-2 bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E]">
                      {paymentError}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="payment-member">{t('contributions.memberLabel')}</Label>
                    <select
                      id="payment-member"
                      required
                      value={paymentForm.member_id}
                      onChange={(e) => setPaymentForm({ ...paymentForm, member_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                    >
                      <option value="">{t('contributions.selectMember')}</option>
                      {roster.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="payment-amount">{t('contributions.amountLabel')}</Label>
                    <Input
                      id="payment-amount"
                      required
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="bg-[#16291F] text-[#F3ECDD]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment-date">{t('contributions.dateLabel')}</Label>
                    <Input
                      id="payment-date"
                      required
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="bg-[#16291F] text-[#F3ECDD]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment-method">{t('contributions.methodLabel')}</Label>
                    <select
                      id="payment-method"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                      className="w-full px-3 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                    >
                      <option value="cash">{t('common.cash')}</option>
                      <option value="bank_transfer">{t('common.bankTransfer')}</option>
                      <option value="mobile_money">{t('common.mobileMoney')}</option>
                      <option value="other">{t('common.other')}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="payment-notes">{t('contributions.notesLabel')}</Label>
                    <Input
                      id="payment-notes"
                      placeholder={t('contributions.notesPlaceholder')}
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="bg-[#16291F] text-[#F3ECDD]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    variant="moss"
                    className="md:col-span-2"
                  >
                    {submitting ? t('common.loading') : t('contributions.recordPaymentBtn')}
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>
        )}

      </main>
    </div>
  );
}
