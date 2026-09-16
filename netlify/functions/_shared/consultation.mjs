const PACKAGES = new Set(['Not sure — help me choose', 'Website Build — $249', 'Connected Launch — $500', 'Business Setup — $899', 'Full SiteSync — $1,499', 'Ongoing support / custom project']);
const PLATFORMS = ['Google', 'Facebook', 'Instagram', 'Shopify', 'Square', 'WordPress', 'Wix / Squarespace', 'Other / none yet'];

function field(data, name, limit) {
  const value = data[name];
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > limit) throw new Error('invalid-field');
  return value.trim();
}

export function validateSubmission(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-body');
  const name = field(data, 'name', 100);
  const business = field(data, 'Business', 150);
  const email = field(data, 'email', 254);
  const goals = field(data, 'Goals', 5000);
  const selectedPackage = field(data, 'Package', 100) || 'Not sure — help me choose';
  const phone = field(data, 'Phone', 40);
  const website = field(data, 'Website', 300);
  if (!name || !business || goals.length < 10 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name + business + email + phone + website) || !PACKAGES.has(selectedPackage)) throw new Error('invalid-fields');
  return {
    name,
    business,
    email,
    phone: phone || 'Not provided',
    website: website || 'Not provided',
    selected_package: selectedPackage,
    budget: field(data, 'Budget', 100) || 'Let’s discuss',
    goals,
    platforms: PLATFORMS.filter(platform => data[`Platform: ${platform}`] === 'Yes'),
    extended_support: data['Extended support'] === 'Please include ongoing support options',
    status: 'new'
  };
}

export async function parseBody(request) {
  const type = request.headers.get('content-type') || '';
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 20_000) throw new Error('too-large');
  if (type.includes('application/json')) return request.json();
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(await request.formData());
  throw new Error('unsupported-type');
}

export function json(status, body, extra = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
