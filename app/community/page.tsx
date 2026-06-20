'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MessageSquare, Heart, ArrowLeft, Send, BookOpen, Megaphone } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

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

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  story: <BookOpen className="h-4 w-4" />,
  notice: <Megaphone className="h-4 w-4" />,
  gratitude: <Heart className="h-4 w-4" />,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Community Center</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">Share co-op achievements, read stories, and express communal gratitude.</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex bg-[#0d1a13]/80 border border-[#e8dcc8]/10 p-1.5 rounded-lg gap-1.5 w-full justify-around sm:w-auto">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                tab === t
                  ? 'bg-[#C79A45] text-[#16291F] shadow-sm transform scale-[1.02]'
                  : 'text-[#F3ECDD]/80 hover:text-[#F3ECDD] hover:bg-[#16291F]'
              }`}
            >
              {TAB_ICONS[t]}
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Post Creation form */}
        {canPost && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="text-lg font-serif">
                  {tab === 'gratitude' 
                    ? 'Say Thank You' 
                    : tab === 'notice' 
                    ? 'Publish Notice' 
                    : 'Log Cooperative Story'
                  }
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePost} className="space-y-4 text-[#16291F]">
                {tab !== 'gratitude' && (
                  <div>
                    <Label htmlFor="post-title">Headline / Title</Label>
                    <Input
                      id="post-title"
                      placeholder="Title of your post..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="post-body">Message Description</Label>
                  <Textarea
                    id="post-body"
                    required
                    placeholder={
                      tab === 'gratitude' 
                        ? 'Who do you want to thank? Share your co-op thanks...' 
                        : tab === 'notice' 
                        ? 'Draft the notice coordinates...' 
                        : 'Record the co-op chronicle...'
                    }
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button type="submit" variant="moss" className="gap-2">
                  <Send className="h-4 w-4" /> Post to Wall
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card className="text-center p-12 bg-[#F3ECDD]/5 border border-[#7C9A5E]/20">
              <CardContent className="space-y-3">
                <MessageSquare className="h-10 w-10 mx-auto text-[#7C9A5E]" />
                <h3 className="text-lg font-bold font-serif text-[#F3ECDD]">No Posts Found</h3>
                <p className="text-[#7C9A5E] text-xs max-w-xs mx-auto">
                  There are no logs matching this category yet. Be the first to share one.
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((p) => (
              <Card 
                key={p.id} 
                className={`border transition-all duration-300 hover:shadow-md ${
                  tab === 'gratitude' 
                    ? 'bg-[#7C9A5E]/10 border-[#7C9A5E]/40 text-[#F3ECDD]' 
                    : 'bg-[#F3ECDD] text-[#16291F] border-[#e8dcc8]/65'
                }`}
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {p.title && (
                        <h3 className={`text-xl font-bold font-serif mb-1 ${
                          tab === 'gratitude' ? 'text-[#C79A45]' : 'text-[#16291F]'
                        }`}>
                          {p.title}
                        </h3>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
                    </div>
                    {tab === 'gratitude' && <Heart className="h-5 w-5 text-[#C79A45] shrink-0" />}
                  </div>
                  <div className={`text-[10px] font-mono font-bold border-t pt-2.5 flex items-center justify-between ${
                    tab === 'gratitude' ? 'border-[#7C9A5E]/20 text-[#7C9A5E]' : 'border-[#e8dcc8] text-[#7C9A5E]'
                  }`}>
                    <span>Published Registry Feed</span>
                    <span>
                      {new Date(p.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
