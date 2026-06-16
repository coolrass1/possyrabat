'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface EstateMap {
  id: string;
  image_data: string;
  caption?: string;
}

interface Holdings {
  parcel_count: number;
  parcel_size_m2: number;
  total_m2: number;
}

interface Member {
  name?: string;
  email: string;
}

interface AllHoldings {
  id: string;
  name?: string;
  email: string;
  parcel_count: number;
  total_m2: number;
}

export default function LandPage() {
  const router = useRouter();
  const [map, setMap] = useState<EstateMap | null>(null);
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [allHoldings, setAllHoldings] = useState<AllHoldings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profileData = await profileRes.json();
        setMember(profileData);

        const mapRes = await fetch('/api/estate-map');
        if (mapRes.ok) {
          setMap(await mapRes.json());
        }

        const holdingsRes = await fetch('/api/parcel-holdings');
        if (holdingsRes.ok) {
          setHoldings(await holdingsRes.json());
        }

        const allRes = await fetch('/api/parcel-holdings/all');
        if (allRes.ok) {
          setAllHoldings(await allRes.json());
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16291F] flex items-center justify-center">
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
            <a href="/profile" className="px-4 py-2 hover:bg-[#1a3a28] rounded-md transition">Profile</a>
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
        {/* Estate Map */}
        {map && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">Estate Map</h2>
            {map.image_data && (
              <div>
                <img src={map.image_data} alt="Estate Map" className="w-full max-h-96 object-cover rounded-lg border-4 border-[#C79A45]" />
                {map.caption && <p className="text-[#7C9A5E] mt-4 italic">{map.caption}</p>}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* My Parcels */}
          {holdings && (
            <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">My Parcels</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Parcel Count</p>
                  <p className="text-3xl font-bold text-[#16291F]">{holdings.parcel_count}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Size per Parcel</p>
                  <p className="text-2xl text-[#16291F]">{holdings.parcel_size_m2} m²</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total Area</p>
                  <p className="text-3xl font-bold text-[#C79A45]">{holdings.total_m2} m²</p>
                </div>
              </div>
            </div>
          )}

          {/* Estate Overview */}
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">Estate Overview</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total Members</p>
                <p className="text-3xl font-bold text-[#16291F]">{allHoldings.length}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total Parcels</p>
                <p className="text-2xl text-[#16291F]">{allHoldings.reduce((sum, h) => sum + h.parcel_count, 0)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#7C9A5E] mb-1">Total Area</p>
                <p className="text-3xl font-bold text-[#C79A45]">{allHoldings.reduce((sum, h) => sum + h.total_m2, 0)} m²</p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Roster */}
        {allHoldings.length > 0 && (
          <div className="bg-[#F3ECDD] rounded-lg shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold text-[#16291F] mb-4 font-serif">Member Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#C79A45]">
                    <th className="text-left py-2 text-[#16291F] font-semibold">Member</th>
                    <th className="text-right py-2 text-[#16291F] font-semibold">Parcels</th>
                    <th className="text-right py-2 text-[#16291F] font-semibold">Area (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {allHoldings.map((h) => (
                    <tr key={h.id} className="border-b border-[#E8DCC8] hover:bg-[#F9F5F0]">
                      <td className="py-3 text-[#16291F]">
                        <div>{h.name || 'Unknown'}</div>
                        <div className="text-xs text-[#7C9A5E]">{h.email}</div>
                      </td>
                      <td className="text-right py-3 text-[#16291F]">{h.parcel_count}</td>
                      <td className="text-right py-3 text-[#16291F] font-semibold text-[#C79A45]">{h.total_m2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
