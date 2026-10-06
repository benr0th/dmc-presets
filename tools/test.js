// Checks presets.js: the mod's built-in presets parse, round-trip through text and share links.
// node tools/test.js [path to DylanMayCry.presets.ini] (default: the mod repo next to this one)
const fs = require('fs');
const path = require('path');
const P = require('../presets.js');
const assert = require('assert');

const iniPath = process.argv[2] || path.join(__dirname, '..', '..', 'CONTROLResonantCombatMod', 'DylanMayCry.presets.ini');
const ini = fs.readFileSync(iniPath, 'utf8');
const parsed = P.parsePresetText(ini);
assert(parsed.presets.length >= 3, 'built-in presets read');
for (const p of parsed.presets) {
    assert.deepStrictEqual(p.skipped, [], p.name + ' has no skipped lines');
    const again = P.parsePresetText(P.presetText(p)).presets[0];
    assert.deepStrictEqual(again.moves, p.moves, p.name + ' text round trip');
    const linked = P.decode(P.encode(p));
    assert.deepStrictEqual(linked.moves, p.moves, p.name + ' link round trip');
    assert.strictEqual(linked.name, p.name);
}

const shared = `; Dylan May Cry preset (CONTROL Resonant mod; copy all of this, then Combo List > Presets > Paste a copied preset)
[Shield Bash ✦ Ünïcode]
LH = Combat ability, Ability slot 3
hl = crush, 5
LLH = Strike, Heavy finisher
LHH = Nope, Hit 1
Abilities = 3:ABILITY_SHIELD, 6:ABILITY_PUSH, 9:ABILITY_X, 2:lower
`;
const r = P.parsePresetText(shared);
assert.strictEqual(r.presets.length, 1);
const p = r.presets[0];
assert.strictEqual(P.comboCount(p), 2);
assert.strictEqual(p.skipped.length, 2);
assert.strictEqual(p.abilities[2], 'ABILITY_SHIELD');
assert.strictEqual(p.abilities[5], 'ABILITY_PUSH');
const text = P.presetText(p);
assert(text.includes('Abilities = 3:ABILITY_SHIELD\r\n'), 'only used slots in the Abilities line');
const code = P.encode(p);
const back = P.decode(code);
assert.deepStrictEqual(back.moves, p.moves);
assert.strictEqual(back.abilities[2], 'ABILITY_SHIELD');
assert.strictEqual(back.abilities[5], '', 'unused slot not in the link');
assert.strictEqual(back.name, p.name);
assert.strictEqual(P.cleanName(' [a]=b;"c' + String.fromCharCode(92) + 'x'.repeat(40)), 'abc' + 'x'.repeat(28), 'cleanName strips, caps at 32 bytes (the space counts), trims');
// Id / Updated (mod, 2026-10-06): text and link round trips; a v1 link still opens.
const stamped = P.parsePresetText(shared.replace('[Shield Bash ✦ Ünïcode]\n',
    '[Shield Bash ✦ Ünïcode]\nId = 9f3a12c4\nUpdated = 2026-10-06 17:45 UTC\n')).presets[0];
assert.strictEqual(stamped.id, 0x9F3A12C4);
assert.strictEqual(stamped.updated, Date.UTC(2026, 9, 6, 17, 45) / 1000);
assert(P.presetText(stamped).includes('\r\nId = 9F3A12C4\r\nUpdated = 2026-10-06 17:45 UTC\r\n'));
const stampedBack = P.decode(P.encode(stamped));
assert.strictEqual(stampedBack.id, stamped.id);
assert.strictEqual(stampedBack.updated, stamped.updated);
assert.deepStrictEqual(stampedBack.moves, stamped.moves);
const v1 = P.decode('AQVBbHBoYQEAEQA');   // a v1 link made before stamps: [Alpha] LH = Strike, Hit 1
assert(v1 && v1.name === 'Alpha' && v1.id === 0 && v1.updated === 0, 'v1 links still decode');
assert.strictEqual(P.parsePresetText('[a]\nId = nothex\nUpdated = soon\nLH = Crush, Hit 1\n').presets[0].id, 0);
assert.strictEqual(P.decode('garbage!'), null);
assert.strictEqual(P.decode(''), null);
assert.strictEqual(P.decode(code.slice(0, 5)), null);
console.log('ok:', parsed.presets.map(p => p.name).join(', '), '| link', code.length, 'chars:', code);
