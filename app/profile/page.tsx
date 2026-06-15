'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <p className="text-[#F3ECDD]">Loading...</p>
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
    <div className="min-h-screen bg-[#16291F]">
      <nav className="bg-[#0d1a13] text-[#F3ECDD] p-4 shadow-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Possyrabat</h1>
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
      </nav>

      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-3xl font-bold text-[#16291F] font-serif">My Profile</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6d8a50] transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {error && (
            <div className="bg-[#B5532E] text-white px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">
                  Email (cannot change)
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-[#C79A45] rounded-md text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                  placeholder="+1-555-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#16291F] mb-2">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) =>
                    setFormData({ ...formData, photo_url: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#C79A45] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C79A45]"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#7C9A5E] text-white rounded-md hover:bg-[#6d8a50] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {formData.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={formData.photo_url}
                    alt={profile.name || 'Profile'}
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#C79A45]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Name</p>
                  <p className="text-lg text-[#16291F]">{profile.name || '—'}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Email</p>
                  <p className="text-lg text-[#16291F]">{profile.email}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Phone</p>
                  <p className="text-lg text-[#16291F]">{profile.phone || '—'}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Role</p>
                  <p className="text-lg">
                    <span className="inline-block px-3 py-1 bg-[#7C9A5E] text-white rounded-full text-sm capitalize">
                      {profile.role}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#C79A45]">
                <p className="text-sm text-[#7C9A5E]">
                  <span className="font-semibold">Member since:</span> {joinDate}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
