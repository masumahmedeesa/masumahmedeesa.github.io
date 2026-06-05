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

Production build:

```bash
npm run build
npm run preview
```

## Content Management

The site is static, so the CMS does not require a backend, server, or extra database package.

- Main database file: `public/content/portfolio-content.json`
- Browser draft storage: `localStorage` key `treePortfolio.content.v1`
- Fallback source: `src/data/portfolio.js`
- CMS route: `/#/admin`

How to make permanent content changes:

1. Run the site locally with `npm run dev`.
2. Open `/#/admin`.
3. Edit profile, tree labels, projects, social links, or the full JSON.
4. Click `Save Draft` to preview changes in the same browser.
5. Click `Export JSON`.
6. Replace `public/content/portfolio-content.json` with the exported file.
7. Commit and push the change.

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

1. Push the `stable-tree` branch or `main` branch to GitHub.
2. In GitHub, open `Settings` > `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Run the `Deploy to GitHub Pages` workflow or push a new commit.

For a `username.github.io` repository, keep the base path as `/`.

For a project page such as `https://username.github.io/my-portfolio/`:

1. Open repository `Settings` > `Secrets and variables` > `Actions` > `Variables`.
2. Add a repository variable named `VITE_BASE_PATH`.
3. Set its value to `/my-portfolio/`.
4. Push or re-run the deploy workflow.

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
.github/workflows/deploy.yml
```

## License

MIT. You can reuse, modify, and publish your own version of this portfolio.
