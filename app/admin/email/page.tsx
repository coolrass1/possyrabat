'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Send, History, ArrowLeft, MailCheck, AlertCircle } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';

interface EmailLogRow {
  id: string;
  to: string;
  subject: string;
  status: string;
  created_at: number;
}

export default function EmailAdminPage() {
  const router = useRouter();
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && (data.member.role === 'committee' || data.member.role === 'owner')) {
          await fetchLog();
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

  const fetchLog = async () => {
    const res = await fetch('/api/admin/email');
    if (res.ok) setLog(await res.json());
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNotice(null);
    const res = await fetch('/api/admin/email/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotice(`Broadcast sent to ${data.sent} member${data.sent === 1 ? '' : 's'}.`);
      setSubject('');
      setBody('');
      await fetchLog();
    } else {
      setNotice((await res.json()).error || 'Failed to broadcast');
    }
    setSending(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Communications Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Email Broadcasts</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">Communicate changes, meeting warnings, and statements to all cooperative members.</p>
          </div>
        </div>

        {notice && (
          <div className="bg-[#7C9A5E]/15 border-l-4 border-[#7C9A5E] p-4 rounded text-sm text-[#7C9A5E] flex items-center gap-2 font-semibold">
            <MailCheck className="h-5 w-5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <Card className="border border-[#C79A45]/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#C79A45]" />
              <CardTitle className="font-serif">Cooperative Newsletter Broadcast</CardTitle>
            </div>
            <CardDescription>Transmit a manual message to all cooperative profiles in the active registry.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4 text-[#16291F]">
              <div>
                <Label htmlFor="broadcast-subject">Subject</Label>
                <Input
                  id="broadcast-subject"
                  required
                  placeholder="e.g. Urgent Update on Legal Hearing Date"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="broadcast-body">Message Body</Label>
                <Textarea
                  id="broadcast-body"
                  required
                  placeholder="Draft your notice details here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                />
              </div>

              <Button type="submit" variant="brass" disabled={sending} className="gap-2">
                <Send className="h-4 w-4" />
                {sending ? 'Transmitting…' : 'Broadcast to all members'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Transparency Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#7C9A5E]" />
              <CardTitle className="font-serif text-xl">Transparency Log</CardTitle>
            </div>
            <CardDescription>Audit logs of broadcast distributions</CardDescription>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-[#7C9A5E] text-sm italic text-center py-8">No emails sent yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Delivery Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((row) => (
                    <TableRow key={row.id} className="hover:bg-[#e8dcc8]/20">
                      <TableCell className="font-mono text-xs font-semibold py-4 text-[#16291f]">
                        {new Date(row.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-[#16291F]">{row.to}</TableCell>
                      <TableCell className="py-4 font-semibold text-[#16291F]">{row.subject}</TableCell>
                      <TableCell className="text-center py-4">
                        <Badge variant="moss" className="capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
