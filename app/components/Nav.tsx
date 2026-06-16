'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SessionMember {
  id: string;
  name: string | null;
  role: 'member' | 'committee' | 'owner';
}

const MEMBER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/land', label: 'Land' },
  { href: '/case', label: 'Case' },
  { href: '/contributions', label: 'Contributions' },
  { href: '/spending', label: 'Spending' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/events', label: 'Events' },
  { href: '/polls', label: 'Polls' },
  { href: '/statements', label: 'Statements' },
  { href: '/profile', label: 'Profile' },
];

const COMMITTEE_LINKS = [
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/arrears', label: 'Arrears' },
  { href: '/admin/audit', label: 'Audit' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [member, setMember] = useState<SessionMember | null>(null);

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

  // No chrome on the login screen or before we know who's here.
  if (pathname === '/login' || !member) return null;

  const isCommittee = member.role === 'committee' || member.role === 'owner';
  const links = isCommittee ? [...MEMBER_LINKS, ...COMMITTEE_LINKS] : MEMBER_LINKS;

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <nav className="bg-[#0d1a13] text-[#F3ECDD] shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-bold shrink-0" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Possyrabat
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#C79A45] text-[#16291F]'
                    : 'text-[#F3ECDD] hover:bg-[#16291F]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 bg-[#B5532E] hover:bg-[#9d4520] rounded-md text-sm font-semibold whitespace-nowrap transition-colors shrink-0"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
