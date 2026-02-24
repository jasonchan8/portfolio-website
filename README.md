# Jason Chan — Portfolio

A minimal, editorial portfolio built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies beyond Google Fonts.

## Design

- **Typography**: Space Grotesk (headings) + Instrument Serif (body)
- **Palette**: Deep black, warm off-white, vermillion accent
- **Layout**: Numbered magazine-style sections, asymmetric grids, generous whitespace
- **Motion**: Scroll-triggered reveals, CSS transitions, reduced-motion support

## Structure

- `index.html` — Semantic markup with all content hardcoded
- `styles.css` — Custom properties, responsive grid, grain overlay, animations
- `main.js` — Scroll reveal (Intersection Observer), mobile nav, smooth scroll
- `resume/` — PDF resume
- `reference/` — Reference letter

## Running Locally

Open `index.html` directly, or start a local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
