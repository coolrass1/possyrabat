'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Case, CaseStep, CaseDocument, CaseAction } from '@/lib/types';

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
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [showStepForm, setShowStepForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseForm, setCaseForm] = useState({
    title: '',
    opposing_party: '',
    court: '',
    stage: 'filed' as Case['stage'],
    summary: '',
    opened_date: new Date().toISOString().split('T')[0],
    next_hearing_date: '',
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
        // Check if user is authenticated and get role
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profileData = await profileRes.json();
        setUserRole(profileData.role);

        // Fetch members for name resolution and the assignee picker
        const membersRes = await fetch('/api/parcel-holdings/all');
        if (membersRes.ok) {
          setMembers(await membersRes.json());
        }

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

            // Fetch documents
            const docsRes = await fetch(`/api/case/${firstCase.id}/documents`);
            if (docsRes.ok) {
              setDocuments(await docsRes.json());
            }

            // Fetch actions
            const actionsRes = await fetch(`/api/case/${firstCase.id}/actions`);
            if (actionsRes.ok) {
              setActions(await actionsRes.json());
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
    const diff = Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderCaseForm = () => (
    <form onSubmit={handleSaveCase} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">Title</label>
          <input
            type="text"
            required
            value={caseForm.title}
            onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">Opposing Party</label>
          <input
            type="text"
            required
            value={caseForm.opposing_party}
            onChange={(e) => setCaseForm({ ...caseForm, opposing_party: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">Court</label>
          <input
            type="text"
            required
            value={caseForm.court}
            onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">Stage</label>
          <select
            value={caseForm.stage}
            onChange={(e) => setCaseForm({ ...caseForm, stage: e.target.value as Case['stage'] })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          >
            {CASE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">Opened Date</label>
          <input
            type="date"
            required
            value={caseForm.opened_date}
            onChange={(e) => setCaseForm({ ...caseForm, opened_date: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#16291F] mb-2">
            Next Hearing Date
          </label>
          <input
            type="date"
            value={caseForm.next_hearing_date}
            onChange={(e) => setCaseForm({ ...caseForm, next_hearing_date: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[#16291F] mb-2">Summary</label>
        <textarea
          value={caseForm.summary}
          onChange={(e) => setCaseForm({ ...caseForm, summary: e.target.value })}
          className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
          rows={3}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
        >
          {caseData ? 'Save Changes' : 'Create Case'}
        </button>
        <button
          type="button"
          onClick={() => setShowCaseForm(false)}
          className="px-4 py-2 bg-[#E8DCC8] text-[#16291F] rounded-md hover:bg-[#dccbb0] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );

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
        <main className="max-w-6xl mx-auto p-8">
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
            {showCaseForm && userRole !== 'member' ? (
              <>
                <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Create Case</h2>
                {renderCaseForm()}
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">No Case Found</h2>
                <p className="text-[#16291F]">The case record has not been created yet.</p>
                {userRole !== 'member' && (
                  <button
                    onClick={openCaseForm}
                    className="mt-6 px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
                  >
                    Create Case
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const daysUntilHearing = getDaysUntilHearing();

  return (
    <div className="min-h-screen bg-[#16291F]">

      <main className="max-w-6xl mx-auto p-8">
        {/* Case Header */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
          {showCaseForm && userRole !== 'member' ? (
            <>
              <h2 className="text-2xl font-bold text-[#16291F] mb-6 font-serif">Edit Case</h2>
              {renderCaseForm()}
            </>
          ) : (
          <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#16291F] mb-2 font-serif">{caseData.title}</h1>
              <p className="text-[#7C9A5E] text-lg">
                {caseData.opposing_party} • {caseData.court}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 rounded-full text-white font-semibold text-sm"
                style={{ backgroundColor: STAGE_COLORS[caseData.stage] || '#7C9A5E' }}
              >
                {caseData.stage}
              </div>
              {userRole !== 'member' && (
                <button
                  onClick={openCaseForm}
                  className="px-3 py-1 text-sm bg-[#C79A45] text-white rounded hover:bg-[#b3892f] transition-colors"
                >
                  Edit
                </button>
              )}
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
          </>
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
                        <p className="text-xs text-[#7C9A5E] mt-3">Logged by {memberName(step.logged_by)}</p>
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

        {/* Documents Section */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#16291F] font-serif">Case Documents</h2>
            {userRole !== 'member' && (
              <label className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors cursor-pointer">
                Upload Document
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

          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex justify-between items-center p-4 bg-white rounded-lg border border-[#E8DCC8] hover:bg-[#F9F5F0]"
                >
                  <div className="flex-1">
                    <a
                      href={`/api/case/${caseData.id}/documents/${doc.id}`}
                      download={doc.filename}
                      className="font-semibold text-[#B5532E] hover:underline"
                    >
                      {doc.filename}
                    </a>
                    <p className="text-xs text-[#7C9A5E]">
                      Uploaded {formatDate(doc.created_at)} by {memberName(doc.uploaded_by)}
                    </p>
                  </div>
                  {userRole !== 'member' && (
                    <button
                      onClick={async () => {
                        if (
                          confirm('Delete this document?')
                        ) {
                          await fetch(`/api/case/${caseData?.id}/documents/${doc.id}`, {
                            method: 'DELETE',
                          });
                          setDocuments(documents.filter((d) => d.id !== doc.id));
                        }
                      }}
                      className="ml-4 px-3 py-1 text-sm bg-[#B5532E] text-white rounded hover:bg-[#9d4520] transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#7C9A5E] text-center py-8">No documents uploaded yet.</p>
          )}
        </div>

        {/* Action Items Section */}
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#16291F] font-serif">Action Items</h2>
            {userRole !== 'member' && (
              <button
                onClick={() => setShowActionForm(!showActionForm)}
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                {showActionForm ? 'Cancel' : 'Create Action'}
              </button>
            )}
          </div>

          {showActionForm && userRole !== 'member' && (
            <form
              onSubmit={handleCreateAction}
              className="mb-8 p-6 bg-[#F9F5F0] rounded-lg border border-[#E8DCC8]"
            >
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Task</label>
                <input
                  type="text"
                  required
                  value={actionForm.task}
                  onChange={(e) => setActionForm({ ...actionForm, task: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">
                    Assigned To
                  </label>
                  <select
                    required
                    value={actionForm.assigned_to}
                    onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  >
                    <option value="">Select a member…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={actionForm.due_date}
                    onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                Create Action
              </button>
            </form>
          )}

          {actions.length > 0 ? (
            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    action.status === 'done'
                      ? 'bg-[#7C9A5E] bg-opacity-10 border-[#7C9A5E]'
                      : 'bg-white border-[#B5532E]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          action.status === 'done' ? 'line-through text-[#7C9A5E]' : 'text-[#16291F]'
                        }`}
                      >
                        {action.task}
                      </p>
                      <div className="flex gap-4 text-xs text-[#7C9A5E] mt-2">
                        <span>Assigned to: {memberName(action.assigned_to)}</span>
                        <span>Due: {formatDate(action.due_date)}</span>
                        <span>Status: {action.status}</span>
                      </div>
                    </div>
                    {userRole !== 'member' && (
                      <button
                        onClick={() => handleToggleActionStatus(action)}
                        className={`ml-4 px-3 py-1 text-sm rounded transition-colors ${
                          action.status === 'open'
                            ? 'bg-[#7C9A5E] text-white hover:bg-[#6a8a4f]'
                            : 'bg-[#B5532E] text-white hover:bg-[#9d4520]'
                        }`}
                      >
                        {action.status === 'open' ? 'Mark Done' : 'Reopen'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#7C9A5E] text-center py-8">No action items created yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
