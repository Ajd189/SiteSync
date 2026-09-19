import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission } from '../netlify/functions/_shared/consultation.mjs';

const valid = { name: 'SiteSync QA', Business: 'Test business', email: 'visitor@example.com', Goals: 'Build a reliable customer inquiry flow.', Package: 'Full SiteSync — $1,499', 'Platform: Google': 'Yes' };

test('accepts and normalizes a valid consultation', () => {
  const result = validateSubmission(valid);
  assert.equal(result.selected_package, 'Full SiteSync — $1,499');
  assert.deepEqual(result.platforms, ['Google']);
  assert.equal(result.status, 'new');
});

test('rejects malformed and injected consultation data', () => {
  for (const data of [
    { ...valid, email: 'invalid' },
    { ...valid, Goals: 'short' },
    { ...valid, Business: '' },
    { ...valid, Package: 'Free' },
    { ...valid, name: 'A\r\nB' }
  ]) assert.throws(() => validateSubmission(data));
});
