'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function RulesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [rules, setRules] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const ROLE_CAPS = [
    { cap: t('rules.cap1'), member: true, committee: true },
    { cap: t('rules.cap2'), member: true, committee: true },
    { cap: t('rules.cap3'), member: false, committee: true },
    { cap: t('rules.cap4'), member: false, committee: true },
    { cap: t('rules.cap5'), member: false, committee: true },
    { cap: t('rules.cap6'), member: false, committee: true },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated) {
          setRole(data.member.role);
          const rRes = await fetch('/api/rules');
          if (rRes.ok) setRules((await rRes.json()).rules_text || '');
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

  const handleSave = async () => {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules_text: draft }),
    });
    if (res.ok) {
      setRules((await res.json()).rules_text);
      setEditing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  const isCommittee = role === 'committee' || role === 'owner';

  return (
    <div className="min-h-screen bg-[#16291F] text-[#F3ECDD]">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>
          {t('rules.title')}
        </h1>
        <p className="text-[#C79A45] mb-6">{t('rules.subtitle')}</p>

        <section className="bg-[#F3ECDD] text-[#16291F] rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>{t('rules.agreement')}</h2>
            {isCommittee && !editing && (
              <button onClick={() => { setDraft(rules); setEditing(true); }}
                className="px-3 py-1.5 bg-[#C79A45] text-[#16291F] rounded font-semibold text-sm hover:bg-[#b8894a]">
                {t('rules.edit')}
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 bg-white border border-[#C79A45] rounded text-[#16291F]"
                placeholder={t('rules.placeholder')}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-2 bg-[#7C9A5E] text-[#16291F] rounded font-semibold">{t('rules.save')}</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-[#E8DCC8] text-[#16291F] rounded font-semibold">{t('rules.cancel')}</button>
              </div>
            </div>
          ) : rules ? (
            <p className="whitespace-pre-wrap leading-relaxed">{rules}</p>
          ) : (
            <p className="text-[#7C9A5E] italic">
              {isCommittee ? t('rules.empty') : t('rules.emptyMember')}
            </p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>{t('rules.rolesTitle')}</h2>
          <div className="bg-[#1A3A2E] rounded border border-[#C79A45]/50 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d1a13] border-b border-[#C79A45]/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#C79A45]">{t('rules.capabilityHeader')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[#C79A45]">{t('rules.memberHeader')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[#C79A45]">{t('rules.committeeHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C79A45]/20">
                {ROLE_CAPS.map((r) => (
                  <tr key={r.cap}>
                    <td className="px-4 py-3 text-sm">{r.cap}</td>
                    <td className="px-4 py-3 text-center">{r.member ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-center">{r.committee ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
