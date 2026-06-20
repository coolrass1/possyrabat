'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types';
import { Calendar, Plus, MapPin, Clock, ArrowLeft, Volume2, Users, FileText, X } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';

const EVENT_TYPE_BADGES: Record<string, 'moss' | 'brass' | 'clay'> = {
  meeting: 'moss',
  event: 'brass',
  announcement: 'clay',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  event: 'Event',
  announcement: 'Announcement',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  meeting: <Users className="h-4 w-4" />,
  event: <Calendar className="h-4 w-4" />,
  announcement: <Volume2 className="h-4 w-4" />,
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: '',
    type: 'event' as const,
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setUserRole(data.member.role);
          fetchEvents();
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

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date).getTime(),
        }),
      });

      if (res.ok) {
        await fetchEvents();
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          location: '',
          type: 'event',
        });
      }
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

  const formatDateTime = (timestamp: number, time: string) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${dateStr} at ${time}`;
  };

  const isUpcoming = (eventDate: number) => eventDate >= Date.now();

  const upcomingEvents = events.filter((e) => isUpcoming(e.date));
  const pastEvents = events.filter((e) => !isUpcoming(e.date));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Events Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8dcc8]/20 pb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">Events & Convocations</h1>
              <p className="text-[#7C9A5E] text-sm mt-0.5">Stay updated on communal schedules, hearings, and administrative declarations.</p>
            </div>
          </div>
          {userRole !== 'member' && (
            <Button variant="brass" onClick={() => setShowCreateForm(!showCreateForm)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {showCreateForm ? 'Cancel Form' : 'Post Announcement'}
            </Button>
          )}
        </div>

        {/* Create Event Form */}
        {showCreateForm && userRole !== 'member' && (
          <Card className="border border-[#C79A45]/30">
            <CardHeader>
              <CardTitle>Schedule Council Event</CardTitle>
              <CardDescription>Setup details, designate type, and coordinate date locations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4 text-[#16291F]">
                <div>
                  <Label htmlFor="event-title">Title / Headline</Label>
                  <Input
                    id="event-title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Legal update overview"
                  />
                </div>

                <div>
                  <Label htmlFor="event-description">Event Description</Label>
                  <Textarea
                    id="event-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Summary of details for members..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-time">Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-location">Location Coordinate</Label>
                    <Input
                      id="event-location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Co-op Registry Room, Zoom link..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-type">Category Type</Label>
                    <Select
                      id="event-type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="event">Co-op Event</option>
                      <option value="meeting">Council Meeting</option>
                      <option value="announcement">Announcement</option>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="moss">
                    Create Event Post
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Events listing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-4 border-b border-[#e8dcc8]/20">
              <CardTitle className="text-xl font-serif text-[#16291F]">Upcoming Schedules</CardTitle>
              <CardDescription>Scheduled directives yet to occur</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 border ${
                      selectedEvent?.id === event.id
                        ? 'bg-[#f3ecdd] border-transparent shadow-md'
                        : 'bg-[#f9f5f0] border-[#e8dcc8]/40 hover:bg-[#e8dcc8]/30'
                    }`}
                    style={{
                      borderLeftColor: EVENT_TYPE_BADGES[event.type] === 'moss' ? '#7C9A5E' : EVENT_TYPE_BADGES[event.type] === 'brass' ? '#C79A45' : '#B5532E'
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[#16291F]">{event.title}</p>
                      <p className="text-[11px] text-[#7C9A5E] mt-1 flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatDateTime(event.date, event.time)}
                        {event.location && (
                          <span className="flex items-center gap-0.5 truncate">
                            · <MapPin className="h-3 w-3 shrink-0" /> {event.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant={EVENT_TYPE_BADGES[event.type] || 'secondary'} className="text-[10px] shrink-0 font-bold gap-1 font-mono">
                      {EVENT_TYPE_ICONS[event.type]}
                      {EVENT_TYPE_LABELS[event.type]}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-[#7C9A5E] text-xs italic text-center py-6">No upcoming events scheduled.</p>
              )}
            </CardContent>
          </Card>

          {/* Past Events */}
          <Card>
            <CardHeader className="pb-4 border-b border-[#e8dcc8]/20">
              <CardTitle className="text-xl font-serif text-[#16291F]">Historic logs</CardTitle>
              <CardDescription>Archive logs of completed convocations</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {pastEvents.length > 0 ? (
                pastEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-300 opacity-70 flex items-center justify-between gap-4 border ${
                      selectedEvent?.id === event.id
                        ? 'bg-[#f3ecdd] border-transparent shadow-md'
                        : 'bg-[#f9f5f0] border-[#e8dcc8]/40 hover:bg-[#e8dcc8]/30'
                    }`}
                    style={{
                      borderLeftColor: EVENT_TYPE_BADGES[event.type] === 'moss' ? '#7C9A5E' : EVENT_TYPE_BADGES[event.type] === 'brass' ? '#C79A45' : '#B5532E'
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[#16291F]">{event.title}</p>
                      <p className="text-[11px] text-[#7C9A5E] mt-1 flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatDateTime(event.date, event.time)}
                        {event.location && (
                          <span className="flex items-center gap-0.5 truncate">
                            · <MapPin className="h-3 w-3 shrink-0" /> {event.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-bold gap-1 font-mono">
                      {EVENT_TYPE_ICONS[event.type]}
                      {EVENT_TYPE_LABELS[event.type]}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-[#7C9A5E] text-xs italic text-center py-6">No historical records logged.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Details Popup Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-[#0d1a13]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-300">
            <Card className="w-full max-w-md border border-[#e8dcc8] shadow-2xl relative">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute right-4 top-4 text-[#7C9A5E] hover:text-[#16291F] transition-colors p-1 rounded-full hover:bg-[#e8dcc8]/30"
              >
                <X className="h-4 w-4" />
              </button>
              <CardHeader className="pb-2 border-b border-[#e8dcc8]/20">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={EVENT_TYPE_BADGES[selectedEvent.type] || 'secondary'} className="text-[10px] font-bold gap-1">
                    {EVENT_TYPE_ICONS[selectedEvent.type]}
                    {EVENT_TYPE_LABELS[selectedEvent.type]}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-serif text-[#16291F]">{selectedEvent.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs md:text-sm text-[#16291F]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-[#f9f5f0] p-2.5 rounded border border-[#e8dcc8]/40">
                    <Clock className="h-4 w-4 text-[#7C9A5E] shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Convocations Time</span>
                      <span className="font-semibold text-xs">{formatDateTime(selectedEvent.date, selectedEvent.time)}</span>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 bg-[#f9f5f0] p-2.5 rounded border border-[#e8dcc8]/40">
                      <MapPin className="h-4 w-4 text-[#7C9A5E] shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Coordinates Location</span>
                        <span className="font-semibold text-xs">{selectedEvent.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="bg-[#e8dcc8]/20 p-3.5 rounded border border-[#e8dcc8]/40 space-y-1">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block">Description Details</span>
                    <p className="text-xs text-[#16291F] leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
