# Project memory

## Product intent & audience

- Games listing/directory site with realtime search and live suggestions.
- Broad audience including desktop, laptop, and Android/mobile users.

## Brand personality & voice

- Production-quality, visually polished — not generic/cookie-cutter.
- Prioritizes responsive correctness across device classes.

## Visual design & UX direction

- Search bar provides live game suggestions and result selection on both desktop and mobile.
- Mobile search must support touch keyboard "search" button and be fully aligned with desktop suggestion flow.
- Homepage features a hero/banner card with 16:9 aspect ratio and category badge; mobile requires sufficient vertical height so badges/content don't appear displaced.
- Featured hero has two mobile image layout variants — both need consistent height treatment.
- Lucide React icons used throughout; no extra UI/theme packages.

## Decisions, constraints & rationale

- Vite + React + Tailwind CSS + Lucide React stack; `@/` path alias maps to `src/`.
- Separate mobile vs desktop search markup existed; mobile was aligned to desktop's live-suggestion behavior rather than replacing the architecture.
- Mobile hero height increased (not desktop layout changes) to fix displaced category badge.
- Build and type-check verified after mobile fixes.

## Open questions & assumptions

- Assumption: other pages/components may have similar mobile-specific layout regressions — not yet audited.
- Assumption: "realtime search" means client-side filtering; backend search API not confirmed.
- Android testing coverage is manual; no automated mobile/device testing in place.