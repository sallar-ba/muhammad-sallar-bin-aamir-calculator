# Acceptance report

Automated checks for every MVP acceptance criterion in [user-stories.md](user-stories.md), run in a real browser. Each criterion has one Playwright test, named by its ID, in [e2e/acceptance.spec.ts](../e2e/acceptance.spec.ts).

- **Run:** 2026-11-01, `npm run test:acceptance` against the production build.
- **Browsers:** installed Google Chrome, Playwright's Chromium and WebKit (Safari's engine), each at desktop size (1440 × 900) and as a phone (Pixel 7 for Chrome and Chromium, iPhone 13 for WebKit), split across the light and dark themes.
- **Result:** 73 of 73 automated checks pass in all 6 setups.
- **Not covered here:** Firefox (it would not launch in the environment this was developed in), the Safari app itself and real phones (WebKit and device emulation stand in for them), and screen readers. In WebKit, S-1.12 uses Option+Tab, because Safari's Tab key skips buttons and menus on every site unless full keyboard access is turned on.

To regenerate: `npm run test:acceptance`, then `node e2e/acceptance-report.mjs`.

## By story

| Story | Serves | Automated checks passing | Status |
|---|---|---|---|
| S-1 | J-3 | 14 of 14 | Implemented |
| S-2 | J-5 | 9 of 9 | Implemented |
| S-3 | J-2 | 9 of 9 | Implemented |
| S-4 | J-1 | 10 of 10 | Implemented |
| S-5 | J-4 | 3 of 3 | Implemented |
| S-6 | J-5 | 14 of 14 | Implemented |
| S-7 | J-1 | 5 of 5 | Implemented |
| S-8 | J-6 | 4 of 4 | Implemented |
| S-12 | J-1 | 5 of 5 | Implemented |

S-9, S-10 and S-11 are deferred (Later) and not tested.

## By criterion

| Criterion | Chrome, desktop, dark | Chrome, phone, light | Chromium, desktop, light | Chromium, phone, dark | WebKit, desktop, light | WebKit, iPhone, dark | Result |
|---|---|---|---|---|---|---|---|
| S-1.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.6 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.7 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.8 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.9 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.10 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.11 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.12 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.13 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-1.14 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.6 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.7 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.8 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-2.9 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.6 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.7 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.8 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-3.9 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.6 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.7 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.8 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.9 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-4.10 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-5.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-5.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-5.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.6 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.7 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.8 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.9 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.10 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.11 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.12 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.13 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-6.14 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-7.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-7.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-7.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-7.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-7.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-8.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-8.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-8.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-8.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-12.1 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-12.2 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-12.3 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-12.4 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
| S-12.5 | Pass | Pass | Pass | Pass | Pass | Pass | **Pass** |
