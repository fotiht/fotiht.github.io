# Fotih Turopov — Portfolio

A standalone static website. No npm install or build step is required.

## Open locally
Unzip the archive and open `index.html` in your browser.
Alternatively, from this folder run `python3 -m http.server 8000`, then visit http://localhost:8000.

## Files
- index.html: all page content, project cards, experience, and contact form.
- style.css: layout, colors, typography, and responsive styles.
- script.js: small page interactions and footer year.
- assets/: project screenshots, favicon, and resume PDF.

## Edit
Change text and links in index.html. Replace assets/fotih-turopov-resume.pdf with your latest resume, keeping the filename to preserve existing links. The included PDF is your supplied FT_resume_12-7.pdf, copied without content changes. The portrait is your supplied photo, displayed unchanged.

The contact form uses your existing Formspree endpoint. It requires internet access and an active Formspree account/form; verify delivery after publishing. Fonts load from Google Fonts, with local fallback fonts defined in CSS. Project links also require internet access.

## Publish on GitHub Pages
1. Back up your current fotiht.github.io repository before replacing files.
2. Copy the CONTENTS of this folder (index.html, style.css, script.js, assets/, and .nojekyll) into the repository root. Do not upload the ZIP itself or an extra enclosing folder.
3. Commit and push the changes.
4. In the repository Settings > Pages, configure publishing from the main branch and root directory if it is not already configured that way.
5. Wait for deployment, then visit https://fotiht.github.io/.

This download does not change your existing website or publish anything automatically.

## Design references
Original layout informed by the clear project presentation of https://brittanychiang.com/ and concise presentation of https://leerob.com/. The project screenshots and resume were reused from your previous portfolio.

## Updated content
The page highlights ML research with Prof. Shuai Xu, CWRUbotix, and BS/MS education. Pruning is described as ongoing work without unprovided results. Earlier projects remain accessible in an expandable section.
