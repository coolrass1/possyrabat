'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poll } from '@/lib/types';

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
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Community Polls
          </h1>
          <p className="text-lg text-[#C79A45]">Vote on important decisions</p>
        </div>

        {userRole === 'committee' || userRole === 'owner' ? (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mb-6 px-4 py-2 bg-[#C79A45] text-[#16291F] rounded font-semibold hover:bg-[#B8894A]"
          >
            {showCreateForm ? 'Cancel' : 'Create Poll'}
          </button>
        ) : null}

        {showCreateForm && (userRole === 'committee' || userRole === 'owner') ? (
          <form onSubmit={handleCreatePoll} className="bg-[#1A3A2E] p-6 rounded mb-8 border border-[#C79A45]">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Question</label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-3 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded"
                placeholder="Ask a question..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Choices (comma-separated)</label>
              <input
                type="text"
                value={formData.choices}
                onChange={(e) => setFormData({ ...formData, choices: e.target.value })}
                className="w-full px-3 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded"
                placeholder="Yes, No, Abstain"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-[#16291F] text-[#F3ECDD] border border-[#C79A45] rounded"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#C79A45] text-[#16291F] rounded font-semibold hover:bg-[#B8894A]"
            >
              Create Poll
            </button>
          </form>
        ) : null}

        <div className="mb-6 flex gap-2">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded font-semibold capitalize ${
                filter === f
                  ? 'bg-[#C79A45] text-[#16291F]'
                  : 'bg-[#1A3A2E] text-[#C79A45] border border-[#C79A45] hover:bg-[#2A4A3E]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {polls.length === 0 ? (
            <div className="text-center py-12 bg-[#1A3A2E] rounded border border-[#7C9A5E]/30">
              <p className="text-[#C79A45]">No polls to display</p>
            </div>
          ) : (
            polls.map((poll) => (
              <div key={poll.id} className="bg-[#1A3A2E] p-6 rounded border border-[#C79A45]/50">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-fraunces)' }}>
                    {poll.question}
                  </h2>
                  <p
                    className={`text-sm font-semibold inline-block px-3 py-1 rounded ${
                      poll.status === 'open'
                        ? 'bg-[#7C9A5E] text-[#16291F]'
                        : 'bg-[#B5532E] text-[#F3ECDD]'
                    }`}
                  >
                    {poll.status === 'open' ? 'Open' : 'Closed'}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {poll.choices.map((choice) => {
                    const pollResults = results[poll.id] || {};
                    const voteCount = pollResults[choice] || 0;
                    const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0);
                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

                    return (
                      <div key={choice}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{choice}</span>
                          <span className="text-sm text-[#C79A45]">
                            {voteCount} vote{voteCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="w-full bg-[#16291F] rounded h-6 overflow-hidden">
                          <div
                            className="h-full bg-[#C79A45] transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {poll.status === 'open' && (
                  <div className="flex gap-2 mb-4">
                    {poll.choices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => handleVote(poll.id, choice)}
                        className="flex-1 px-3 py-2 bg-[#7C9A5E] text-[#16291F] rounded font-semibold hover:bg-[#6B8950] text-sm"
                      >
                        Vote: {choice}
                      </button>
                    ))}
                  </div>
                )}

                {(userRole === 'committee' || userRole === 'owner') && poll.status === 'open' && (
                  <button
                    onClick={() => handleClosePoll(poll.id)}
                    className="w-full px-4 py-2 bg-[#B5532E] text-[#F3ECDD] rounded font-semibold hover:bg-[#A04824]"
                  >
                    Close Poll
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
