'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting, MeetingDecision } from '@/lib/types';

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [newDecisionText, setNewDecisionText] = useState('');

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

  const selectMeeting = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/decisions`);
      if (res.ok) {
        setDecisions(await res.json());
      }
    } catch (err) {
      console.error('Error fetching decisions:', err);
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
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16291F]">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
          <div className="flex gap-4">
            <a href="/" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Home</a>
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
        <h2 className="text-3xl font-bold text-[#F3ECDD] mb-8 font-serif">Meetings</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Meetings List */}
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-[#16291F] mb-4">All Meetings</h3>

            {meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => selectMeeting(meeting)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedMeeting?.id === meeting.id
                        ? 'bg-[#7C9A5E] text-white'
                        : 'bg-white text-[#16291F] hover:bg-[#F9F5F0]'
                    }`}
                  >
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="text-xs opacity-75">{formatDate(meeting.date)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[#7C9A5E] text-center py-8">No meetings yet</p>
            )}
          </div>

          {/* Meeting Details */}
          {selectedMeeting && (
            <div className="md:col-span-2">
              <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-6">
                <h3 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">
                  {selectedMeeting.title}
                </h3>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-[#7C9A5E]">Date & Time</p>
                    <p className="text-[#16291F]">{formatDate(selectedMeeting.date)}</p>
                  </div>

                  {selectedMeeting.notes && (
                    <div>
                      <p className="text-sm text-[#7C9A5E]">Notes</p>
                      <p className="text-[#16291F]">{selectedMeeting.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-[#7C9A5E]">Attendees ({selectedMeeting.attendees.length})</p>
                    <p className="text-xs text-[#16291F]">{selectedMeeting.attendees.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Decisions */}
              <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
                <h4 className="text-lg font-semibold text-[#16291F] mb-4">Decisions</h4>

                {decisions.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="p-4 rounded-lg border-l-4 border-[#7C9A5E] bg-white"
                      >
                        <p className="text-[#16291F]">{decision.description}</p>
                        <p className="text-xs text-[#7C9A5E] mt-2">
                          Decided by {decision.decided_by} on {formatDate(decision.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#7C9A5E] text-center py-4">No decisions recorded yet</p>
                )}

                {/* Add Decision (Committee Only) */}
                {userRole !== 'member' && (
                  <form onSubmit={addDecision} className="mt-6 pt-6 border-t border-[#E8DCC8]">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-[#16291F] mb-2">
                        Add Decision
                      </label>
                      <textarea
                        value={newDecisionText}
                        onChange={(e) => setNewDecisionText(e.target.value)}
                        placeholder="What was decided?"
                        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                        rows={2}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newDecisionText.trim()}
                      className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] disabled:opacity-50 transition-colors"
                    >
                      Record Decision
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
