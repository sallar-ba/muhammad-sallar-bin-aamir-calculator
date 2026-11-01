// Turns the results of `npm run test:acceptance` (test-results/acceptance.json) into
// docs/acceptance-report.md: one row per MVP acceptance criterion, one column per browser setup.
// Usage: npm run test:acceptance; node e2e/acceptance-report.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const run = JSON.parse(readFileSync(new URL('test-results/acceptance.json', root), 'utf8'))
const stories = readFileSync(new URL('docs/user-stories.md', root), 'utf8')

// Story titles and criterion IDs, in document order, from the MVP part of user-stories.md.
const mvp = stories.split('\n## Later')[0]
const storyTitles = new Map([...mvp.matchAll(/^## (S-\d+) \(serves (J-\d+)/gm)].map((m) => [m[1], m[2]]))
const criteria = [...mvp.matchAll(/^- \*\*(S-\d+\.\d+)\*\*/gm)].map((m) => m[1])

// Test title (the criterion ID) -> project name -> status.
const results = new Map()
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const status = t.results.at(-1)?.status ?? 'not run'
      if (!results.has(spec.title)) results.set(spec.title, new Map())
      results.get(spec.title).set(t.projectName, status === 'passed' ? 'Pass' : status === 'skipped' ? 'Skipped' : 'Fail')
    }
  }
  for (const child of suite.suites ?? []) walk(child)
}
for (const suite of run.suites) walk(suite)

const projects = run.config.projects.map((p) => p.name)
const rows = criteria.map((id) => {
  const byProject = results.get(id)
  const cells = projects.map((p) => byProject?.get(p) ?? 'No test')
  const result = cells.every((c) => c === 'Pass') ? 'Pass' : 'Fail'
  return { id, story: id.split('.')[0], cells, result }
})

const storySummary = [...storyTitles.keys()].map((story) => {
  const own = rows.filter((row) => row.story === story)
  const passed = own.filter((row) => row.result === 'Pass').length
  return `| ${story} | ${storyTitles.get(story)} | ${passed} of ${own.length} | ${passed === own.length ? 'Implemented' : 'Not implemented'} |`
})

const date = new Date(run.stats.startTime).toISOString().slice(0, 10)
const failed = rows.filter((row) => row.result === 'Fail').length
const md = `# Acceptance report

Automated checks for every MVP acceptance criterion in [user-stories.md](user-stories.md), run in a real browser. Each criterion has one Playwright test, named by its ID, in [e2e/acceptance.spec.ts](../e2e/acceptance.spec.ts).

- **Run:** ${date}, \`npm run test:acceptance\` against the production build.
- **Browsers:** installed Google Chrome, Playwright's Chromium and WebKit (Safari's engine), each at desktop size (1440 × 900) and as a phone (Pixel 7 for Chrome and Chromium, iPhone 13 for WebKit), split across the light and dark themes.
- **Result:** ${rows.length - failed} of ${rows.length} automated checks pass in all ${projects.length} setups${failed ? `; ${failed} fail` : ''}.
- **Not covered here:** Firefox (it would not launch in the environment this was developed in), the Safari app itself and real phones (WebKit and device emulation stand in for them), and screen readers. In WebKit, S-1.12 uses Option+Tab, because Safari's Tab key skips buttons and menus on every site unless full keyboard access is turned on.

To regenerate: \`npm run test:acceptance\`, then \`node e2e/acceptance-report.mjs\`.

## By story

| Story | Serves | Automated checks passing | Status |
|---|---|---|---|
${storySummary.join('\n')}

S-9, S-10 and S-11 are deferred (Later) and not tested.

## By criterion

| Criterion | ${projects.join(' | ')} | Result |
|---|${projects.map(() => '---').join('|')}|---|
${rows.map((row) => `| ${row.id} | ${row.cells.join(' | ')} | **${row.result}** |`).join('\n')}
`

writeFileSync(new URL('docs/acceptance-report.md', root), md)
console.log(`docs/acceptance-report.md: ${rows.length - failed}/${rows.length} automated checks pass in ${projects.length} setups`)
