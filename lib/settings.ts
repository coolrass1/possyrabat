import db from './db';

const SETTINGS_ID = 'global';

export interface Settings {
  per_parcel_fee: number;
  currency: string;
  global_target: number;
  enabled_sections: string[];
}

export const DEFAULT_ENABLED_SECTIONS = [
  '/land',
  '/case',
  '/contributions',
  '/spending',
  '/meetings'
];

export function getSettings(): Settings {
  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID) as any;
  let enabledSections = DEFAULT_ENABLED_SECTIONS;
  if (row && row.enabled_sections) {
    try {
      enabledSections = JSON.parse(row.enabled_sections);
    } catch (e) {
      // ignore
    }
  }
  if (!row) {
    return { per_parcel_fee: 0, currency: 'XOF', global_target: 0, enabled_sections: enabledSections };
  }
  return {
    per_parcel_fee: row.per_parcel_fee,
    currency: row.currency || 'XOF',
    global_target: row.global_target ?? 0,
    enabled_sections: enabledSections,
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
    const sectionsJson = JSON.stringify(DEFAULT_ENABLED_SECTIONS);
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, enabled_sections, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, fee, 'XOF', sectionsJson, updatedBy, now);
  }

  return getSettings();
}

export function setCurrency(currency: string, updatedBy: string): Settings {
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(SETTINGS_ID);

  if (existing) {
    db.prepare('UPDATE settings SET currency = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(
      currency,
      updatedBy,
      now,
      SETTINGS_ID
    );
  } else {
    const sectionsJson = JSON.stringify(DEFAULT_ENABLED_SECTIONS);
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, enabled_sections, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, 0, currency, sectionsJson, updatedBy, now);
  }

  return getSettings();
}

export function setGlobalTarget(amount: number, updatedBy: string): Settings {
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(SETTINGS_ID);

  if (existing) {
    db.prepare('UPDATE settings SET global_target = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(
      amount,
      updatedBy,
      now,
      SETTINGS_ID
    );
  } else {
    const sectionsJson = JSON.stringify(DEFAULT_ENABLED_SECTIONS);
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, global_target, enabled_sections, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, 0, 'XOF', amount, sectionsJson, updatedBy, now);
  }

  return getSettings();
}

export function setEnabledSections(sections: string[], updatedBy: string): Settings {
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(SETTINGS_ID);
  const sectionsJson = JSON.stringify(sections);

  if (existing) {
    db.prepare('UPDATE settings SET enabled_sections = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(
      sectionsJson,
      updatedBy,
      now,
      SETTINGS_ID
    );
  } else {
    db.prepare(
      'INSERT INTO settings (id, per_parcel_fee, currency, enabled_sections, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(SETTINGS_ID, 0, 'XOF', sectionsJson, updatedBy, now);
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
    ).run(SETTINGS_ID, 0, 'XOF', rulesText, updatedBy, now);
  }

  return getRules();
}
