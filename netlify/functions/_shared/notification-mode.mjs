/** Legacy delivery is opt-in. Gmail notifications own the queue by default. */
export function isNetlifyDigestEnabled(mode) {
  return mode === 'netlify-digest';
}
