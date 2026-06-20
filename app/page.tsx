'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/components/LanguageProvider';
import { 
  Map, 
  Gavel, 
  Coins, 
  Landmark, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  Activity,
  User
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  parcel_count: number;
}

interface Case {
  id: string;
  title: string;
  stage: string;
  next_hearing_date: number | null;
  opposing_party: string;
}

interface FundData {
  balance: number;
  totalContributions: number;
  totalExpenses: number;
  thisMonthContributions: number;
  byAim: {
    court_case: number;
    construction: number;
    security: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'contribution' | 'expense' | 'case_step';
  timestamp: number;
  title: string;
  description: string;
  amount?: number;
}

interface EstateMapData {
  id: string;
  image_data: string;
  caption: string | null;
}

interface OpenAction {
  id: string;
  task: string;
  due_date: number | null;
  status: string;
}

const STAGE_BADGES: Record<string, 'default' | 'brass' | 'moss' | 'clay' | 'destructive' | 'secondary'> = {
  'filed': 'secondary',
  'in progress': 'brass',
  'hearing scheduled': 'clay',
  'awaiting ruling': 'clay',
  'ruling given': 'moss',
  'appeal': 'destructive',
  'resolved': 'moss',
  'closed': 'default',
};

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [member, setMember] = useState<Member | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [estateMap, setEstateMap] = useState<EstateMapData | null>(null);

