'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sprout, LogOut } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { useLanguage } from '@/app/components/LanguageProvider';

interface SessionMember {
  id: string;
  name: string | null;
  role: 'member' | 'committee' | 'owner';
  must_change_password?: boolean;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [member, setMember] = useState<SessionMember | null>(null);
  const { language, setLanguage, t } = useLanguage();

  const [enabledSections, setEnabledSections] = useState<string[]>([
    '/land',
    '/case',
    '/contributions',
    '/spending',
    '/meetings'
  ]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const MEMBER_LINKS = [
    { href: '/', label: t('nav.home') },
    { href: '/land', label: t('nav.land') },
    { href: '/case', label: t('nav.case') },
    { href: '/contributions', label: t('nav.contributions') },
    { href: '/spending', label: t('nav.spending') },
    { href: '/campaigns', label: t('nav.campaigns') },
    { href: '/meetings', label: t('nav.meetings') },
    { href: '/events', label: t('nav.events') },
    { href: '/community', label: t('nav.community') },
    { href: '/polls', label: t('nav.polls') },
    { href: '/statements', label: t('nav.statements') },
    { href: '/rules', label: t('nav.rules') },
    { href: '/profile', label: t('nav.profile') },
  ];

  const COMMITTEE_LINKS = [
    { href: '/cotisations', label: t('nav.targetSetup') },
    { href: '/admin/members', label: t('nav.members') },
    { href: '/admin/arrears', label: t('nav.arrears') },
    { href: '/admin/email', label: t('nav.email') },
    { href: '/admin/audit', label: t('nav.audit') },
  ];

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (active) setMember(data.authenticated ? data.member : null);
      })
      .catch(() => {
        if (active) setMember(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          if (data.enabled_sections) {
            setEnabledSections(data.enabled_sections);
          }
          setSettingsLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Error fetching settings:', err);
        if (active) setSettingsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (member?.must_change_password && pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [member, pathname, router]);

  useEffect(() => {
    if (settingsLoaded && member && member.role === 'member') {
      const isAllowed = (path: string) => {
        if (path === '/') return true;
        return enabledSections.some((sec) => path === sec || path.startsWith(sec + '/'));
      };
      if (!isAllowed(pathname)) {
        router.replace('/');
      }
    }
  }, [pathname, member, enabledSections, settingsLoaded, router]);

  if (pathname === '/login' || pathname === '/change-password' || !member) return null;

  const isCommittee = member.role === 'committee' || member.role === 'owner';
  
  const filteredMemberLinks = member.role === 'member'
    ? MEMBER_LINKS.filter((link) => link.href === '/' || enabledSections.includes(link.href))
    : MEMBER_LINKS;

  const links = isCommittee ? [...filteredMemberLinks, ...COMMITTEE_LINKS] : filteredMemberLinks;

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <nav className="bg-[#0d1a13] text-[#F3ECDD] border-b border-[#e8dcc8]/10 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <Link 
          href="/" 
          className="text-2xl font-bold shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity" 
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          <Sprout className="h-6 w-6 text-[#C79A45] animate-pulse" />
          <span>Possyrabat</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {links.map((link) => {
            const active =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                  active
                    ? 'bg-[#C79A45] text-[#16291F] shadow-sm transform scale-105'
                    : 'text-[#F3ECDD]/80 hover:text-[#F3ECDD] hover:bg-[#16291F]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Action Group: Toggle + Sign Out */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Toggle */}
          <div className="flex items-center gap-0.5 bg-[#16291F] border border-[#e8dcc8]/25 p-0.5 rounded-lg">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all duration-300 ${
                language === 'en'
                  ? 'bg-[#C79A45] text-[#16291F] shadow-sm'
                  : 'text-[#F3ECDD]/60 hover:text-[#F3ECDD]'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all duration-300 ${
                language === 'fr'
                  ? 'bg-[#C79A45] text-[#16291F] shadow-sm'
                  : 'text-[#F3ECDD]/60 hover:text-[#F3ECDD]'
              }`}
            >
              FR
            </button>
          </div>

          {/* Sign Out */}
          <Button 
            variant="clay" 
            size="sm" 
            onClick={handleSignOut}
            className="h-8 px-3 text-xs gap-1.5 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('common.signOut')}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
