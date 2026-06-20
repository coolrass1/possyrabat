'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  PiggyBank, 
  Coins, 
  TrendingDown, 
  ShieldAlert, 
  HardHat, 
  Gavel, 
  FolderMinus, 
  User, 
  Calendar, 
  BookOpen,
  PieChart
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { useLanguage } from '@/app/components/LanguageProvider';

interface Balance {
  total_in: number;
  total_out: number;
  balance: number;
  currency: string;
}

interface LedgerItem {
  id: string;
  description: string;
  amount: number;
  aim: string;
  date: number;
  receipt_url?: string;
}

interface Ledger {
  court_case: number;
  construction: number;
  security: number;
  general: number;
  total: number;
  currency: string;
  percentages: Record<string, number>;
  items: LedgerItem[];
}

interface Custodian {
  custodian_name: string | null;
  account_masked: string | null;
  last_reconciled_at: number | null;
}

const AIM_BADGE_VARIANTS: Record<string, 'destructive' | 'brass' | 'moss' | 'secondary'> = {
  court_case: 'destructive',
  construction: 'brass',
  security: 'moss',
  general: 'secondary',
};

const AIM_ICONS: Record<string, React.ReactNode> = {
  court_case: <Gavel className="h-4 w-4" />,
  construction: <HardHat className="h-4 w-4" />,
  security: <ShieldAlert className="h-4 w-4" />,
  general: <FolderMinus className="h-4 w-4" />,
};

export default function SpendingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [custodian, setCustodian] = useState<Custodian | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const balRes = await fetch('/api/fund/balance');
        if (!balRes.ok) {
          router.push('/login');
          return;
        }
        setBalance(await balRes.json());

        const ledRes = await fetch('/api/expenses/ledger');
        if (ledRes.ok) setLedger(await ledRes.json());

        const custRes = await fetch('/api/fund/custodian');
        if (custRes.ok) setCustodian(await custRes.json());
      } catch (err) {
        console.error('Error fetching spending data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [router]);

  const getAimLabel = (aim: string) => {
    switch (aim) {
      case 'court_case': return t('spending.categoryCourtCase');
      case 'construction': return t('spending.categoryConstruction');
      case 'security': return t('spending.categorySecurity');
      case 'general': return t('spending.categoryGeneral');
      default: return aim;
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

  const aims = ['court_case', 'construction', 'security', 'general'];

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.backToHome')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">{t('spending.title')}</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">{t('spending.subtitle')}</p>
          </div>
        </div>

        {/* Balance Hero Card */}
        {balance && (
          <Card className="border border-[#e8dcc8]/30 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif text-2xl">{t('spending.collectiveFund')}</CardTitle>
              </div>
              <CardDescription>
                {t('spending.derivedBalanceEquation')}{' '}
                <span className="font-mono bg-[#e8dcc8]/20 px-2 py-0.5 rounded text-[#16291f] text-xs font-semibold">
                  {t('spending.balanceEquation')}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-[#7C9A5E] justify-center sm:justify-start">
                    <Coins className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{t('spending.totalIn')}</span>
                  </div>
                  <p className="text-2xl font-black text-[#16291F] font-figure">€{balance.total_in.toLocaleString()}</p>
                </div>
                
                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-[#B5532E] justify-center sm:justify-start">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{t('spending.totalOut')}</span>
                  </div>
                  <p className="text-2xl font-black text-[#B5532E] font-figure">€{balance.total_out.toLocaleString()}</p>
                </div>

                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-[#C79A45] justify-center sm:justify-start">
                    <PiggyBank className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{t('spending.availableBalance')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#C79A45] font-figure">€{balance.balance.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="text-[11px] text-[#7C9A5E] bg-[#7C9A5E]/10 p-3 rounded-lg font-mono">
                {t('spending.formulaCheck')
                  .replace('{in}', balance.total_in.toLocaleString())
                  .replace('{out}', balance.total_out.toLocaleString())
                  .replace('{balance}', balance.balance.toLocaleString())}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Allocation card (Col 1 & 2) */}
          {ledger && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-[#7C9A5E]" />
                  <CardTitle className="font-serif text-xl">{t('spending.byAim')}</CardTitle>
                </div>
                <CardDescription>{t('spending.byAimDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {aims.map((aim) => {
                  const amount = (ledger as any)[aim] as number;
                  const pct = ledger.percentages?.[aim] ?? 0;
                  return (
                    <div key={aim} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#16291F]">
                          {AIM_ICONS[aim]}
                          <span>{getAimLabel(aim)}</span>
                        </div>
                        <span className="font-mono text-[#7C9A5E] font-semibold">
                          €{amount.toLocaleString()} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress 
                        value={pct}
                        indicatorClassName={
                          aim === 'court_case' 
                            ? 'bg-[#B5532E]' 
                            : aim === 'construction' 
                            ? 'bg-[#C79A45]' 
                            : aim === 'security' 
                            ? 'bg-[#7C9A5E]' 
                            : 'bg-gray-500'
                        }
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Custodian details card (Col 3) */}
          {custodian && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#C79A45]" />
                  <CardTitle className="font-serif text-xl">{t('spending.custodianTitle')}</CardTitle>
                </div>
                <CardDescription>{t('spending.custodianDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg p-3">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('spending.custodianEntity')}</span>
                    <p className="text-sm font-semibold text-[#16291F] mt-0.5">{custodian.custodian_name || t('spending.notRecorded')}</p>
                  </div>

                  <div className="bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg p-3">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('spending.accountMasked')}</span>
                    <p className="text-sm font-mono text-[#16291F] mt-0.5">{custodian.account_masked || t('spending.notRecorded')}</p>
                  </div>

                  <div className="bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg p-3">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">{t('spending.lastReconciled')}</span>
                    <p className="text-sm font-semibold text-[#16291F] mt-0.5">
                      {custodian.last_reconciled_at
                        ? new Date(custodian.last_reconciled_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : t('spending.notReconciled')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Itemized ledger table */}
        {ledger && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif text-2xl">{t('spending.ledgerTitle')}</CardTitle>
              </div>
              <CardDescription>{t('spending.ledgerDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {ledger.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('spending.dateHeader')}</TableHead>
                      <TableHead>{t('spending.description')}</TableHead>
                      <TableHead>{t('spending.aimHeader')}</TableHead>
                      <TableHead className="text-right">{t('spending.amountHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-[#e8dcc8]/20">
                        <TableCell className="font-mono text-xs font-semibold py-4 text-[#16291f]">
                          {new Date(item.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="py-4 font-semibold text-[#16291F]">{item.description}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant={AIM_BADGE_VARIANTS[item.aim] || 'secondary'} className="font-bold">
                            <span className="flex items-center gap-1.5">
                              {AIM_ICONS[item.aim]}
                              {getAimLabel(item.aim)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-[#B5532E] py-4">
                          €{item.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-[#7C9A5E] text-sm italic text-center py-8">{t('spending.empty')}</p>
              )}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
