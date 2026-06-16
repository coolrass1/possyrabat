'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Case, CaseStep } from '@/lib/types';

const STAGE_COLORS: Record<string, string> = {
  'filed': '#7C9A5E',
  'in progress': '#C79A45',
  'hearing scheduled': '#B5532E',
  'awaiting ruling': '#8B6F47',
  'ruling given': '#9d4520',
  'appeal': '#C79A45',
  'resolved': '#7C9A5E',
  'closed': '#5A7045',
};

const STEP_TYPE_LABELS: Record<string, string> = {
  court_ruling: 'Court Ruling',
  lawyer_advice: 'Lawyer Advice',
  hearing: 'Hearing',
  filing: 'Filing',
  group_decision: 'Group Decision',
  other: 'Other',
};

export default function CasePage() {
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<CaseStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showStepForm, setShowStepForm] = useState(false);
  const [stepForm, setStepForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'other' as const,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated and get role
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profileData = await profileRes.json();
        setUserRole(profileData.role);

        // For now, fetch the first case if it exists
        // In a real app, this would be parameterized from route
        const casesRes = await fetch('/api/case');
        if (casesRes.ok) {
          const cases = await casesRes.json();
          if (Array.isArray(cases) && cases.length > 0) {
            const firstCase = cases[0];
            setCaseData(firstCase);

            // Fetch timeline
            const timelineRes = await fetch(`/api/case/${firstCase.id}/timeline`);
            if (timelineRes.ok) {
              setTimeline(await timelineRes.json());
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
    const diff = Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#16291F]">
        <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-4 py-2 bg-[#B5532E] hover:bg-[#9d4520] rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto p-8">
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">No Case Found</h2>
            <p className="text-[#16291F]">The case record has not been created yet.</p>
          </div>
        </main>
      </div>
    );
  }

  const daysUntilHearing = getDaysUntilHearing();

  return (
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
          <div className="flex gap-4">
            <a href="/" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Home</a>
            <a href="/land" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Land</a>
            <a href="/contributions" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Contributions</a>
            <a href="/spending" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Spending</a>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-4 py-2 bg-[#B5532E] hover:bg-[#9d4520] rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {/* Case Header */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#16291F] mb-2 font-serif">{caseData.title}</h1>
              <p className="text-[#7C9A5E] text-lg">
                {caseData.opposing_party} • {caseData.court}
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-full text-white font-semibold text-sm"
              style={{ backgroundColor: STAGE_COLORS[caseData.stage] || '#7C9A5E' }}
            >
              {caseData.stage}
            </div>
          </div>

          {caseData.summary && (
            <p className="text-[#16291F] text-base leading-relaxed mb-6">{caseData.summary}</p>
          )}

          {/* Hearing Countdown */}
          {daysUntilHearing !== null && (
            <div className="bg-[#B5532E] bg-opacity-10 border-l-4 border-[#B5532E] p-4 rounded">
              <p className="text-[#B5532E] font-semibold">
                Next Hearing: {formatDate(caseData.next_hearing_date!)}
              </p>
              <p className="text-[#16291F] text-sm mt-1">
                {daysUntilHearing > 0
                  ? `${daysUntilHearing} days from now`
                  : daysUntilHearing === 0
                  ? 'Today'
                  : `${Math.abs(daysUntilHearing)} days ago`}
              </p>
            </div>
          )}
        </div>

        {/* Case Timeline */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#16291F] font-serif">Case Timeline</h2>
            {userRole !== 'member' && (
              <button
                onClick={() => setShowStepForm(!showStepForm)}
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                {showStepForm ? 'Cancel' : 'Log Event'}
              </button>
            )}
          </div>

          {/* Add Step Form */}
          {showStepForm && userRole !== 'member' && (
            <form onSubmit={handleAddStep} className="mb-8 p-6 bg-[#F9F5F0] rounded-lg border border-[#E8DCC8]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={stepForm.date}
                    onChange={(e) => setStepForm({ ...stepForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">Type</label>
                  <select
                    value={stepForm.type}
                    onChange={(e) => setStepForm({ ...stepForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  >
                    {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Description</label>
                <textarea
                  required
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                Log Event
              </button>
            </form>
          )}

          {/* Timeline Items */}
          {timeline.length > 0 ? (
            <div className="space-y-6">
              {timeline.map((step, idx) => (
                <div key={step.id} className="relative">
                  {idx < timeline.length - 1 && (
                    <div className="absolute left-6 top-12 h-12 w-0.5 bg-[#C79A45]" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-4 h-4 rounded-full bg-[#C79A45] z-10" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg p-4 border-l-4 border-[#C79A45]">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-[#16291F]">
                            {STEP_TYPE_LABELS[step.type]}
                          </h4>
                          <span className="text-sm text-[#7C9A5E]">{formatDate(step.date)}</span>
                        </div>
                        <p className="text-[#16291F] text-sm leading-relaxed">{step.description}</p>
                        <p className="text-xs text-[#7C9A5E] mt-3">Logged by member ID: {step.logged_by}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#7C9A5E] text-center py-8">No timeline events recorded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
