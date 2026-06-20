'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poll } from '@/lib/types';
import { Target, Plus, BarChart3, Calendar, ArrowLeft, Coins, AlertCircle, Sparkles } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Label } from '@/app/components/ui/label';

export default function PollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [results, setResults] = useState<Record<string, Record<string, number>>>({});
  
  const [formData, setFormData] = useState({
    question: '',
    choices: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setUserRole(data.member.role);
          fetchPolls();
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

  const fetchPolls = async () => {
    try {
      const res = await fetch(`/api/polls?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setPolls(data);
        // Fetch results for each poll
        const pollResults: Record<string, Record<string, number>> = {};
        for (const poll of data) {
          const pollRes = await fetch(`/api/polls/${poll.id}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            pollResults[poll.id] = pollData.choices.reduce(
              (acc: Record<string, number>, choice: string) => {
                acc[choice] = 0;
                return acc;
              },
              {}
            );
          }
        }
        setResults(pollResults);
      }
    } catch (error) {
      console.error('Failed to fetch polls:', error);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchPolls();
    }
  }, [filter, isLoading]);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const choices = formData.choices
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (!formData.question || choices.length < 2) {
        alert('Please provide a question and at least 2 choices');
        return;
      }

      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question,
          choices,
          deadline: new Date(formData.deadline).getTime(),
        }),
      });

      if (res.ok) {
        setFormData({
          question: '',
          choices: '',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        });
        setShowCreateForm(false);
        fetchPolls();
      } else {
        alert('Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Error creating poll');
    }
  };

  const handleVote = async (pollId: string, choice: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults((prev) => ({
          ...prev,
          [pollId]: data.results,
        }));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error voting');
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/close`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchPolls();
      } else {
        alert('Failed to close poll');
      }
    } catch (error) {
      console.error('Error closing poll:', error);
      alert('Error closing poll');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Polls Panel...</p>
        </div>
      </div>
    );
  }

  const isCommittee = userRole === 'committee' || userRole === 'owner';

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
              <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Council Polls</h1>
              <p className="text-[#7C9A5E] text-sm mt-0.5">Vote on cooperative decisions and verify democratic alignments.</p>
            </div>
          </div>
          {isCommittee && (
            <Button variant="brass" onClick={() => setShowCreateForm(!showCreateForm)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {showCreateForm ? 'Cancel Form' : 'Establish Poll'}
            </Button>
          )}
        </div>

        {/* Create Poll Form */}
        {isCommittee && showCreateForm && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif">New Cooperative Poll</CardTitle>
              </div>
              <CardDescription>Setup questions, list choices, and configure deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePoll} className="space-y-4 text-[#16291F]">
                <div>
                  <Label htmlFor="poll-question">Question</Label>
                  <Input
                    id="poll-question"
                    required
                    placeholder="e.g. Approve the legal defense campaign?"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="poll-choices">Choices (comma-separated)</Label>
                  <Input
                    id="poll-choices"
                    required
                    placeholder="e.g. Yes, No, Abstain"
                    value={formData.choices}
                    onChange={(e) => setFormData({ ...formData, choices: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="poll-deadline">Voting Deadline</Label>
                  <Input
                    id="poll-deadline"
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="moss" className="w-full md:w-auto">
                    Create Poll
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Buttons */}
        <div className="inline-flex bg-[#0d1a13]/80 border border-[#e8dcc8]/10 p-1.5 rounded-lg gap-1.5 w-full justify-around sm:w-auto">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-md text-xs font-bold whitespace-nowrap capitalize transition-all duration-300 ${
                filter === f
                  ? 'bg-[#C79A45] text-[#16291F] shadow-sm transform scale-[1.02]'
                  : 'text-[#F3ECDD]/80 hover:text-[#F3ECDD] hover:bg-[#16291F]'
              }`}
            >
              {f} polls
            </button>
          ))}
        </div>

        {/* Polls Listing */}
        <div className="space-y-6">
          {polls.length === 0 ? (
            <Card className="text-center p-12 bg-[#F3ECDD]/5 border border-[#7C9A5E]/20">
              <CardContent className="space-y-3">
                <BarChart3 className="h-10 w-10 mx-auto text-[#7C9A5E]" />
                <h3 className="text-lg font-bold font-serif text-[#F3ECDD]">No Polls Found</h3>
                <p className="text-[#7C9A5E] text-xs max-w-xs mx-auto">
                  There are no logs matching this category yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            polls.map((poll) => (
              <Card key={poll.id} className="border border-[#e8dcc8]/65 shadow-md">
                <CardHeader className="pb-3 border-b border-[#e8dcc8]/20 flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-serif text-[#16291F]">{poll.question}</CardTitle>
                    {poll.deadline && (
                      <CardDescription className="text-xs text-[#7C9A5E] mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" /> voting deadline till {new Date(poll.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </CardDescription>
                    )}
                  </div>
                  <div>
                    <Badge variant={poll.status === 'open' ? 'moss' : 'destructive'} className="text-xs font-bold px-3 py-0.5">
                      {poll.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Results bars */}
                  <div className="space-y-3">
                    {poll.choices.map((choice) => {
                      const pollResults = results[poll.id] || {};
                      const voteCount = pollResults[choice] || 0;
                      const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0);
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

                      return (
                        <div key={choice} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-[#16291F]">{choice}</span>
                            <span className="font-mono text-[#7C9A5E] font-semibold">
                              {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Vote Buttons (if Open) */}
                  {poll.status === 'open' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e8dcc8]/20">
                      {poll.choices.map((choice) => (
                        <Button
                          key={choice}
                          variant="outline"
                          size="sm"
                          onClick={() => handleVote(poll.id, choice)}
                          className="flex-1 bg-[#f9f5f0] text-[#16291F] hover:bg-[#C79A45] hover:text-[#16291F] border-[#e8dcc8]"
                        >
                          Vote: {choice}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Close Poll Button (Committee Only) */}
                  {isCommittee && poll.status === 'open' && (
                    <div className="pt-2 border-t border-[#e8dcc8]/20">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleClosePoll(poll.id)}
                        className="w-full sm:w-auto"
                      >
                        Close Poll Convocations
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
