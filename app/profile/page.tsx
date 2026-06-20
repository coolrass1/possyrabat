'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Image, Mail, BadgeAlert, ArrowLeft, Save, X } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  role: string;
  created_at: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    photo_url: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          photo_url: data.photo_url || '',
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setError('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
        return;
      }

      const updated = await response.json();
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
        <p className="text-[#F3ECDD]">Profile not found</p>
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">My Profile</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">Manage your personal co-op coordinates and contact information.</p>
          </div>
        </div>

        <Card className="border border-[#e8dcc8]/30 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#e8dcc8]/20">
            <div>
              <CardTitle className="font-serif text-2xl text-[#16291F]">Personal Dossier</CardTitle>
              <CardDescription>Verify and modify your registry information</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="brass" onClick={() => setIsEditing(true)}>
                Edit Coordinates
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <div className="bg-[#B5532E]/10 border-l-4 border-[#B5532E] p-3 rounded text-sm text-[#B5532E] mb-6 flex items-center gap-2">
                <BadgeAlert className="h-4 w-4" /> {error}
              </div>
            )}

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="space-y-4 text-[#16291F]"
              >
                <div>
                  <Label htmlFor="email-disabled">Registered Email (Read-Only)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/40" />
                    <Input
                      id="email-disabled"
                      type="email"
                      value={profile.email}
                      disabled
                      className="pl-9 bg-gray-200 border-[#e8dcc8] text-gray-500 opacity-80"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/40" />
                    <Input
                      id="full-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-9"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/40" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-9"
                      placeholder="+212-6-00-000000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="photo-url">Photo URL</Label>
                  <div className="relative">
                    <Image className="absolute left-3 top-3 h-4 w-4 text-[#7C9A5E]/40" />
                    <Input
                      id="photo-url"
                      type="url"
                      value={formData.photo_url}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                      className="pl-9"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" variant="moss" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 text-[#16291F]">
                {formData.photo_url && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.photo_url}
                      alt={profile.name || 'Profile'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-[#C79A45] shadow-md"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#f9f5f0] border border-[#e8dcc8]/60 p-4 rounded-lg">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-1">Name</span>
                    <p className="text-base font-semibold text-[#16291F]">{profile.name || '—'}</p>
                  </div>

                  <div className="bg-[#f9f5f0] border border-[#e8dcc8]/60 p-4 rounded-lg">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-1">Email Coordinates</span>
                    <p className="text-base font-semibold text-[#16291F]">{profile.email}</p>
                  </div>

                  <div className="bg-[#f9f5f0] border border-[#e8dcc8]/60 p-4 rounded-lg">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-1">Phone Number</span>
                    <p className="text-base font-semibold text-[#16291F]">{profile.phone || '—'}</p>
                  </div>

                  <div className="bg-[#f9f5f0] border border-[#e8dcc8]/60 p-4 rounded-lg">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider block mb-1">Registry Role</span>
                    <div>
                      <Badge variant="moss" className="capitalize text-xs font-bold px-3 py-0.5 mt-0.5">
                        {profile.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#e8dcc8]/40 flex justify-between items-center text-xs text-[#7C9A5E]">
                  <span>Member since {joinDate}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
