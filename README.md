# Fotih Turopov — Portfolio

A static site with no build step: `index.html`, `style.css`, `script.js` and `assets/`.

## Open locally
Run `python -m http.server 8000` in this folder and visit http://localhost:8000.

## Design
The page is set as research stationery on lake navy: a paper card with the name, a Story MoE spread with a live top-2 routing demo, the other projects as stacked folders, a letter with a tear-off email strip, the experience as a printed sheet, a contact card on the Cleveland skyline, and a postcard footer uncovered as the page lifts away.

- Type: Barlow Condensed (display) and Barlow (text), from Google Fonts.
- Colours: tokens at the top of `style.css` (`--ground`, `--paper`, `--ink`, `--gold`).
- Motion: CSS transitions and scroll timelines, with a `prefers-reduced-motion` fallback. Content stays visible without JavaScript.

## Edit
- Text and links: `index.html`.
- Résumé: replace `assets/fotih-turopov-resume.pdf`, keeping the filename.
- The routing demo in Story MoE is a toy router with fixed pseudo-random weights (`script.js`). It shows the mechanism, not the trained model.

## Contact form
The form posts to Formspree (`https://formspree.io/f/movdknjz`) and shows its result in place. Send one real test message after publishing to confirm delivery.

## Picture credits
Credited in the footer and listed in `assets/credits.json`:
- Cleveland skyline from Lakewood Park, January 2026 — Erik Drost, CC BY 4.0, Wikimedia Commons
- Kelvin Smith Library, Case Western Reserve University — Usaf 1832, CC BY 4.0, Wikimedia Commons
- ROV Kaiko Mk-IV — Kestrel, CC BY-SA 4.0, Wikimedia Commons

## Publish on GitHub Pages
Copy the contents of this folder into the root of the `fotiht.github.io` repository, commit and push. The included `.github/workflows/static.yml` deploys it.
