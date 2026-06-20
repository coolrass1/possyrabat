'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Users, Square, Layers, ArrowLeft } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { useLanguage } from '@/app/components/LanguageProvider';

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
  const { t } = useLanguage();
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C79A45] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#F3ECDD] font-serif tracking-wider animate-pulse">{t('land.loading')}</p>
        </div>
      </div>
    );
  }

  const totalParcels = allHoldings.reduce((sum, h) => sum + h.parcel_count, 0);
  const totalArea = allHoldings.reduce((sum, h) => sum + h.total_m2, 0);

  return (
    <div className="min-h-screen bg-[#16291F] pb-16">
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-[#0d1a13] text-[#F3ECDD] border-[#e8dcc8]/20 hover:bg-[#16291F]">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.backToHome')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-[#F3ECDD]">{t('land.title')}</h1>
            <p className="text-[#7C9A5E] text-sm mt-0.5">{t('land.subtitle')}</p>
          </div>
        </div>

        {/* Estate Map */}
        {map && (
          <Card className="overflow-hidden border border-[#e8dcc8]/30 shadow-xl">
            <CardHeader className="bg-[#f3ecdd] border-b border-[#e8dcc8] py-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="text-lg font-serif">{t('land.surveyMap')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-[#f3ecdd]">
              {map.image_data && (
                <div className="space-y-4">
                  <div className="border-4 border-[#C79A45] rounded-lg overflow-hidden shadow-inner bg-[#0d1a13]/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={map.image_data} 
                      alt="Estate Map" 
                      className="w-full max-h-[500px] object-contain mx-auto" 
                    />
                  </div>
                  {map.caption && (
                    <div className="bg-[#e8dcc8]/30 border-l-4 border-[#C79A45] p-3 rounded-r-md">
                      <p className="text-[#16291F] text-sm italic font-medium">"{map.caption}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* My Parcels */}
          {holdings && (
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#7C9A5E]" />
                  <CardTitle className="font-serif">{t('land.myParcels')}</CardTitle>
                </div>
                <CardDescription>{t('land.myParcelsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.parcels')}</span>
                    <p className="text-2xl font-black text-[#16291F] font-figure mt-1">{holdings.parcel_count}</p>
                  </div>
                  <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.sizePerParcel')}</span>
                    <p className="text-base font-bold text-[#16291F] mt-1">{holdings.parcel_size_m2} m²</p>
                  </div>
                  <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                    <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.totalArea')}</span>
                    <p className="text-2xl font-black text-[#C79A45] font-figure mt-1">{holdings.total_m2} m²</p>
                  </div>
                </div>

                <div className="text-xs text-[#7C9A5E] bg-[#7C9A5E]/10 p-3 rounded-lg border border-[#7C9A5E]/20">
                  <p>{t('land.parcelsNote')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estate Overview */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#C79A45]" />
                <CardTitle className="font-serif">{t('land.estateOverview')}</CardTitle>
              </div>
              <CardDescription>{t('land.estateOverviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                  <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.members')}</span>
                  <p className="text-2xl font-black text-[#16291F] font-figure mt-1">{allHoldings.length}</p>
                </div>
                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                  <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.totalParcels')}</span>
                  <p className="text-2xl font-black text-[#16291F] font-figure mt-1">{totalParcels}</p>
                </div>
                <div className="bg-[#e8dcc8]/30 p-4 rounded-lg text-center">
                  <span className="text-[10px] text-[#7C9A5E] uppercase font-bold tracking-wider">{t('land.totalArea')}</span>
                  <p className="text-2xl font-black text-[#C79A45] font-figure mt-1">{totalArea.toLocaleString()} m²</p>
                </div>
              </div>

              <div className="text-xs text-[#7C9A5E] bg-[#C79A45]/10 p-3 rounded-lg border border-[#C79A45]/20">
                <p>{t('land.estateOverviewNote')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Member Roster */}
        {allHoldings.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-2xl">{t('land.registryTitle')}</CardTitle>
              <CardDescription>{t('land.registrySubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('land.memberHeader')}</TableHead>
                    <TableHead className="text-right">{t('land.parcelsHeader')}</TableHead>
                    <TableHead className="text-right">{t('land.areaHeader')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allHoldings.map((h) => (
                    <TableRow key={h.id} className="hover:bg-[#e8dcc8]/20">
                      <TableCell className="py-4">
                        <div className="font-semibold text-[#16291F]">{h.name || 'Anonymous Member'}</div>
                        <div className="text-xs text-[#7C9A5E] mt-0.5">{h.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-base text-[#16291F]">
                        {h.parcel_count}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-base text-[#C79A45]">
                        {h.total_m2.toLocaleString()} m²
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
