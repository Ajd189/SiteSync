# SiteSync Electric visual upgrade

Adds a lightweight electric-green circuit field, animated data packets and orbital details to the existing platform illustration, aurora/grid depth, refined cards and calls to action, and an accessible motion control. No paid service, dependency, new business claim, analytics request, or backend change is introduced.

## Integration

`npm run build` copies the existing public site, then `scripts/visual-layer.mjs` adds the versioned local stylesheet, deferred script, and decorative background to `dist/index.html` only. The original homepage content, demos, pricing, form fields, form handlers, private inbox, and server functions are not replaced. The helper is idempotent and preserves body attributes. The existing inbox bundling step is unchanged.

For a production-equivalent local preview, run `npm ci && npm run build` and serve `dist` with a static server. The legacy `npm run dev` and `build:sites` paths do not apply this Netlify-only enhancement. If switching to those deployment paths, add the same enhancement deliberately rather than assuming it is present.

## Motion and resilience

The canvas renderer caps its resolution scale at 1.5 and targets at most 30 frames per second, with five circuit routes on mobile and eleven on desktop. It cancels rendering while the document is hidden or motion is paused. The motion preference is optional local storage; blocked storage or an unavailable canvas must not break the page. Device reduced-motion preferences take priority. All added background/diagram elements are decorative, unfocusable, and non-interactive; the motion toggle is a keyboard-accessible button. The existing site's decorative CSS pauses with the same control. Forced colors and printing have fallbacks.

## Checks performed

- `node --check public/electric.js`: passed.
- `node --test tests/electric.test.mjs`: all eight tests passed.
- New stylesheet parsed without syntax errors.
- Offline Chromium checks passed on a representative homepage fixture using the new production assets: animation, pause/resume, storage-backed preference (storage stub), keyboard toggle, document-hidden simulation, reduced motion, disabled canvas, blocked storage, readable no-JavaScript fallback, and an editable input.
- No horizontal overflow in that fixture at 320, 375, 390, 768, 1024, or 1440 pixels. Desktop and mobile screenshots were inspected.

## Release status

These are scoped visual-layer checks, not a full end-to-end production audit. The complete `npm ci` / Vite build and existing backend test suite were not run in the editing environment because remote dependency retrieval was unavailable. Run `npm test` with dependencies installed before publication, then verify the real homepage's demos, mobile menu, consultation flow, and private inbox.

The inspected production Netlify site used an API-uploaded deployment rather than a Git-linked commit. A repository change alone therefore does not establish that the new design is live. Keep this upgrade in the review workflow and deploy the complete built application, including the existing three functions, through the authorized release process. Do not upload this frontend patch alone as a replacement for the production deployment.
