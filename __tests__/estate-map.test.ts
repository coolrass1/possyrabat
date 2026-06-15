import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';

describe('Estate Map API', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('DELETE FROM estate_maps; DELETE FROM sessions; DELETE FROM members;');
  });

  it('committee can upload estate map image', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin User', null, null, 'committee', Date.now());

    const session = createSession(committeeId);
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const { POST: postMap } = await import('@/app/api/admin/estate-map/route');

    const formDataMap = new Map();
    formDataMap.set('image', new File([Buffer.from(pngBase64, 'base64')], 'map.png', { type: 'image/png' }));
    formDataMap.set('caption', 'Estate Survey Map');

    const mockRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: session.id } : undefined),
      },
      formData: async () => formDataMap,
    } as any;

    const response = await postMap(mockRequest);

    expect(response.status).toBe(201);
    const estateMap = await response.json();
    expect(estateMap).toMatchObject({
      id: expect.any(String),
      image_data: expect.stringContaining('data:image/png;base64,'),
      caption: 'Estate Survey Map',
      uploaded_by: committeeId,
      uploaded_at: expect.any(Number),
    });
  });

  it('all members can retrieve current estate map', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-2';
    const memberId = 'member-6';

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', null, null, 'committee', Date.now());
    insertStmt.run(memberId, 'member@example.com', passwordHash, 'Member', null, null, 'member', Date.now());

    const committeeSession = createSession(committeeId);
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const formDataMap = new Map();
    formDataMap.set('image', new File([Buffer.from(pngBase64, 'base64')], 'map.png', { type: 'image/png' }));
    formDataMap.set('caption', 'Test Map');

    const { POST: postMap } = await import('@/app/api/admin/estate-map/route');
    const uploadRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      formData: async () => formDataMap,
    } as any;

    const uploadResponse = await postMap(uploadRequest);
    const uploadedMap = await uploadResponse.json();

    const memberSession = createSession(memberId);
    const { GET: getMap } = await import('@/app/api/estate-map/route');
    const getRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const getResponse = await getMap(getRequest);
    expect(getResponse.status).toBe(200);
    const retrievedMap = await getResponse.json();
    expect(retrievedMap).toMatchObject({
      id: uploadedMap.id,
      image_data: uploadedMap.image_data,
      caption: 'Test Map',
      uploaded_by: committeeId,
    });
  });

  it('committee can update map caption', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-3';

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', null, null, 'committee', Date.now());

    const committeeSession = createSession(committeeId);
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const formDataMap = new Map();
    formDataMap.set('image', new File([Buffer.from(pngBase64, 'base64')], 'map.png', { type: 'image/png' }));
    formDataMap.set('caption', 'Old Caption');

    const { POST: postMap } = await import('@/app/api/admin/estate-map/route');
    const uploadRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      formData: async () => formDataMap,
    } as any;

    const uploadResponse = await postMap(uploadRequest);
    const uploadedMap = await uploadResponse.json();
    const mapId = uploadedMap.id;

    const { PATCH: patchMap } = await import('@/app/api/admin/estate-map/[id]/route');
    const updateRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({ caption: 'New Caption' }),
    } as any;

    const updateResponse = await patchMap(updateRequest, { id: mapId });
    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.caption).toBe('New Caption');
    expect(updated.id).toBe(mapId);
  });
});
