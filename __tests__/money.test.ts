import { formatMoney } from '../lib/utils';

describe('formatMoney', () => {
  it('renders a whole CFA amount with space-grouped thousands and no decimals', () => {
    expect(formatMoney(4000000)).toBe('4 000 000 CFA');
  });
});
