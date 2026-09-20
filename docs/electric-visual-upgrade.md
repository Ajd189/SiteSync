# SiteSync Electric visual upgrade

Adds an electric-green circuit background, animated data packets and orbital details to the existing platform illustration, aurora/grid depth, refined cards and calls to action, and an accessible motion control. No new package dependency, paid service, business claim, analytics request, or application backend change is introduced.

## Integration

The Netlify build copies the public site, then `scripts/visual-layer.mjs` adds versioned local CSS, deferred JavaScript, and the decorative background to `dist/index.html` only. Existing homepage content, pricing, demos, consultation handlers, inbox assets, and all three server functions remain in the full application. The helper is idempotent and preserves body attributes. Legacy `npm run dev` and `build:sites` do not apply this Netlify-specific enhancement.

## Motion and resilience

The canvas caps its resolution scale at 1.5 and draws at most 30 times per second, with five circuit routes on mobile and eleven on desktop. It stops drawing while the document is hidden or motion is paused. Optional local storage remembers the motion preference; storage and canvas failures have fallbacks. Device reduced-motion preferences take priority. Added background and SVG content is decorative and noninteractive. The keyboard-accessible motion toggle also pauses the site's existing decorative CSS. Forced colors and printing have fallbacks.

## Verification gate

`netlify.toml` runs `npm test` before publication. This command builds the complete application and runs the existing consultation, inbox, and lead-digest tests plus eight visual-layer tests. A failing build or test must prevent publication.

The visual-layer tests cover asset insertion, idempotence, preservation of form/inbox/pricing markup, decorative accessibility markup, invalid input, scoped file writes, absence of network requests from the visual script, and CSS fallback rules. These automated checks are not equivalent to a full browser or email-delivery audit. Do not claim browser testing or production verification without corresponding results.

## Deployment

Production is the existing `sitesync-managed` Netlify project at `sitesync.us.com`. Its release path is a full source upload and remote build; committing or merging code alone does not publish it. A release must retain all static assets, headers, redirects, environment settings, and the consultation, inbox, and lead-digest functions. Never replace production with a frontend-only ZIP.

Record the source commit, deployed ID, successful build/test result, and actual HTTP verification in the release pull request. Verify the new homepage assets and protected inbox route after publication. Do not submit fake customer leads or trigger the scheduled email digest merely to test this visual upgrade.
