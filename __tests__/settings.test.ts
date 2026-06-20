import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { getSettings, setEnabledSections, setCurrency, setGlobalTarget } from '@/lib/settings';
import { createSession } from '@/lib/auth';
import { GET as getSettingsApi } from '@/app/api/settings/route';
import { PATCH as updateSettingsApi } from '@/app/api/admin/settings/route';

describe('Global Settings & Section Controls', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM settings;
      DELETE FROM members;
      DELETE FROM sessions;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
  });

  it('initializes global settings with default enabled sections', () => {
    // Check database directly
    const row = db.prepare("SELECT enabled_sections FROM settings WHERE id = 'global'").get() as any;
    expect(row).toBeDefined();
    
    const enabledSections = JSON.parse(row.enabled_sections);
    expect(enabledSections).toContain('/land');
    expect(enabledSections).toContain('/case');
    expect(enabledSections).toContain('/contributions');
    expect(enabledSections).toContain('/spending');
    expect(enabledSections).toContain('/meetings');
    
    // Default config should hide campaigns, events, etc.
    expect(enabledSections).not.toContain('/campaigns');
    expect(enabledSections).not.toContain('/events');
  });

  it('defaults the currency to CFA (XOF) on a clean initialization', () => {
    expect(getSettings().currency).toBe('XOF');
  });

  it('persists a currency change via setCurrency', () => {
    const updated = setCurrency('EUR', 'owner-user');
    expect(updated.currency).toBe('EUR');
    expect(getSettings().currency).toBe('EUR');

    const row = db.prepare("SELECT currency, updated_by FROM settings WHERE id = 'global'").get() as any;
    expect(row.currency).toBe('EUR');
    expect(row.updated_by).toBe('owner-user');
  });

  it('defaults the lifetime global target to 0 (unset) and persists a change', () => {
    expect(getSettings().global_target).toBe(0);

    const updated = setGlobalTarget(3600000, 'owner-user');
    expect(updated.global_target).toBe(3600000);
    expect(getSettings().global_target).toBe(3600000);

    const row = db.prepare("SELECT global_target FROM settings WHERE id = 'global'").get() as any;
    expect(row.global_target).toBe(3600000);
  });

  it('retrieves enabled sections using getSettings', () => {
    const settings = getSettings();
    expect(settings.enabled_sections).toEqual([
      '/land',
      '/case',
      '/contributions',
      '/spending',
      '/meetings'
    ]);
  });

  it('updates enabled sections using setEnabledSections', () => {
    const updated = setEnabledSections(['/land', '/case', '/campaigns'], 'admin-user');
    expect(updated.enabled_sections).toEqual(['/land', '/case', '/campaigns']);

    // Check database directly
    const row = db.prepare("SELECT enabled_sections, updated_by FROM settings WHERE id = 'global'").get() as any;
    expect(JSON.parse(row.enabled_sections)).toEqual(['/land', '/case', '/campaigns']);
    expect(row.updated_by).toBe('admin-user');
  });

  describe('API Endpoints', () => {
    let memberSessionId: string;
    let adminSessionId: string;

    beforeEach(() => {
      const now = Date.now();
      // Insert test member
      db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('member-1', 'member@example.com', 'hash', 'Member User', 'member', now);
      memberSessionId = createSession('member-1').id;

      // Insert test admin
      db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('admin-1', 'admin@example.com', 'hash', 'Admin User', 'committee', now);
      adminSessionId = createSession('admin-1').id;
    });

    const createMockRequest = (sessionId: string, body?: any) => {
      const mockReq = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: sessionId };
            }
            return undefined;
          },
        },
        json: async () => body,
      } as any;
      return mockReq;
    };

    it('allows GET /api/settings for logged in users', async () => {
      const req = createMockRequest(memberSessionId);
      const res = await getSettingsApi(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.enabled_sections).toBeDefined();
    });

    it('denies PATCH /api/admin/settings for regular members', async () => {
      const req = createMockRequest(memberSessionId, { enabled_sections: ['/land'] });
      const res = await updateSettingsApi(req);
      expect(res.status).toBe(403);
    });

    it('allows PATCH /api/admin/settings for admin and updates enabled_sections', async () => {
      const req = createMockRequest(adminSessionId, {
        enabled_sections: ['/land', '/case', '/contributions', '/spending', '/meetings', '/campaigns']
      });
      const res = await updateSettingsApi(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.enabled_sections).toContain('/campaigns');
    });

    it('validates that enabled_sections must be an array', async () => {
      const req = createMockRequest(adminSessionId, {
        enabled_sections: '/invalid'
      });
      const res = await updateSettingsApi(req);
      expect(res.status).toBe(400);
    });
  });
});

