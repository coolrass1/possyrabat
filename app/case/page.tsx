'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/components/LanguageProvider';
import { Case, CaseStep, CaseDocument, CaseAction } from '@/lib/types';
import { 
  Gavel, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Upload, 
  Trash2, 
  Plus, 
  CheckSquare, 
  Square,
  FileText,
  DollarSign,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface MemberOption {
  id: string;
  name: string | null;
  email: string;
}

const CASE_STAGES: Case['stage'][] = [
  'filed',
  'in progress',
  'hearing scheduled',
  'awaiting ruling',
  'ruling given',
  'appeal',
  'resolved',
  'closed',
];

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

const STEP_TYPE_LABELS: Record<string, string> = {
  court_ruling: 'Court Ruling',
  lawyer_advice: 'Lawyer Advice',
  hearing: 'Hearing',
  filing: 'Filing',
  group_decision: 'Group Decision',
  other: 'Other',
};

const STEP_TYPE_BADGES: Record<string, 'default' | 'brass' | 'moss' | 'clay' | 'destructive' | 'secondary'> = {
  court_ruling: 'destructive',
  lawyer_advice: 'brass',
  hearing: 'clay',
  filing: 'secondary',
  group_decision: 'moss',
  other: 'default',
};

export default function CasePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<CaseStep[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [actions, setActions] = useState<CaseAction[]>([]);
  
  const localizedStepTypeLabels: Record<string, string> = {
    court_ruling: t('case.stepTypeCourtRuling'),
    lawyer_advice: t('case.stepTypeLawyerAdvice'),
    hearing: t('case.stepTypeHearing'),
    filing: t('case.stepTypeFiling'),
    group_decision: t('case.stepTypeGroupDecision'),
    other: t('case.stepTypeOther'),
  };
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [showStepForm, setShowStepForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseCosts, setCaseCosts] = useState<number>(0);
  
  const [caseForm, setCaseForm] = useState({
    title: '',
    opposing_party: '',
    court: '',
    stage: 'filed' as Case['stage'],
    summary: '',
    opened_date: new Date().toISOString().split('T')[0],
    next_hearing_date: '',
    lawyer_name: '',
    lawyer_contact: '',
  });
  
  const [stepForm, setStepForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'other' as const,
  });
  
  const [actionForm, setActionForm] = useState({
    task: '',
    assigned_to: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profileData = await profileRes.json();
        setUserRole(profileData.role);

        const membersRes = await fetch('/api/parcel-holdings/all');
        if (membersRes.ok) {
          setMembers(await membersRes.json());
        }

        const casesRes = await fetch('/api/case');
        if (casesRes.ok) {
          const cases = await casesRes.json();
          if (Array.isArray(cases) && cases.length > 0) {
            const firstCase = cases[0];
            setCaseData(firstCase);

            const timelineRes = await fetch(`/api/case/${firstCase.id}/timeline`);
            if (timelineRes.ok) {
              setTimeline(await timelineRes.json());
            }

            const docsRes = await fetch(`/api/case/${firstCase.id}/documents`);
            if (docsRes.ok) {
              setDocuments(await docsRes.json());
            }

            const actionsRes = await fetch(`/api/case/${firstCase.id}/actions`);
            if (actionsRes.ok) {
              setActions(await actionsRes.json());
            }

            const costsRes = await fetch('/api/case/costs');
            if (costsRes.ok) {
              setCaseCosts((await costsRes.json()).total || 0);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;

    try {
      const res = await fetch(`/api/case/${caseData.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(stepForm.date).getTime(),
          description: stepForm.description,
          type: stepForm.type,
          document_url: null,
        }),
      });

      if (res.ok) {
        const newStep = await res.json();
        setTimeline([...timeline, newStep].sort((a, b) => a.date - b.date));
        setStepForm({
          date: new Date().toISOString().split('T')[0],
          description: '',
          type: 'other',
        });
        setShowStepForm(false);
      }
    } catch (err) {
      console.error('Error adding step:', err);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;

    try {
      const res = await fetch(`/api/case/${caseData.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: actionForm.task,
          assigned_to: actionForm.assigned_to,
          due_date: new Date(actionForm.due_date).getTime(),
        }),
      });

      if (res.ok) {
        const newAction = await res.json();
        setActions([...actions, newAction].sort((a, b) => a.due_date - b.due_date));
        setActionForm({
          task: '',
          assigned_to: '',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setShowActionForm(false);
      }
    } catch (err) {
      console.error('Error creating action:', err);
    }
  };

  const handleToggleActionStatus = async (action: CaseAction) => {
    try {
      const res = await fetch(`/api/case/${caseData?.id}/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action.status === 'open' ? 'done' : 'open',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActions(actions.map((a) => (a.id === updated.id ? updated : a)));
      }
    } catch (err) {
      console.error('Error updating action:', err);
    }
  };

  const memberName = (id: string) => {
    const m = members.find((mm) => mm.id === id);
    return m ? m.name || m.email : id;
  };

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: caseForm.title,
      opposing_party: caseForm.opposing_party,
      court: caseForm.court,
      stage: caseForm.stage,
      summary: caseForm.summary || null,
      opened_date: new Date(caseForm.opened_date).getTime(),
      next_hearing_date: caseForm.next_hearing_date
        ? new Date(caseForm.next_hearing_date).getTime()
        : null,
      lawyer_name: caseForm.lawyer_name || null,
      lawyer_contact: caseForm.lawyer_contact || null,
    };

    try {
      const res = caseData
        ? await fetch(`/api/case/${caseData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        setCaseData(await res.json());
        setShowCaseForm(false);
      }
    } catch (err) {
      console.error('Error saving case:', err);
    }
  };

  const openCaseForm = () => {
    if (caseData) {
      setCaseForm({
        title: caseData.title,
        opposing_party: caseData.opposing_party,
        court: caseData.court,
        stage: caseData.stage,
        summary: caseData.summary || '',
        opened_date: new Date(caseData.opened_date).toISOString().split('T')[0],
        next_hearing_date: caseData.next_hearing_date
          ? new Date(caseData.next_hearing_date).toISOString().split('T')[0]
          : '',
        lawyer_name: caseData.lawyer_name || '',
        lawyer_contact: caseData.lawyer_contact || '',
      });
    }
    setShowCaseForm(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilHearing = () => {
    if (!caseData?.next_hearing_date) return null;
    const today = new Date();
    const hearing = new Date(caseData.next_hearing_date);
    return Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderCaseForm = () => (
    <form onSubmit={handleSaveCase} className="space-y-4 text-[#16291F]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Case Title</label>
          <input
            type="text"
            required
            value={caseForm.title}
            onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Opposing Party</label>
          <input
            type="text"
            required
            value={caseForm.opposing_party}
            onChange={(e) => setCaseForm({ ...caseForm, opposing_party: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Jurisdiction / Court</label>
          <input
            type="text"
            required
            value={caseForm.court}
            onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Dispute Stage</label>
          <select
            value={caseForm.stage}
            onChange={(e) => setCaseForm({ ...caseForm, stage: e.target.value as Case['stage'] })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          >
            {CASE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Filing / Opened Date</label>
          <input
            type="date"
            required
            value={caseForm.opened_date}
            onChange={(e) => setCaseForm({ ...caseForm, opened_date: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">
            Next Hearing Date
          </label>
          <input
            type="date"
            value={caseForm.next_hearing_date}
            onChange={(e) => setCaseForm({ ...caseForm, next_hearing_date: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Plain-Language Summary</label>
        <textarea
          value={caseForm.summary}
          onChange={(e) => setCaseForm({ ...caseForm, summary: e.target.value })}
          className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Assigned Lawyer Name</label>
          <input
            value={caseForm.lawyer_name}
            onChange={(e) => setCaseForm({ ...caseForm, lawyer_name: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7C9A5E] mb-1.5">Lawyer Contact Info</label>
          <input
            value={caseForm.lawyer_contact}
            onChange={(e) => setCaseForm({ ...caseForm, lawyer_contact: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45] bg-[#f9f5f0] text-sm"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="moss">
          {caseData ? 'Save Changes' : 'Create Case'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowCaseForm(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Case File...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#16291F] pb-16">
        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          <div className="flex items-center gap-4 border-b border-[#e8dcc8]/20 pb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">The Court Case</h1>
          </div>

          <Card>
            <CardContent className="p-8">
              {showCaseForm && userRole !== 'member' ? (
                <>
                  <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Create Judicial Dispute</h2>
                  {renderCaseForm()}
                </>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#B5532E]/10 flex items-center justify-center text-[#B5532E] mx-auto">
                    <Gavel className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#16291F] font-serif">No Active Case Found</h2>
                  <p className="text-[#7C9A5E] max-w-md mx-auto text-sm">
                    There are no current legal disputes tracked. If you are an administrator, you can initialize a case below.
                  </p>
                  {userRole !== 'member' && (
                    <Button variant="clay" onClick={openCaseForm}>
                      Create Judicial Case
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const daysUntilHearing = getDaysUntilHearing();

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F] shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4 mr-2" /> Home
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">{caseData.title}</h1>
                <Badge variant={STAGE_BADGES[caseData.stage.toLowerCase()] || 'moss'}>
                  {caseData.stage}
                </Badge>
              </div>
              <p className="text-[#7C9A5E] text-sm mt-1">
                Opponent: <strong className="text-[#F3ECDD]">{caseData.opposing_party}</strong> • Filed in <strong className="text-[#F3ECDD]">{caseData.court}</strong>
              </p>
            </div>
          </div>
          {userRole !== 'member' && !showCaseForm && (
            <Button variant="brass" onClick={openCaseForm}>
              Edit Case Details
            </Button>
          )}
        </div>

        {/* Case Details Cards */}
        {showCaseForm && userRole !== 'member' ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Judicial Dispute</CardTitle>
              <CardDescription>Modify status parameters, opponent records and lawyer coordinates</CardDescription>
            </CardHeader>
            <CardContent>
              {renderCaseForm()}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Overview & Summary (Col 1 & 2) */}
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-[#7C9A5E]">
                    <Briefcase className="h-5 w-5" />
                    <CardTitle className="text-xl font-serif">Case Overview</CardTitle>
                  </div>
                  <CardDescription>Plain-language standing summary for all members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {caseData.summary ? (
                    <p className="text-[#16291F] leading-relaxed text-sm md:text-base bg-[#e8dcc8]/20 p-4 rounded-lg border border-[#e8dcc8]/40">
                      {caseData.summary}
                    </p>
                  ) : (
                    <p className="text-[#7C9A5E] italic text-sm">No summary description uploaded.</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7C9A5E]">
                        <User className="h-4 w-4" /> Assigned Lawyer
                      </div>
                      {caseData.lawyer_name ? (
                        <div className="text-sm">
                          <p className="font-bold text-[#16291F]">{caseData.lawyer_name}</p>
                          {caseData.lawyer_contact && (
                            <p className="text-[#7C9A5E] text-xs mt-1 flex items-center gap-1.5 font-mono">
                              <Phone className="h-3 w-3" /> {caseData.lawyer_contact}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[#7C9A5E] text-xs italic">Not assigned</p>
                      )}
                    </div>

                    <div className="bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7C9A5E]">
                        <DollarSign className="h-4 w-4" /> Legal Expenses
                      </div>
                      <div>
                        <p className="text-2xl font-black text-[#C79A45] font-figure">
                          €{caseCosts.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#7C9A5E] mt-1">
                          Pulled dynamically from the collective ledger.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-serif">Dispute Timeline</CardTitle>
                    <CardDescription>Chronological ledger of court dates and filings</CardDescription>
                  </div>
                  {userRole !== 'member' && (
                    <Button variant="outline" size="sm" onClick={() => setShowStepForm(!showStepForm)}>
                      {showStepForm ? 'Cancel' : 'Log New Event'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Event Form */}
                  {showStepForm && userRole !== 'member' && (
                    <form onSubmit={handleAddStep} className="p-4 bg-[#f9f5f0] border border-[#E8DCC8] rounded-lg space-y-4">
                      <h4 className="font-bold text-[#16291F] text-sm">Log Event Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Event Date</label>
                          <input
                            type="date"
                            required
                            value={stepForm.date}
                            onChange={(e) => setStepForm({ ...stepForm, date: e.target.value })}
                            className="w-full px-3 py-1.5 border border-[#E8DCC8] rounded-md bg-white text-xs text-[#16291F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Event Type</label>
                          <select
                            value={stepForm.type}
                            onChange={(e) => setStepForm({ ...stepForm, type: e.target.value as any })}
                            className="w-full px-3 py-1.5 border border-[#E8DCC8] rounded-md bg-white text-xs text-[#16291F]"
                          >
                            {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Description</label>
                        <textarea
                          required
                          value={stepForm.description}
                          onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md bg-white text-xs text-[#16291F]"
                          rows={3}
                          placeholder="Summarize what happened or what was advised..."
                        />
                      </div>
                      <Button type="submit" variant="moss" size="sm">
                        Log Event
                      </Button>
                    </form>
                  )}

                  {/* Timeline listing */}
                  {timeline.length > 0 ? (
                    <div className="space-y-6 relative pl-6 border-l-2 border-[#e8dcc8]">
                      {timeline.map((step) => (
                        <div key={step.id} className="relative space-y-1 group">
                          {/* Dot marker */}
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#C79A45] border-4 border-[#f3ecdd] z-10 transition-transform duration-300 group-hover:scale-125" />
                          
                          <div className="bg-[#f9f5f0] border border-[#e8dcc8] rounded-lg p-4 hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-[#16291F]">
                                  {STEP_TYPE_LABELS[step.type]}
                                </span>
                                <Badge variant={STEP_TYPE_BADGES[step.type] || 'secondary'} className="text-[9px] px-1.5 py-0.25">
                                  {step.type}
                                </Badge>
                              </div>
                              <span className="text-xs text-[#7C9A5E] font-semibold flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" /> {formatDate(step.date)}
                              </span>
                            </div>
                            <p className="text-[#16291F] text-sm leading-relaxed">{step.description}</p>
                            <div className="border-t border-[#e8dcc8]/40 mt-3 pt-2 flex justify-between items-center text-[10px] text-[#7C9A5E]">
                              <span>Logged by: {memberName(step.logged_by)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#7C9A5E] space-y-2">
                      <FileText className="h-8 w-8 mx-auto text-[#7C9A5E]/40" />
                      <p className="text-sm">No timeline events logged yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hearing Countdown, Documents & Actions (Col 3) */}
            <div className="space-y-8">
              
              {/* Countdown */}
              {daysUntilHearing !== null && (
                <Card className="overflow-hidden border-l-4 border-l-[#B5532E] relative bg-[#B5532E]/5">
                  <div className="absolute right-2 top-2 opacity-5">
                    <Gavel className="h-20 w-20 text-[#B5532E]" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif text-[#B5532E]">Judicial Hearing Clock</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-[#7C9A5E]">Next Date Scheduled</p>
                    <p className="text-lg font-bold text-[#16291F]">{formatDate(caseData.next_hearing_date!)}</p>
                    
                    <div className="bg-[#B5532E]/10 p-3 rounded text-center">
                      <span className="text-[10px] uppercase font-bold text-[#B5532E] tracking-wider">countdown</span>
                      <p className="text-3xl font-black text-[#B5532E] font-figure mt-0.5">
                        {daysUntilHearing > 0
                          ? `${daysUntilHearing} Days`
                          : daysUntilHearing === 0
                          ? 'Today'
                          : `${Math.abs(daysUntilHearing)} Days Ago`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-serif">Dispute Papers</CardTitle>
                    {userRole !== 'member' && (
                      <label className="inline-flex items-center justify-center rounded-md text-xs font-semibold px-2 py-1 bg-[#7C9A5E] text-white hover:bg-[#6a8a4f] cursor-pointer transition-colors">
                        <Upload className="h-3 w-3 mr-1" /> Upload
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && caseData) {
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await fetch(`/api/case/${caseData.id}/documents`, {
                                  method: 'POST',
                                  body: formData,
                                });
                                if (res.ok) {
                                  const newDoc = await res.json();
                                  setDocuments([...documents, newDoc]);
                                }
                              } catch (err) {
                                console.error('Error uploading document:', err);
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <CardDescription>Shared folders containing evidence and writs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {documents.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-3 bg-[#f9f5f0] border border-[#e8dcc8] rounded-lg flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <a
                              href={`/api/case/${caseData.id}/documents/${doc.id}`}
                              download={doc.filename}
                              className="font-bold text-[#B5532E] hover:underline flex items-center gap-1 truncate"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" /> 
                              <span className="truncate">{doc.filename}</span>
                            </a>
                            <p className="text-[10px] text-[#7C9A5E]">
                              {formatDate(doc.created_at)} by {memberName(doc.uploaded_by)}
                            </p>
                          </div>
                          {userRole !== 'member' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={async () => {
                                if (confirm('Delete this document?')) {
                                  await fetch(`/api/case/${caseData?.id}/documents/${doc.id}`, {
                                    method: 'DELETE',
                                  });
                                  setDocuments(documents.filter((d) => d.id !== doc.id));
                                }
                              }}
                              className="h-7 w-7 text-[#B5532E] hover:bg-[#B5532E]/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#7C9A5E] text-xs italic text-center py-6">No documents shared yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-serif">Action Roster</CardTitle>
                    {userRole !== 'member' && (
                      <Button variant="outline" size="sm" onClick={() => setShowActionForm(!showActionForm)} className="h-7 px-2 text-xs">
                        {showActionForm ? 'Cancel' : 'Add Task'}
                      </Button>
                    )}
                  </div>
                  <CardDescription>Legal chores assigned during cooperation council</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {/* Action form */}
                  {showActionForm && userRole !== 'member' && (
                    <form onSubmit={handleCreateAction} className="p-3 bg-[#f9f5f0] border border-[#e8dcc8] rounded-lg space-y-3 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Chore / Task</label>
                        <input
                          type="text"
                          required
                          value={actionForm.task}
                          onChange={(e) => setActionForm({ ...actionForm, task: e.target.value })}
                          className="w-full px-2 py-1 border border-[#E8DCC8] bg-white rounded text-xs"
                          placeholder="e.g. Gather parcel receipts..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Assignee</label>
                          <select
                            required
                            value={actionForm.assigned_to}
                            onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}
                            className="w-full px-2 py-1 border border-[#E8DCC8] bg-white rounded text-xs"
                          >
                            <option value="">Choose...</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.email}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-[#7C9A5E] mb-1">Due Date</label>
                          <input
                            type="date"
                            required
                            value={actionForm.due_date}
                            onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                            className="w-full px-2 py-1 border border-[#E8DCC8] bg-white rounded text-xs"
                          />
                        </div>
                      </div>
                      <Button type="submit" variant="moss" size="sm" className="w-full h-8">
                        Assign Task
                      </Button>
                    </form>
                  )}

                  {/* Actions listing */}
                  {actions.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {actions.map((action) => (
                        <div
                          key={action.id}
                          className={`p-3 rounded-lg border-l-4 text-xs transition-all duration-200 ${
                            action.status === 'done'
                              ? 'bg-[#7C9A5E]/10 border-[#7C9A5E]'
                              : 'bg-[#f9f5f0] border-[#B5532E]'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <p className={`font-semibold ${action.status === 'done' ? 'line-through text-[#7C9A5E]' : 'text-[#16291F]'}`}>
                                {action.task}
                              </p>
                              <div className="text-[10px] text-[#7C9A5E] space-y-0.5">
                                <p>Assignee: <strong className="text-[#16291F]/80">{memberName(action.assigned_to)}</strong></p>
                                <p className="font-mono">Due: {formatDate(action.due_date)}</p>
                              </div>
                            </div>
                            {userRole !== 'member' && (
                              <Button
                                size="sm"
                                variant={action.status === 'open' ? 'moss' : 'clay'}
                                onClick={() => handleToggleActionStatus(action)}
                                className="h-6 px-2 text-[10px] shrink-0"
                              >
                                {action.status === 'open' ? 'Done' : 'Reopen'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#7C9A5E] text-xs italic text-center py-6">No tasks currently assigned.</p>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
