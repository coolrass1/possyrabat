'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types';

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: '#7C9A5E',
  event: '#C79A45',
  announcement: '#B5532E',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  event: 'Event',
  announcement: 'Announcement',
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      <div className="min-h-screen flex items-center justify-center bg-[#16291F]">
        <p className="text-[#F3ECDD]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16291F]">

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#F3ECDD] font-serif">Events & Announcements</h2>
          {userRole !== 'member' && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ Create Event'}
            </button>
          )}
        </div>

        {/* Create Event Form */}
        {showCreateForm && userRole !== 'member' && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-lg font-semibold text-[#16291F] mb-6">Create Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#16291F] mb-2">Time</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-md focus:outline-none focus:border-[#C79A45]"
                >
                  <option value="event">Event</option>
                  <option value="meeting">Meeting</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors"
              >
                Create Event
              </button>
            </form>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-8">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#F3ECDD] mb-4">Upcoming</h3>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'bg-[#F3ECDD]'
                        : 'bg-white hover:bg-[#F9F5F0]'
                    }`}
                    style={{
                      borderColor: EVENT_TYPE_COLORS[event.type],
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#16291F]">{event.title}</p>
                        <p className="text-sm text-[#7C9A5E] mt-1">
                          {formatDateTime(event.date, event.time)}
                          {event.location && ` · ${event.location}`}
                        </p>
                      </div>
                      <span
                        className="px-2 py-1 text-xs text-white rounded"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#F3ECDD] mb-4">Past Events</h3>
              <div className="space-y-3">
                {pastEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors opacity-75 ${
                      selectedEvent?.id === event.id
                        ? 'bg-[#F3ECDD]'
                        : 'bg-white hover:bg-[#F9F5F0]'
                    }`}
                    style={{
                      borderColor: EVENT_TYPE_COLORS[event.type],
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#16291F]">{event.title}</p>
                        <p className="text-sm text-[#7C9A5E] mt-1">
                          {formatDateTime(event.date, event.time)}
                          {event.location && ` · ${event.location}`}
                        </p>
                      </div>
                      <span
                        className="px-2 py-1 text-xs text-white rounded"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && (
            <p className="text-center text-[#7C9A5E] py-8">No events yet</p>
          )}
        </div>

        {/* Event Details */}
        {selectedEvent && (
          <div className="fixed bottom-8 right-8 bg-[#F3ECDD] rounded-lg shadow-lg p-8 max-w-md">
            <h3 className="text-lg font-semibold text-[#16291F] mb-4">{selectedEvent.title}</h3>

            <div className="space-y-2 text-sm mb-6">
              <p>
                <span className="font-semibold text-[#7C9A5E]">Date & Time:</span>{' '}
                {formatDateTime(selectedEvent.date, selectedEvent.time)}
              </p>
              {selectedEvent.location && (
                <p>
                  <span className="font-semibold text-[#7C9A5E]">Location:</span> {selectedEvent.location}
                </p>
              )}
              {selectedEvent.description && (
                <p>
                  <span className="font-semibold text-[#7C9A5E]">Description:</span> {selectedEvent.description}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6a8a4f] transition-colors w-full"
            >
              Close
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
