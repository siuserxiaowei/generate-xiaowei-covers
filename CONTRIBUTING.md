# Contributing

Contributions are welcome when they preserve the project's evidence-first design constraints.

## Before opening a change

1. Keep the six content routes semantically distinct.
2. Do not add sample numbers, quotes, rankings, screenshots, or release claims without a first-party source.
3. Record every downloaded visual asset in `assets/SOURCES.md`.
4. Keep the task's titles, evidence plan, and composition decisions in `COVER_PROMPT.md`.
5. Do not add a portrait, customer image, or paid asset unless repository redistribution rights are clear.
6. Preserve independent composition for 3:4, 21:9, and 1:1.
7. Check the result at approximately 360px width.

## Local checks

```bash
npm test
```

For visual changes, also create a temporary project and render the affected route:

```bash
node scripts/new-cover-project.mjs /tmp/xw-cover-review wechat
node scripts/render-covers.mjs \
  /tmp/xw-cover-review/cover.html \
  /tmp/xw-cover-review/output \
  --only release
```

Check that the exact output dimensions match the template and that no title, face, hand, evidence label, or footer is clipped.

## Pull requests

Describe:

- the content or rendering problem being solved;
- the route and surfaces affected;
- the evidence and asset sources used;
- the validation commands and visual checks performed;
- any licensing, privacy, or trademark implications.

Do not combine unrelated template redesigns, factual sample updates, and renderer refactors in one pull request.
