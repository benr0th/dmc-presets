# Dylan May Cry preset archive

A small page for reading and sharing combo presets of **Dylan May Cry**, a mod for CONTROL Resonant.

Live: https://benr0th.github.io/dmc-presets/

- Paste a preset copied in the game (Combo List > Presets > Copy as text) to see its combos and what it needs.
- **Copy for the game** gives back the text the mod's *Paste a copied preset* reads.
- **Copy share link** puts the whole preset in the link (`#p=...`), so nothing is stored anywhere.

Static files only (`index.html`, `style.css`, `app.js`, `presets.js`), served by GitHub Pages.

`presets.js` reads and writes presets the way the mod does. When the mod changes its combos, weapons or moves, update
its tables to match, then run `node tools/test.js` (it reads the mod's built-in presets from `../CONTROLResonantCombatMod`,
or pass the path to `DylanMayCry.presets.ini`).

Fan-made. Not affiliated with Remedy Entertainment.
