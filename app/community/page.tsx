'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  type: string;
  title: string | null;
  body: string;
  image_data: string | null;
  created_at: number;
}

type Tab = 'story' | 'notice' | 'gratitude';

const TAB_LABEL: Record<Tab, string> = {
  story: 'Stories',
  notice: 'Noticeboard',
  gratitude: 'Gratitude Wall',
};

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('story');
  const [posts, setPosts] = useState<Post[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setRole(data.member.role);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  const fetchPosts = async (t: Tab) => {
    const res = await fetch(`/api/community?type=${t}`);
    if (res.ok) setPosts(await res.json());
  };

  useEffect(() => {
    if (!isLoading) fetchPosts(tab);
  }, [tab, isLoading]);

  const isCommittee = role === 'committee' || role === 'owner';
  const canPost = tab === 'gratitude' || isCommittee;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, title: title || null, body }),
    });
    if (res.ok) {
      setTitle('');
      setBody('');
      await fetchPosts(tab);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Community</h1>
        <p className="text-[#C79A45] mb-6">Stories, notices, and gratitude from the group</p>

        <div className="flex gap-2 mb-6">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded font-semibold ${
                tab === t ? 'bg-[#C79A45] text-[#16291F]' : 'bg-[#1A3A2E] text-[#C79A45] border border-[#C79A45] hover:bg-[#2A4A3E]'
              }`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {canPost && (
          <form onSubmit={handlePost} className="bg-[#1A3A2E] p-5 rounded mb-8 border border-[#C79A45] space-y-3">
            {tab !== 'gratitude' && (
              <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            )}
            <textarea
              placeholder={tab === 'gratitude' ? 'Share a word of thanks…' : tab === 'notice' ? 'Post a notice…' : 'Tell a story…'}
              value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-[#16291F] border border-[#C79A45] rounded" />
            <button type="submit" className="px-4 py-2 bg-[#7C9A5E] text-[#16291F] rounded font-semibold">Post</button>
          </form>
        )}

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-[#1A3A2E] rounded border border-[#7C9A5E]/30">
              <p className="text-[#C79A45]">Nothing here yet</p>
            </div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className={`p-5 rounded border ${
                tab === 'gratitude' ? 'bg-[#7C9A5E]/10 border-[#7C9A5E]/40' : 'bg-[#F3ECDD] text-[#16291F] border-transparent'
              }`}>
                {p.title && <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>{p.title}</h3>}
                <p className={tab === 'gratitude' ? 'text-[#F3ECDD]' : 'text-[#16291F]'}>{p.body}</p>
                <p className={`text-xs mt-2 ${tab === 'gratitude' ? 'text-[#C79A45]' : 'text-[#7C9A5E]'}`}>
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
