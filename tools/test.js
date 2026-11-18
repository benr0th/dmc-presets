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
// Dodge rows ("Dodge = L: ...", never "DL = ..."), Sprint attack (light forms only), custom moves ("Power N", v3 links).
const extra = P.parsePresetText(`[Extras]
LH = Crush, Hit 1
Dodge = L: Crush, Hit 3
dodge = h : Strike, Hit 2
Dodge = X: Crush, Hit 1
Dodge = Crush, Hit 1
FL = Strike, Sprint attack
FH = Crush, Sprint attack
LLH = Custom move, Power 128
LHH = Custom move, Power 129
LHL = Custom move, Hit 2
HHL = Combat ability, Sprint attack
`).presets[0];
const at = presses => extra.moves[P.PRESSES.indexOf(presses)];
assert.deepStrictEqual(at('DL'), { weapon: 4, move: 3 });
assert.deepStrictEqual(at('DH'), { weapon: 1, move: 2 });
assert.deepStrictEqual(at('L'), { weapon: 0, move: 1 }, 'a dodge line never sets the L row');
assert.deepStrictEqual(at('FL'), { weapon: 1, move: 12 });
assert.deepStrictEqual(at('LLH'), { weapon: 14, move: 128 });
assert.deepStrictEqual(at('LHL'), { weapon: 14, move: 2 }, 'an old power row, written with a move name');
assert.deepStrictEqual(extra.skipped, ['Dodge = X: Crush, Hit 1', 'Dodge = Crush, Hit 1', 'FH = Crush, Sprint attack',
    'LHH = Custom move, Power 129', 'HHL = Combat ability, Sprint attack']);
const extraText = P.presetText(extra);
assert(extraText.includes('\r\nDodge = L: Crush, Hit 3\r\nDodge = H: Strike, Hit 2\r\n'), 'dodge lines written as the mod does');
assert(!/^D[LH] =/m.test(extraText));
assert(extraText.includes('\r\nLLH = Custom move, Power 128\r\n') && extraText.includes('\r\nLHL = Custom move, Power 2\r\n'));
assert.deepStrictEqual(P.parsePresetText(extraText).presets[0].moves, extra.moves, 'extras text round trip');
const extraCode = P.encode(extra);
assert.deepStrictEqual(P.decode(extraCode).moves, extra.moves, 'extras link round trip (v3)');
assert.strictEqual(P.decode(extraCode.slice(0, -3)), null);
const linkVersion = c => atob(c.replace(/-/g, '+').replace(/_/g, '/')).charCodeAt(0);
assert.strictEqual(linkVersion(code), 2, 'no custom move: still a v2 link');
assert.strictEqual(linkVersion(extraCode), 3);
assert.strictEqual(P.decode('garbage!'), null);
assert.strictEqual(P.decode(''), null);
assert.strictEqual(P.decode(code.slice(0, 5)), null);
console.log('ok:', parsed.presets.map(p => p.name).join(', '), '| link', code.length, 'chars:', code);
