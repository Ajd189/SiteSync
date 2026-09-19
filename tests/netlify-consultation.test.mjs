import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPayload, notifyOwner, validateSubmission } from '../netlify/functions/_shared/consultation.mjs';

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

test('builds an email notification without exposing the owner address in public code', () => {
  const payload = buildNotificationPayload(validateSubmission(valid));
  assert.equal(payload.Business, valid.Business);
  assert.equal(payload.Platforms, 'Google');
  assert.equal(payload._subject, 'New SiteSync consultation request');
  assert.equal(payload['Preferred reply'], 'Email');
});

test('sends notifications to the private runtime recipient and handles activation safely', async () => {
  const lead = validateSubmission(valid);
  let request;
  const sent = await notifyOwner('owner@example.invalid', lead, async (url, options) => {
    request = { url, options };
    return Response.json({ success: true, message: 'Form submitted successfully' });
  });
  assert.equal(sent.status, 'sent');
  assert.equal(request.url, 'https://formsubmit.co/ajax/owner%40example.invalid');
  assert.equal(JSON.parse(request.options.body).email, valid.email);

  const activation = await notifyOwner('owner@example.invalid', lead, async () => Response.json({ success: 'true', message: 'Check your email to activate this form' }));
  assert.equal(activation.status, 'activation-required');
});