  const localizedAimLabels: Record<string, string> = {
    court_case: t('spending.categoryCourtCase'),
    construction: t('spending.categoryConstruction'),
    security: t('spending.categorySecurity'),
    general: t('spending.categoryGeneral'),
  };
  const [openActions, setOpenActions] = useState<OpenAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetOverview, setTargetOverview] = useState<{
    globalTarget: number;
    globalRaised: number;
    activeQuarter: {
      id: string;
      name: string;
      target_amount: number;
      raised: number;
    } | null;
  } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated) {
          setMember(data.member);

          // Fetch case data for countdown
          try {
            const casesRes = await fetch('/api/case');
            if (casesRes.ok) {
              const cases = await casesRes.json();
              if (Array.isArray(cases) && cases.length > 0) {
                setCaseData(cases[0]);
              }
            }
          } catch (err) {
            console.error('Error fetching case:', err);
          }

          // Fetch fund data
          try {
            const fundRes = await fetch('/api/fund');
            if (fundRes.ok) {
              setFundData(await fundRes.json());
            }
          } catch (err) {
            console.error('Error fetching fund data:', err);
          }

          // Fetch activity feed
          try {
            const activityRes = await fetch('/api/activity?limit=10');
            if (activityRes.ok) {
              setActivityFeed(await activityRes.json());
            }
          } catch (err) {
            console.error('Error fetching activity feed:', err);
          }

          // Fetch the estate map (the home screen's centerpiece)
          try {
            const mapRes = await fetch('/api/estate-map');
            if (mapRes.ok) {
              setEstateMap(await mapRes.json());
            }
          } catch (err) {
            console.error('Error fetching estate map:', err);
          }

          // Fetch open action items ("what we must do next")
          try {
            const actionsRes = await fetch('/api/meetings/actions/open');
            if (actionsRes.ok) {
              setOpenActions(await actionsRes.json());
            }
          } catch (err) {
            console.error('Error fetching open actions:', err);
          }

          // Fetch target overview
          try {
            const overviewRes = await fetch('/api/targets/overview');
            if (overviewRes.ok) {
              setTargetOverview(await overviewRes.json());
            }
          } catch (err) {
            console.error('Error fetching target overview:', err);
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16291F]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Possyrabat...</p>
        </div>
      </div>
    );
  }

  const daysToHearing = caseData?.next_hearing_date
    ? Math.ceil((caseData.next_hearing_date - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Welcome Section */}
        {member && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
            <div>
              <h1 className="text-3xl font-bold font-serif text-[#F3ECDD] flex items-center gap-2">
                {t('home.welcome')}, {member.name || t('home.member')}
              </h1>
              <p className="text-[#7C9A5E] text-sm mt-1">
                {t('home.dashboardSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#0d1a13] border border-[#e8dcc8]/10 px-4 py-2.5 rounded-lg">
              <User className="h-5 w-5 text-[#C79A45]" />
              <div className="text-left">
                <p className="text-xs text-[#7C9A5E]">{t('home.authenticatedAs')}</p>
                <p className="text-sm font-semibold text-[#F3ECDD]">{member.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Global Target Campaign Widget */}
        {targetOverview && (
          <section className="bg-[#0d1a13] border border-[#C79A45]/30 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Background elements */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-[#C79A45]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2 flex-1 w-full">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#C79A45] animate-bounce" />
                <span className="text-xs font-bold tracking-wider text-[#C79A45] uppercase">{t('home.campaignHeader')}</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#F3ECDD]">
                {t('cotisations.globalTarget')}
              </h2>
              <p className="text-xs text-[#7C9A5E] max-w-xl">
                {t('home.campaignDesc')}
              </p>
              
              <div className="pt-2">
                <Progress 
                  value={(targetOverview.globalRaised / targetOverview.globalTarget) * 100} 
                  indicatorClassName="bg-gradient-to-r from-[#C79A45] to-[#7C9A5E]"
                  className="bg-[#16291F] h-2.5"
                />
                <div className="flex justify-between items-center text-[10px] font-mono font-bold mt-1 text-[#7C9A5E]">
                  <span>0%</span>
                  <span className="text-[#C79A45]">
                    {((targetOverview.globalRaised / targetOverview.globalTarget) * 100).toFixed(1)}% {t('home.completed')}
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-[#e8dcc8]/10 pt-4 md:pt-0 md:pl-6">
              <div className="text-center sm:text-left">
                <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('cotisations.globalTarget') === 'Objectif global' ? 'Montant collecté' : 'Total Raised'}</span>
                <span className="text-2xl font-extrabold text-[#C79A45] font-figure">
                  €{targetOverview.globalRaised.toLocaleString()}
                </span>
                <span className="text-xs text-[#F3ECDD]/60 block mt-0.5">
                  {t('home.ofGoal').replace('{goal}', targetOverview.globalTarget.toLocaleString())}
                </span>
              </div>
              <Button variant="brass" onClick={() => router.push('/cotisations')} className="w-full sm:w-auto">
                {t('home.manageDues')}
              </Button>
            </div>
          </section>
        )}

        {/* The estate map — the reason the group exists, opens the home screen */}
        <section>
          <Card className="overflow-hidden border border-[#e8dcc8]/30 shadow-xl group">
            {estateMap ? (
              <div className="relative">
                <div className="overflow-hidden max-h-[420px] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={estateMap.image_data}
                    alt={estateMap.caption || t('home.ourEstate')}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16291F]/90 via-transparent to-transparent pointer-events-none" />
                </div>
                
                <div className="p-6 bg-[#f3ecdd] flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-[#e8dcc8]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Map className="h-5 w-5 text-[#7C9A5E]" />
                      <span className="text-xs font-bold tracking-wider text-[#7C9A5E] uppercase">{t('home.centerpieceMap')}</span>
                    </div>
                    <p className="text-xl text-[#16291F] font-bold font-serif">
                      {estateMap.caption || t('home.ourEstate')}
                    </p>
                  </div>
                  <Button variant="brass" onClick={() => router.push('/land')} className="group/btn">
                    {t('home.viewHoldings')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <CardContent className="p-12 text-center bg-[#f3ecdd] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#16291F]/10 flex items-center justify-center text-[#16291F]">
                  <Map className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif text-[#16291F] mb-1">{t('land.surveyMap')}</h3>
                  <p className="text-[#7C9A5E] max-w-md mx-auto text-sm">
                    {t('home.noMapText')}
                  </p>
                </div>
                <Button variant="brass" onClick={() => router.push('/land')}>
                  {t('home.goToLand')}
                </Button>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Five Pillars Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Pillar 1: Case Status */}
          {caseData && (
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-[#B5532E]" />
                    <CardTitle className="font-serif">{t('home.courtCase')}</CardTitle>
                  </div>
                  <Badge variant={STAGE_BADGES[caseData.stage.toLowerCase()] || 'brass'}>
                    {caseData.stage}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {t('home.courtCaseDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#e8dcc8]/40 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-xs text-[#7C9A5E] uppercase font-bold tracking-wider">{t('case.opponent')}</span>
                    <p className="text-[#16291F] font-semibold text-sm mt-0.5">{caseData.opposing_party}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#7C9A5E] uppercase font-bold tracking-wider">{t('case.stage')}</span>
                    <p className="text-[#16291F] font-bold text-base mt-0.5">{caseData.title}</p>
                  </div>
                </div>

                {caseData.next_hearing_date && (
                  <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-4 rounded-r-lg space-y-1 relative overflow-hidden">
                    <div className="absolute right-2 top-2 opacity-10">
                      <Clock className="h-12 w-12 text-[#B5532E]" />
                    </div>
                    <span className="text-xs text-[#B5532E] font-bold uppercase tracking-wider">{t('case.nextHearing')}</span>
                    <p className="text-[#16291F] font-bold text-lg">
                      {new Date(caseData.next_hearing_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {daysToHearing !== null && (
                      <p className="text-xs font-semibold text-[#B5532E] animate-pulse">
                        {daysToHearing <= 0 
                          ? t('home.hearingToday')
                          : `${daysToHearing} ${t('home.daysRemaining')}`
                        }
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="clay" onClick={() => router.push('/case')} className="w-full">
                  {t('home.caseDetails')}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Pillar 2: Fund & Balance */}
          {fundData && (
            <Card className="flex flex-col justify-between md:col-span-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-[#C79A45]" />
                  <CardTitle className="font-serif">{t('home.sharedFund')}</CardTitle>
                </div>
                <CardDescription>
                  {t('home.sharedFundDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2 bg-[#e8dcc8]/20 rounded-lg">
                  <span className="text-xs text-[#7C9A5E] uppercase font-bold tracking-wider">{t('home.ledgerBalance')}</span>
                  <p className="text-4xl font-extrabold text-[#C79A45] tracking-tight font-figure mt-1">
                    €{fundData.balance.toLocaleString()}
                  </p>
                </div>

                {/* Three-way allocation bars */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('spending.spendingAllocation') || 'Spending Allocation'}</span>
                  {Object.entries(fundData.byAim).map(([aim, amount]) => {
                    const percent = fundData.totalExpenses > 0 ? (amount / fundData.totalExpenses) * 100 : 0;
                    return (
                      <div key={aim} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#16291F]">
                            {localizedAimLabels[aim] || aim}
                          </span>
                          <span className="font-mono text-[#7C9A5E]">
                            €{amount.toLocaleString()} ({percent.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress 
                          value={percent} 
                          indicatorClassName={
                            aim === 'court_case' 
                              ? 'bg-[#B5532E]' 
                              : aim === 'construction' 
                              ? 'bg-[#C79A45]' 
                              : 'bg-[#7C9A5E]'
                          } 
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs border-t border-[#e8dcc8] pt-3 text-[#7C9A5E]">
                  <div>
                    <p className="font-bold text-[#16291F]">{t('home.totalIn')}</p>
                    <p className="font-mono">€{fundData.totalContributions.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#16291F]">{t('home.totalOut')}</p>
                    <p className="font-mono">€{fundData.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="brass" onClick={() => router.push('/spending')} className="w-full">
                  {t('home.fullLedger')}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Pillar 3: My Parcels */}
          {member && (
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[#7C9A5E]" />
                  <CardTitle className="font-serif">{t('home.myLandHoldings')}</CardTitle>
                </div>
                <CardDescription>
                  {t('home.myLandHoldingsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#7C9A5E]/10 border-l-4 border-[#7C9A5E] p-6 rounded-r-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#7C9A5E] uppercase font-bold tracking-wider">{t('home.parcelsOwned')}</span>
                    <p className="text-5xl font-black text-[#16291F] tracking-tight font-figure mt-1">
                      {member.parcel_count}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-[#7C9A5E]/20 flex items-center justify-center text-[#7C9A5E]">
                    <Map className="h-7 w-7" />
                  </div>
                </div>

                <div className="text-sm bg-[#e8dcc8]/40 p-4 rounded-lg space-y-2">
                  <p className="text-[#16291F]">
                    {t('home.parcelsNote')}
                  </p>
                  <p className="text-xs text-[#7C9A5E]">
                    {t('home.parcelsNote2')}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="moss" onClick={() => router.push('/land')} className="w-full">
                  {t('home.rosterMap')}
                </Button>
              </CardFooter>
            </Card>
          )}

        </div>

        {/* Lower Dashboard Section: Action Items & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Action Items (Column 1) */}
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="text-xl font-serif">{t('home.actionsTitle')}</CardTitle>
              </div>
              <CardDescription>
                {t('home.actionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openActions.length > 0 ? (
                <ul className="space-y-3">
                  {openActions.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex gap-3 text-[#16291F] p-2.5 rounded hover:bg-[#e8dcc8]/30 transition-colors">
                      <div className="mt-0.5 shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-[#7C9A5E]" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">{a.task}</p>
                        {a.due_date && (
                          <p className="text-xs font-bold text-[#B5532E]">
                            {t('home.due')}: {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center text-[#7C9A5E] space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-[#7C9A5E]/40" />
                  <p className="text-sm">{t('home.actionsEmpty')}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => router.push('/meetings')} className="w-full">
                {t('home.viewMeetings')}
              </Button>
            </CardFooter>
          </Card>

          {/* Activity Feed (Column 2 & 3) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#7C9A5E]" />
                  <CardTitle className="text-xl font-serif">{t('home.activityTitle')}</CardTitle>
                </div>
                <CardDescription>
                  {t('home.activityDesc')}
                </CardDescription>
              </div>
              {fundData && (
                <Badge variant="moss" className="font-mono">
                  +€{fundData.thisMonthContributions.toLocaleString()} {t('home.thisMonth')}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {activityFeed.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {activityFeed.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-lg border-l-4 transition-all duration-300 hover:-translate-x-1 ${
                        item.type === 'contribution'
                          ? 'bg-[#7C9A5E]/5 border-[#7C9A5E] hover:bg-[#7C9A5E]/10'
                          : item.type === 'expense'
                          ? 'bg-[#C79A45]/5 border-[#C79A45] hover:bg-[#C79A45]/10'
                          : 'bg-[#B5532E]/5 border-[#B5532E] hover:bg-[#B5532E]/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {item.type === 'contribution' && <Coins className="h-3.5 w-3.5 text-[#7C9A5E]" />}
                            {item.type === 'expense' && <TrendingUp className="h-3.5 w-3.5 text-[#C79A45]" />}
                            {item.type === 'case_step' && <Gavel className="h-3.5 w-3.5 text-[#B5532E]" />}
                            <p className="font-semibold text-sm text-[#16291F]">
                              {item.title}
                            </p>
                          </div>
                          <p className="text-xs text-[#16291F]/80 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-[#7C9A5E] block">
                            {new Date(item.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {item.amount && (
                            <span
                              className={`text-xs font-bold font-mono block mt-1 ${
                                item.type === 'contribution' ? 'text-[#7C9A5E]' : 'text-[#C79A45]'
                              }`}
                            >
                              €{item.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#7C9A5E] space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-[#7C9A5E]/40" />
                  <p className="text-sm">{t('home.activityEmpty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </main>
    </div>
  );
}
