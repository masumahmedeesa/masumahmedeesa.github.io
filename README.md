# Interactive 3D Tree Portfolio

A premium React portfolio built around a cinematic Three.js tree. Each interactive leaf opens a professional section such as profile, objective, experience, education, skills, research, projects, social links, and contact details.

## Features

- React, Three.js, React Three Fiber, Drei, GSAP, and Vite
- Real-time 3D tree navigation with animated leaves and camera focus
- Static JSON content database for GitHub Pages
- Built-in browser CMS at `/#/admin`
- Project cards, skill meters, timelines, contact links, garden scene, particles, sun, grass, and insects
- Responsive desktop and mobile layouts

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. The content manager is available at:

```text
http://localhost:5173/#/admin
```

The content manager is enabled automatically during local development. Production builds hide the public admin route by default so visitors cannot open editing tools on GitHub Pages.

Production build:

```bash
npm run build
npm run preview
```

## Content Management

The site is static, so the CMS does not require a backend, server, or extra database package.

- Main database file: `public/content/portfolio-content.json`
- Preview drafts: in-memory only; browser reload resets everything to the JSON database
- Fallback source: `src/data/portfolio.js`
- CMS route: `/#/admin` in local development

How to make permanent content changes:

1. Run the site locally with `npm run dev`.
2. Open `/#/admin`.
3. Edit profile, section titles, objective, experience, education, skills, research, projects, social links, media, resume, or the full JSON.
4. Click `Save Draft` to preview changes before reloading.
5. Before any reload, click `Export JSON` or `Copy JSON`.
6. Replace `public/content/portfolio-content.json` with the exported file.
7. Commit and push the change.

Media fields accept local project paths, online URLs, or uploaded draft files. Uploaded photos and resumes are preview-only and reset on reload; for permanent use, add real assets to the repo or keep a permanent online URL in the exported JSON.

For safety, the CMS blocks unsafe URL schemes before save, copy, export, and render. Use `https://`, `http://`, `mailto:`, `tel:`, hash links, or repo-relative paths such as `/images/portfolio/demo.jpg`. Draft uploads are limited to raster images under 3 MB and resume files under 8 MB.

If you intentionally want the CMS visible in a production demo, build with:

```bash
VITE_ENABLE_PUBLIC_CMS=true npm run build
```

Keep it disabled for a public personal site unless you specifically want visitors to inspect the editor.

To regenerate the starter JSON from `src/data/portfolio.js`:

```bash
npm run content:sync
```

Use this only when you intentionally want the module content to overwrite the JSON starter file.

## Customize For Your Own Portfolio

1. Fork or clone this repository.
2. Replace static assets in `public/`:
   - `public/images/`
   - `public/resume.pdf`
   - icons or manifest files if needed
3. Update content through `/#/admin` or by editing `public/content/portfolio-content.json`.
4. Keep these section IDs unless you also update the component logic:
   - `name`
   - `objective`
   - `whoami`
   - `experience`
   - `education`
   - `skills`
   - `research`
   - `showcase`
   - `follow`
   - `contact`
5. To add another tree item, add it to:
   - `sectionOrder`
   - `treeNavItems`
   - `sections`
6. Existing section `type` values are rendered by `src/components/ContentPanel.jsx`. New section types need a matching React renderer.

Tree leaf position format:

```json
{
  "id": "skills",
  "label": "Skills",
  "position": [1.08, 0.0, -0.55],
  "tint": "#f497b6"
}
```

Adjust `position[0]` to move left or right, `position[1]` to move up or down, and `position[2]` to move forward or backward in depth.

## GitHub Pages

This repo includes `.github/workflows/deploy.yml`. It builds the Vite app and publishes `dist/` using GitHub Pages Actions.

For this repository:

1. Push the `main` branch to GitHub.
2. In GitHub, open `Settings` > `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Run the `Deploy to GitHub Pages` workflow or push a new commit.

For a `username.github.io` repository, keep the base path as `/`.

For a project page such as `https://username.github.io/my-portfolio/`:

1. Open repository `Settings` > `Secrets and variables` > `Actions` > `Variables`.
2. Add a repository variable named `VITE_BASE_PATH`.
3. Set its value to `/my-portfolio/`.
4. Push or re-run the deploy workflow.

## Testing

Run the automated QA suite:

```bash
npm run test:qa
```

Run the full pre-publish check:

```bash
npm test
```

`npm test` runs the security/content test cases and then builds the production bundle. The current automated coverage checks:

- CMS route exposure rules
- Full JSON draft save behavior
- URL sanitization for links, images, resumes, projects, research, and social links
- Draft upload validation for image/resume MIME types, extensions, and file sizes
- Data URL detection before copy/export
- Content normalization, including removing unused project gallery fields
- Production build integrity

Manual browser QA checklist:

1. Start the site with `npm run dev`.
2. Open the portfolio and click every tree leaf: Myself, Objective, Who Am I, Experience, Education, Skills, Research, Projects, Follow Me, and Contact.
3. Confirm the tree camera animates, the selected leaf responds, and the content panel updates.
4. Open `/#/admin`.
5. Edit one field in every CMS tab, then click `Save Draft`.
6. Return to the portfolio and confirm every draft change is visible.
7. Test online media URLs for portrait, research image, project image, and resume.
8. Test draft uploads manually: upload a small PNG/JPG/WebP portrait, upload a PDF resume, save draft, and confirm previews update.
9. Click `Copy JSON` and `Export JSON`; if draft uploads are present, confirm you understand the base64 data URL warning.
10. Reload the browser and confirm draft changes reset to `public/content/portfolio-content.json`.
11. Test responsive layouts at mobile, tablet, and desktop widths.
12. Run `npm test` again before committing or deploying.

## File Structure

```text
public/
  content/portfolio-content.json
  images/
  resume.pdf
src/
  App.jsx
  components/
    ContentManager.jsx
    ContentPanel.jsx
    TreeExperience.jsx
  data/
    PortfolioContentContext.jsx
    portfolio.js
  main.jsx
  styles.css
scripts/
  export-content.mjs
  qa-tests.mjs
.github/workflows/deploy.yml
```

## License

MIT. You can reuse, modify, and publish your own version of this portfolio.
