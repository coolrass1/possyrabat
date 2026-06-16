import db from '../lib/db';
import { getRules, setRules } from '../lib/settings';

describe('Rules / member agreement', () => {
  beforeEach(() => {
    db.exec(`DELETE FROM settings;`);
  });

  it('returns empty rules by default', () => {
    expect(getRules()).toBe('');
  });

  it('committee sets the rules text and it persists', () => {
    setRules('1. Contributions are mandatory.\n2. Be kind.', 'committee-id');
    expect(getRules()).toBe('1. Contributions are mandatory.\n2. Be kind.');
  });

  it('overwrites previously saved rules', () => {
    setRules('old', 'c1');
    setRules('new', 'c1');
    expect(getRules()).toBe('new');
  });
});
