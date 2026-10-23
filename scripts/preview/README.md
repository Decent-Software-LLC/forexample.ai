# Preview & Verify Tooling

Optional local tooling to build and inspect the site without a browser.
Not required for the site to run — these are dev/QA helpers.

## Requirements
- Docker (for the Jekyll build)
- Node 18+ (for the Playwright-based checks)

One-time setup:
```bash
npm install --no-save playwright
npx playwright install chromium
```

## Commands
```bash
# Build the site in Docker -> .preview-site/
bash scripts/preview/build.sh

# Serve + capture screenshots (desktop & mobile)
node scripts/preview/shoot.mjs 4173 scripts/preview/shots

# Check for layout overflow, broken images, console errors, design tokens
node scripts/preview/verify.mjs 4175

# Exercise search, filters, and theme toggle
node scripts/preview/interact.mjs 4176
```

Each Node script starts its own static server on the given port, so run them
one at a time (or on different ports).
