import db from './db';

const FUND_ID = 'global';

export interface Custodian {
  custodian_name: string | null;
  account_masked: string | null;
  last_reconciled_at: number | null;
}

export function getCustodian(): Custodian {
  const row = db.prepare('SELECT * FROM fund_settings WHERE id = ?').get(FUND_ID) as any;
  if (!row) {
    return { custodian_name: null, account_masked: null, last_reconciled_at: null };
  }
  return {
    custodian_name: row.custodian_name ?? null,
    account_masked: row.account_masked ?? null,
    last_reconciled_at: row.last_reconciled_at ?? null,
  };
}

export function setCustodian(fields: Partial<Custodian>): Custodian {
  const current = getCustodian();
  const next = {
    custodian_name: fields.custodian_name !== undefined ? fields.custodian_name : current.custodian_name,
    account_masked: fields.account_masked !== undefined ? fields.account_masked : current.account_masked,
    last_reconciled_at:
      fields.last_reconciled_at !== undefined ? fields.last_reconciled_at : current.last_reconciled_at,
  };
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM fund_settings WHERE id = ?').get(FUND_ID);

  if (existing) {
    db.prepare(
      'UPDATE fund_settings SET custodian_name = ?, account_masked = ?, last_reconciled_at = ?, updated_at = ? WHERE id = ?'
    ).run(next.custodian_name, next.account_masked, next.last_reconciled_at, now, FUND_ID);
  } else {
    db.prepare(
      'INSERT INTO fund_settings (id, custodian_name, account_masked, last_reconciled_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(FUND_ID, next.custodian_name, next.account_masked, next.last_reconciled_at, now);
  }

  return getCustodian();
}
