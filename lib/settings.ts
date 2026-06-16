import db from './db';

const SETTINGS_ID = 'global';

export interface Settings {
  per_parcel_fee: number;
  currency: string;
}

export function getSettings(): Settings {
  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID) as any;
  if (!row) {
    return { per_parcel_fee: 0, currency: 'EUR' };
  }
  return {
    per_parcel_fee: row.per_parcel_fee,
    currency: row.currency || 'EUR',
  };
}

export function setPerParcelFee(fee: number, updatedBy: string): Settings {
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(SETTINGS_ID);

  if (existing) {
    db.prepare('UPDATE settings SET per_parcel_fee = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(
      fee,
      updatedBy,
      now,
      SETTINGS_ID
    );
  } else {
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, fee, 'EUR', updatedBy, now);
  }

  return getSettings();
}

export function getRules(): string {
  const row = db.prepare('SELECT rules_text FROM settings WHERE id = ?').get(SETTINGS_ID) as any;
  return row?.rules_text ?? '';
}

export function setRules(rulesText: string, updatedBy: string): string {
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(SETTINGS_ID);

  if (existing) {
    db.prepare('UPDATE settings SET rules_text = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(
      rulesText,
      updatedBy,
      now,
      SETTINGS_ID
    );
  } else {
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, rules_text, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, 0, 'EUR', rulesText, updatedBy, now);
  }

  return getRules();
}
