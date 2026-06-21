'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting, MeetingStatus, MeetingDecision, MeetingAction, MeetingDocument } from '@/lib/types';
import { 
  Calendar, 
  Users, 
  FileText, 
  Plus, 
  Trash2, 
  CheckSquare, 
  PlusCircle, 
  AlertCircle, 
  Clock, 
  MapPin,
  ClipboardList,
  CheckCircle,
  FileDown,
  MailCheck
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function MeetingsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [newDecisionText, setNewDecisionText] = useState('');
  const [actions, setActions] = useState<MeetingAction[]>([]);
  const [newActionTask, setNewActionTask] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 16), // datetime-local
    location: '',
    agenda: '',
    notes: '',
    description: '',
    status: 'Planned' as MeetingStatus,
  });
  
  const [documents, setDocuments] = useState<MeetingDocument[]>([]);
  const [docKind, setDocKind] = useState<'minutes' | 'report' | 'other'>('report');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNotify, setDocNotify] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setUserRole(data.member.role);
          fetchMeetings();
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        setMeetings(await res.json());
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.date) return;
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingForm.title,
          date: new Date(meetingForm.date).getTime(),
          location: meetingForm.location || null,
          agenda: meetingForm.agenda || null,
          notes: meetingForm.notes || null,
          description: meetingForm.description || null,
          status: meetingForm.status,
          attendees: [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMeetings([created, ...meetings]);
        setMeetingForm({
          title: '',
          date: new Date().toISOString().slice(0, 16),
          location: '',
          agenda: '',
          notes: '',
          description: '',
          status: 'Planned',
        });
        setShowCreateForm(false);
        selectMeeting(created);
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
    }
  };

  const selectMeeting = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/decisions`);
      if (res.ok) {
        setDecisions(await res.json());
      }
      const actRes = await fetch(`/api/meetings/${meeting.id}/actions`);
      if (actRes.ok) {
        setActions(await actRes.json());
      }
      const docRes = await fetch(`/api/meetings/${meeting.id}/documents`);
      if (docRes.ok) {
        setDocuments(await docRes.json());
      }
    } catch (err) {
      console.error('Error fetching meeting details:', err);
    }
  };

  const updateMeetingStatus = async (status: MeetingStatus) => {
    if (!selectedMeeting) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedMeeting(updated);
        setMeetings(meetings.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      console.error('Error updating meeting status:', err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !docFile) return;
    setDocError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('kind', docKind);
      fd.append('notify', docNotify ? 'true' : 'false');
      const res = await fetch(`/api/meetings/${selectedMeeting.id}/documents`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const created = await res.json();
        setDocuments([created, ...documents]);
        setDocFile(null);
        setDocNotify(false);
        (document.getElementById('meeting-doc-file') as HTMLInputElement | null)?.value &&
          ((document.getElementById('meeting-doc-file') as HTMLInputElement).value = '');
      } else {
        setDocError((await res.json()).error || 'Upload failed');
      }
    } catch (err) {
      setDocError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedMeeting) return;
    if (!confirm('Delete this document?')) return;
    const res = await fetch(`/api/meetings/${selectedMeeting.id}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (res.ok) setDocuments(documents.filter((d) => d.id !== docId));
  };

  const addAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !newActionTask.trim()) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: newActionTask }),
      });
      if (res.ok) {
        setActions([...actions, await res.json()]);
        setNewActionTask('');
      }
    } catch (err) {
      console.error('Error adding action:', err);
    }
  };

  const toggleAction = async (action: MeetingAction) => {
    if (!selectedMeeting) return;
    const next = action.status === 'open' ? 'done' : 'open';
    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActions(actions.map((a) => (a.id === updated.id ? updated : a)));
      }
    } catch (err) {
      console.error('Error toggling action:', err);
    }
  };

  const addDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !newDecisionText.trim()) return;

    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDecisionText }),
      });

      if (res.ok) {
        const newDecision = await res.json();
        setDecisions([...decisions, newDecision]);
        setNewDecisionText('');
      }
    } catch (err) {
      console.error('Error adding decision:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Planned': return t('meetings.statusPlanned');
      case 'Completed': return t('meetings.statusCompleted');
      case 'Cancelled': return t('meetings.statusCancelled');
      default: return status;
    }
  };

  const STATUS_BADGES: Record<string, 'brass' | 'moss' | 'secondary'> = {
    Planned: 'brass',
    Completed: 'moss',
    Cancelled: 'secondary',
  };

  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => m.date >= now);
  const pastMeetings = meetings.filter((m) => m.date < now);

  const getDocKindLabel = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'report': return t('meetings.reportPaperOption');
      case 'minutes': return t('meetings.minutesPaperOption');
      case 'other': return t('meetings.otherPaperOption');
      default: return kind;
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

  const DOC_BADGES: Record<string, 'brass' | 'moss' | 'secondary'> = {
    report: 'brass',
    minutes: 'moss',
    other: 'secondary',
  };

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">{t('meetings.title')}</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">{t('meetings.subtitle')}</p>
          </div>
          {userRole !== 'member' && (
            <Button variant="brass" onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? t('meetings.cancelConvocations') : t('meetings.scheduleCouncil')}
            </Button>
          )}
        </div>

        {/* Create Meeting Form */}
        {userRole !== 'member' && showCreateForm && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <CardTitle>{t('meetings.scheduleCouncilMeeting')}</CardTitle>
              <CardDescription>{t('meetings.setupDetailsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMeeting} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#16291F]">
                <div>
                  <Label htmlFor="meeting-title">{t('meetings.meetingTitleLabel')}</Label>
                  <Input
                    id="meeting-title"
                    required
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    placeholder="e.g. Weekly Counsel, AGM"
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-date">{t('meetings.dateAndTimeLabel')}</Label>
                  <Input
                    id="meeting-date"
                    required
                    type="datetime-local"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-location">{t('meetings.locationLabel')}</Label>
                  <Input
                    id="meeting-location"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    placeholder={t('meetings.locationPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-status">{t('meetings.statusLabel')}</Label>
                  <Select
                    id="meeting-status"
                    value={meetingForm.status}
                    onChange={(e) =>
                      setMeetingForm({ ...meetingForm, status: e.target.value as MeetingStatus })
                    }
                  >
                    <option value="Planned">{t('meetings.statusPlanned')}</option>
                    <option value="Completed">{t('meetings.statusCompleted')}</option>
                    <option value="Cancelled">{t('meetings.statusCancelled')}</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="meeting-agenda">{t('meetings.agendaOptionalLabel')}</Label>
                  <Textarea
                    id="meeting-agenda"
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                    rows={3}
                    placeholder="e.g. Legal update overview, contribution arrears..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="meeting-description">{t('meetings.descriptionLabel')}</Label>
                  <Textarea
                    id="meeting-description"
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    rows={2}
                    placeholder={t('meetings.descriptionPlaceholder')}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="meeting-notes">{t('meetings.agenda')}</Label>
                  <Textarea
                    id="meeting-notes"
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                    rows={2}
                    placeholder="e.g. Free-form notes..."
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <Button type="submit" variant="moss">
                    {t('meetings.createMeetingButton')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Meetings List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4 border-b border-[#e8dcc8]/20">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif text-lg">{t('meetings.convocationsListTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 px-2">
              {meetings.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {([
                    { label: t('meetings.upcomingTitle'), list: upcomingMeetings },
                    { label: t('meetings.pastTitle'), list: pastMeetings },
                  ] as const).map((group) =>
                    group.list.length > 0 ? (
                      <div key={group.label} className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#7C9A5E] px-1">
                          {group.label}
                        </p>
                        {group.list.map((meeting) => (
                          <button
                            key={meeting.id}
                            onClick={() => selectMeeting(meeting)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-300 flex items-center justify-between gap-3 border ${
                              selectedMeeting?.id === meeting.id
                                ? 'bg-[#7C9A5E] text-white border-transparent shadow-md transform scale-[1.02]'
                                : 'bg-[#f9f5f0] text-[#16291F] border-[#e8dcc8]/40 hover:bg-[#e8dcc8]/35'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate">{meeting.title}</p>
                              <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formatDate(meeting.date)}
                              </p>
                            </div>
                            <Badge
                              variant={STATUS_BADGES[meeting.status] || 'secondary'}
                              className="text-[10px] shrink-0 font-mono"
                            >
                              {getStatusLabel(meeting.status)}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-[#7C9A5E] space-y-2">
                  <Calendar className="h-8 w-8 mx-auto text-[#7C9A5E]/40" />
                  <p className="text-sm">{t('meetings.noScheduledMeetings')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 2 & 3: Meeting Details & Councils Chores */}
          {selectedMeeting ? (
            <div className="lg:col-span-2 space-y-8">
              
              {/* Selected Meeting Info */}
              <Card>
                <CardHeader className="bg-[#f3ecdd] border-b border-[#e8dcc8] py-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="font-serif text-2xl text-[#16291F]">{selectedMeeting.title}</CardTitle>
                    <Badge
                      variant={STATUS_BADGES[selectedMeeting.status] || 'secondary'}
                      className="text-[10px] shrink-0 font-mono"
                    >
                      {getStatusLabel(selectedMeeting.status)}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#7C9A5E] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {formatDate(selectedMeeting.date)}
                    </span>
                    {selectedMeeting.location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {selectedMeeting.location}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {userRole !== 'member' && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="meeting-status-update" className="text-[#7C9A5E] font-bold whitespace-nowrap mb-0">
                        {t('meetings.updateStatusLabel')}
                      </Label>
                      <Select
                        id="meeting-status-update"
                        value={selectedMeeting.status}
                        onChange={(e) => updateMeetingStatus(e.target.value as MeetingStatus)}
                        className="max-w-[200px]"
                      >
                        <option value="Planned">{t('meetings.statusPlanned')}</option>
                        <option value="Completed">{t('meetings.statusCompleted')}</option>
                        <option value="Cancelled">{t('meetings.statusCancelled')}</option>
                      </Select>
                    </div>
                  )}
                  {selectedMeeting.description && (
                    <div className="bg-[#e8dcc8]/20 p-4 rounded-lg border border-[#e8dcc8]/40">
                      <Label className="text-[#16291f] font-extrabold mb-1">{t('meetings.description')}</Label>
                      <p className="text-[#16291F] text-sm leading-relaxed">{selectedMeeting.description}</p>
                    </div>
                  )}
                  {selectedMeeting.agenda && (
                    <div className="bg-[#e8dcc8]/20 p-4 rounded-lg border border-[#e8dcc8]/40">
                      <Label className="text-[#16291f] font-extrabold mb-1">{t('meetings.agenda')}</Label>
                      <p className="text-[#16291F] text-sm leading-relaxed">{selectedMeeting.agenda}</p>
                    </div>
                  )}
                  {selectedMeeting.notes && (
                    <div className="bg-[#e8dcc8]/20 p-4 rounded-lg border border-[#e8dcc8]/40">
                      <Label className="text-[#16291f] font-extrabold mb-1">{t('meetings.notesLabel')}</Label>
                      <p className="text-[#16291F] text-sm leading-relaxed">{selectedMeeting.notes}</p>
                    </div>
                  )}

                  <div className="bg-[#f9f5f0] border border-[#e8dcc8]/50 p-4 rounded-lg space-y-2">
                    <Label className="text-[#7C9A5E] font-bold mb-1">{t('meetings.rollCallAttendance')} ({selectedMeeting.attendees.length})</Label>
                    {selectedMeeting.attendees.length > 0 ? (
                      <p className="text-xs text-[#16291F] leading-relaxed font-semibold">
                        {selectedMeeting.attendees.join(', ')}
                      </p>
                    ) : (
                      <p className="text-xs text-[#7C9A5E] italic">{t('meetings.rollCallNotLogged')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Decisions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">{t('meetings.decisionsLogTitle')}</CardTitle>
                  <CardDescription>{t('meetings.directivesApprovedDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {decisions.length > 0 ? (
                    <div className="space-y-3">
                      {decisions.map((decision) => (
                        <div
                          key={decision.id}
                          className="p-4 rounded-lg border-l-4 border-[#7C9A5E] bg-[#f9f5f0] border-[#e8dcc8] text-xs space-y-1"
                        >
                          <p className="text-sm font-bold text-[#16291F]">{decision.description}</p>
                          <p className="text-[10px] text-[#7C9A5E]">
                            Logged by {decision.decided_by} on {formatDate(decision.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#7C9A5E] text-xs italic text-center py-4">{t('meetings.emptyDecisions')}</p>
                  )}

                  {/* Add Decision Form */}
                  {userRole !== 'member' && (
                    <form onSubmit={addDecision} className="mt-6 pt-6 border-t border-[#E8DCC8] space-y-3 text-[#16291F]">
                      <div>
                        <Label htmlFor="decision-text">{t('meetings.addCouncilDecisionLabel')}</Label>
                        <Textarea
                          id="decision-text"
                          value={newDecisionText}
                          onChange={(e) => setNewDecisionText(e.target.value)}
                          placeholder={t('meetings.summarizeDirectivePlaceholder')}
                          rows={2}
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="moss"
                        size="sm"
                        disabled={!newDecisionText.trim()}
                      >
                        {t('meetings.recordDecisionButton')}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Action items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">{t('meetings.councilChoresTitle')}</CardTitle>
                  <CardDescription>{t('meetings.actionItemsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {actions.length > 0 ? (
                    <div className="space-y-3">
                      {actions.map((action) => (
                        <div
                          key={action.id}
                          className={`p-4 rounded-lg border-l-4 bg-[#f9f5f0] flex items-center justify-between gap-4 text-xs transition-all ${
                            action.status === 'done'
                              ? 'border-[#7C9A5E] bg-[#7C9A5E]/5'
                              : 'border-[#C79A45]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-sm text-[#16291F] ${action.status === 'done' ? 'line-through opacity-60' : ''}`}>
                              {action.task}
                            </p>
                            {action.due_date && (
                              <p className="text-[10px] text-[#B5532E] mt-1 font-mono font-semibold">
                                {t('meetings.dueLabel')} {formatDate(action.due_date)}
                              </p>
                            )}
                          </div>
                          {userRole !== 'member' && (
                            <Button
                              size="sm"
                              variant={action.status === 'done' ? 'secondary' : 'moss'}
                              onClick={() => toggleAction(action)}
                              className="h-7 px-2.5 text-[10px]"
                            >
                              {action.status === 'done' ? t('meetings.reopenButton') : t('meetings.markDoneButton')}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#7C9A5E] text-xs italic text-center py-4">{t('meetings.emptyActions')}</p>
                  )}

                  {/* Add Action Form */}
                  {userRole !== 'member' && (
                    <form onSubmit={addAction} className="mt-6 pt-6 border-t border-[#E8DCC8] text-[#16291F]">
                      <Label htmlFor="action-task">{t('meetings.addCouncilChoreLabel')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="action-task"
                          value={newActionTask}
                          onChange={(e) => setNewActionTask(e.target.value)}
                          placeholder={t('meetings.chorePlaceholder')}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          variant="brass"
                          disabled={!newActionTask.trim()}
                        >
                          {t('meetings.addButton')}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Documents & reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">{t('meetings.documentsAndReportsTitle')}</CardTitle>
                  <CardDescription>{t('meetings.documentsAndReportsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-lg border border-[#e8dcc8] bg-[#f9f5f0] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant={DOC_BADGES[doc.kind.toLowerCase()] || 'secondary'} className="capitalize text-[10px]">
                              {getDocKindLabel(doc.kind)}
                            </Badge>
                            <a
                              href={`/api/meetings/${selectedMeeting.id}/documents/${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#16291F] font-bold truncate hover:underline flex items-center gap-1"
                            >
                              <FileDown className="h-3.5 w-3.5" /> {doc.filename}
                            </a>
                          </div>
                          {userRole !== 'member' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="h-7 w-7 p-0 text-[#B5532E] hover:bg-[#B5532E]/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#7C9A5E] text-xs italic text-center py-4">{t('meetings.noReportsUploaded')}</p>
                  )}

                  {/* Add document form */}
                  {userRole !== 'member' && (
                    <form onSubmit={handleUploadDocument} className="mt-6 pt-6 border-t border-[#E8DCC8] space-y-4 text-[#16291F]">
                      <Label>{t('meetings.uploadCouncilDocLabel')}</Label>
                      {docError && (
                        <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-2.5 rounded text-xs text-[#B5532E] flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> {docError}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col justify-center">
                          <input
                            id="meeting-doc-file"
                            type="file"
                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                            className="text-xs text-[#16291F]"
                          />
                        </div>
                        <div>
                          <Select
                            value={docKind}
                            onChange={(e) => setDocKind(e.target.value as any)}
                          >
                            <option value="report">{t('meetings.reportPaperOption')}</option>
                            <option value="minutes">{t('meetings.minutesPaperOption')}</option>
                            <option value="other">{t('meetings.otherPaperOption')}</option>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          id="meeting-doc-notify"
                          type="checkbox" 
                          checked={docNotify} 
                          onChange={(e) => setDocNotify(e.target.checked)}
                          className="h-4 w-4 rounded border-[#e8dcc8] text-[#7C9A5E] focus:ring-[#C79A45]"
                        />
                        <label htmlFor="meeting-doc-notify" className="text-xs text-[#16291F] font-semibold flex items-center gap-1">
                          <MailCheck className="h-3.5 w-3.5 text-[#7C9A5E]" /> {t('meetings.emailMembersCheckbox')}
                        </label>
                      </div>

                      <Button
                        type="submit"
                        variant="moss"
                        disabled={!docFile || uploading}
                      >
                        {uploading ? t('meetings.uploadingStatus') : t('meetings.uploadDocButton')}
                      </Button>
                      <p className="text-[10px] text-[#7C9A5E] font-mono leading-none">
                        {t('meetings.maxSizeNotice')}
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>

            </div>
          ) : (
            <Card className="lg:col-span-2 flex items-center justify-center p-12 text-center bg-[#F3ECDD]">
              <div className="space-y-3">
                <Calendar className="h-12 w-12 mx-auto text-[#7C9A5E]" />
                <h3 className="text-xl font-bold font-serif text-[#16291F]">{t('meetings.noConvocationsSelected')}</h3>
                <p className="text-[#7C9A5E] text-sm max-w-sm mx-auto">
                  {t('meetings.chooseConvocationDesc')}
                </p>
              </div>
            </Card>
          )}

        </div>

      </main>
    </div>
  );
}
