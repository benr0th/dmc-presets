// Dylan May Cry presets: the mod's preset text format, read and written as the mod does (src/dmc/commandlist.cpp:
// ParsePresetText, AddComboLine, CleanName, PresetText; src/dmc/menuvalidate.cpp: MakesMove). Keep the tables in step
// with src/common/config.h when the mod changes. No DOM here (node runs it for tests: tools/site_test.js).
(function (root) {
    'use strict';

    // config.h kPatternPresses: the index is the combo's id (share links store it).
    const PRESSES = [
        'LH', 'HL', 'LLH', 'LHH', 'LHL', 'HHL', 'HLL', 'HLH', 'LLLL', 'LLLH', 'LLHL', 'LLHH', 'LHLL', 'LHLH', 'LHHL',
        'LHHH', 'HLLL', 'HLLH', 'HLHL', 'HLHH', 'HHLL', 'HHLH', 'HHHL', 'HHHH', 'LLLLL', 'LLLLH', 'LLLHL', 'LLLHH',
        'LLHLL', 'LLHLH', 'LLHHL', 'LLHHH', 'LHLLL', 'LHLLH', 'LHLHL', 'LHLHH', 'LHHLL', 'LHHLH', 'LHHHL', 'LHHHH',
        'HLLLL', 'HLLLH', 'HLLHL', 'HLLHH', 'HLHLL', 'HLHLH', 'HLHHL', 'HLHHH', 'HHLLL', 'HHLLH', 'HHLHL', 'HHLHH',
        'HHHLL', 'HHHLH', 'HHHHL', 'HHHHH', 'LLLLLL', 'LLLLLH', 'LLLLHL', 'LLLLHH', 'LLLHLL', 'LLLHLH', 'LLLHHL',
        'LLLHHH', 'LLHLLL', 'LLHLLH', 'LLHLHL', 'LLHLHH', 'LLHHLL', 'LLHHLH', 'LLHHHL', 'LLHHHH', 'LHLLLL', 'LHLLLH',
        'LHLLHL', 'LHLLHH', 'LHLHLL', 'LHLHLH', 'LHLHHL', 'LHLHHH', 'LHHLLL', 'LHHLLH', 'LHHLHL', 'LHHLHH', 'LHHHLL',
        'LHHHLH', 'LHHHHL', 'LHHHHH', 'HLLLLL', 'HLLLLH', 'HLLLHL', 'HLLLHH', 'HLLHLL', 'HLLHLH', 'HLLHHL', 'HLLHHH',
        'HLHLLL', 'HLHLLH', 'HLHLHL', 'HLHLHH', 'HLHHLL', 'HLHHLH', 'HLHHHL', 'HLHHHH', 'HHLLLL', 'HHLLLH', 'HHLLHL',
        'HHLLHH', 'HHLHLL', 'HHLHLH', 'HHLHHL', 'HHLHHH', 'HHHLLL', 'HHHLLH', 'HHHLHL', 'HHHLHH', 'HHHHLL', 'HHHHLH',
        'HHHHHL', 'HHHHHH', 'L', 'LL', 'LLL', 'H', 'HH', 'HHH'];
    const BASICS = new Set(['L', 'LL', 'LLL', 'H', 'HH', 'HHH']);
    // config.h kPatternWeaponNames / kPatternMoveNames.
    const WEAPONS = ['Off', 'Strike', 'Cleave', 'Slash', 'Crush', 'Drill', 'Extend', 'Uppercut Surge',
        'Concussive Beatdown', 'Wide Edge', 'Spin Edge', 'Split Pivot', 'Split Orbit', 'Combat ability'];
    const MOVES = ['', 'Hit 1', 'Hit 2', 'Hit 3', 'Dodge attack', 'Heavy finisher', 'Ability slot 1', 'Ability slot 2',
        'Ability slot 3', 'Ability slot 4', 'Ability slot 5', 'Ability slot 6'];
    const WEAPON_ABILITY = 13, MOVE_DODGE = 4, MOVE_HEAVY_FINISHER = 5, MOVE_SLOT1 = 6, SLOT_COUNT = 6;
    const MAX_NAME_BYTES = 32, MAX_ABILITY_KEY = 48, MAX_PRESETS = 10, MAX_LINES = 2000;
    const MAX_CLIPBOARD_CHARS = 16 * 1024;  // the mod doesn't read a longer clipboard text
    const HEADER = '; Dylan May Cry preset';
    const ABILITIES_KEY = 'Abilities';

    // Readable names for the game's ability keys. Unknown keys are made readable from the key (ABILITY_MOLD_TURRET ->
    // Mold Turret); add a key here when the game's name differs.
    const ABILITY_NAMES = {ABILITY_NEEDLES: "Spore Burst"};

    function weaponKind(w) {
        return w === 0 ? 'off' : w <= 3 ? 'light' : w <= 6 ? 'heavy' : w <= 12 ? 'finisher' : 'ability';
    }

    // menuvalidate.cpp Problem / MakesMove.
    function makesMove(w, m) {
        if (!(w >= 1 && w < WEAPONS.length && m >= 1 && m < MOVES.length)) return false;
        const light = w <= 3, heavy = w >= 4 && w <= 6;
        if (w === WEAPON_ABILITY) return m >= MOVE_SLOT1;
        if (m >= MOVE_SLOT1) return false;
        if (light && m === MOVE_HEAVY_FINISHER) return false;
        if (!light && !heavy && (m === MOVE_DODGE || m === MOVE_HEAVY_FINISHER)) return false;
        if ((w === 7 || w === 9) && m >= 2 && m <= 3) return false;
        if ((w === 11 || w === 12) && m === 3) return false;
        return true;
    }

    function trim(s) {
        return s.replace(/^[ \t]+/, '').replace(/[ \t\r]+$/, '');
    }

    // The index of `name` in `names` (any case), or the number it is; -1 if neither.
    function lookup(name, names) {
        const lower = name.toLowerCase();
        for (let i = 0; i < names.length; ++i) {
            if (names[i].toLowerCase() === lower) return i;
        }
        if (/^[+-]?\d+$/.test(name)) {
            const n = parseInt(name, 10);
            if (n >= 0 && n < names.length) return n;
        }
        return -1;
    }

    function utf8Length(ch) {
        const c = ch.codePointAt(0);
        return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }

    // CleanName: printable characters only (no [ ] = ; " \), trimmed, at most 32 UTF-8 bytes.
    function cleanName(raw) {
        let out = '', bytes = 0;
        for (const ch of raw) {
            const c = ch.codePointAt(0);
            if (c >= 0xD800 && c <= 0xDFFF) break;  // a lone surrogate (invalid UTF-8 ends it in the mod)
            if (c < 0x80 && (c < 0x20 || c === 0x7F || '[]=;"\\'.includes(ch))) continue;
            const n = utf8Length(ch);
            if (bytes + n > MAX_NAME_BYTES) break;
            out += ch;
            bytes += n;
        }
        return trim(out);
    }

    function isAbilityKey(key) {
        return key.length > 0 && key.length <= MAX_ABILITY_KEY && /^[A-Z0-9_]+$/.test(key);
    }

    function abilityName(key) {
        if (ABILITY_NAMES[key]) return ABILITY_NAMES[key];
        return key.replace(/^ABILITY_/, '').split('_').filter(Boolean)
            .map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }

    function emptyPreset() {
        return {
            name: '',
            moves: PRESSES.map(() => ({ weapon: 0, move: 1 })),
            abilities: new Array(SLOT_COUNT).fill(''),
            skipped: [],
        };
    }

    // "3:ABILITY_SHIELD, 6:ABILITY_PUSH" (slots 1-6); unknown parts are skipped.
    function parseAbilities(text, abilities) {
        for (const raw of text.split(',')) {
            const part = trim(raw);
            const colon = part.indexOf(':');
            if (colon < 0) continue;
            const slot = parseInt(part.slice(0, colon), 10);
            const key = trim(part.slice(colon + 1));
            if (slot >= 1 && slot <= SLOT_COUNT && isAbilityKey(key)) abilities[slot - 1] = key;
        }
    }

    // AddComboLine: one "<presses> = <weapon>, <move>" line. A line that looks like a combo but makes no move is kept
    // in preset.skipped (the mod logs it).
    function addComboLine(preset, text) {
        const equals = text.indexOf('=');
        if (equals >= 0 && trim(text.slice(0, equals)).toLowerCase() === ABILITIES_KEY.toLowerCase()) {
            parseAbilities(text.slice(equals + 1), preset.abilities);
            return;
        }
        const comma = text.indexOf(',', equals < 0 ? 0 : equals);
        if (text === '' || text[0] === ';' || equals < 0 || comma < 0) return;
        let presses = '';
        for (const c of trim(text.slice(0, equals))) {
            if (c === 'l' || c === 'L' || c === 'h' || c === 'H') presses += c.toUpperCase();
        }
        const index = PRESSES.indexOf(presses);
        const weapon = lookup(trim(text.slice(equals + 1, comma)), WEAPONS);
        const move = lookup(trim(text.slice(comma + 1)), MOVES);
        if (index < 0 || weapon < 0 || move < 0 || (weapon > 0 && !makesMove(weapon, move))) {
            preset.skipped.push(text);
            return;
        }
        preset.moves[index] = { weapon, move };
    }

    function comboCount(preset) {
        return preset.moves.filter(m => m.weapon !== 0).length;
    }

    // ParsePresetText: "[name]" lines start a preset, combo lines follow. Presets without a name or a combo are dropped.
    function parsePresetText(text) {
        const result = { presets: [], dropped: 0, hasHeader: text.includes(HEADER), tooLong: text.length > MAX_CLIPBOARD_CHARS };
        let current = emptyPreset(), open = false;
        const finish = () => {
            if (open) {
                if (comboCount(current) > 0 && current.name !== '' && result.presets.length < MAX_PRESETS) {
                    result.presets.push(current);
                } else {
                    result.dropped++;
                }
            }
            current = emptyPreset();
            open = false;
        };
        const lines = text.split('\n').slice(0, MAX_LINES);
        for (const raw of lines) {
            const line = trim(raw);
            if (line[0] === '[') {
                finish();
                const close = line.indexOf(']');
                current.name = cleanName(line.slice(1, close < 0 ? undefined : close));
                open = true;
            } else if (open) {
                addComboLine(current, line);
            }
        }
        finish();
        return result;
    }

    function abilitySlot(m) {
        return m.weapon === WEAPON_ABILITY && m.move >= MOVE_SLOT1 && m.move < MOVE_SLOT1 + SLOT_COUNT
            ? m.move - MOVE_SLOT1 : -1;
    }

    function usedSlots(preset) {
        const used = new Array(SLOT_COUNT).fill(false);
        for (const m of preset.moves) {
            const s = abilitySlot(m);
            if (s >= 0) used[s] = true;
        }
        return used;
    }

    // PresetText: the text the mod's "Paste a copied preset" reads (same header, combo order and Abilities line).
    function presetText(preset) {
        let out = HEADER + ' (CONTROL Resonant mod; copy all of this, then Combo List > Presets > Paste a copied preset)\r\n[' +
            preset.name + ']\r\n';
        PRESSES.forEach((presses, i) => {
            const m = preset.moves[i];
            if (m.weapon !== 0) out += presses + ' = ' + WEAPONS[m.weapon] + ', ' + MOVES[m.move] + '\r\n';
        });
        const used = usedSlots(preset);
        const known = [];
        for (let s = 0; s < SLOT_COUNT; ++s) {
            if (used[s] && preset.abilities[s]) known.push(s);
        }
        if (known.length === 0) return out;
        out += ABILITIES_KEY + ' = ' + known.map(s => (s + 1) + ':' + preset.abilities[s]).join(', ') + '\r\n';
        out += '; ' + known.map(s => 'slot ' + (s + 1) + ' = ' + abilityName(preset.abilities[s])).join(', ') +
            ' (loading it uses the slot each ability is in for you)\r\n';
        return out;
    }

    // ---- Share links: the preset packed into bytes, base64url, in the URL hash (#p=...) ----
    // v1: [1] [name length] [name UTF-8] [combo count] ([combo index] [weapon << 4 | move])...
    //     [ability count] ([slot 0-5, 0x80 = "ABILITY_" left out] [key length] [key])...
    const LINK_VERSION = 1;
    const ABILITY_PREFIX = 'ABILITY_';

    function toBase64Url(bytes) {
        let s = '';
        for (const b of bytes) s += String.fromCharCode(b);
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fromBase64Url(text) {
        if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
        const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
        return Uint8Array.from(s, c => c.charCodeAt(0));
    }

    function encode(preset) {
        const bytes = [LINK_VERSION];
        const name = new TextEncoder().encode(preset.name);
        bytes.push(name.length, ...name);
        const combos = [];
        preset.moves.forEach((m, i) => { if (m.weapon !== 0) combos.push(i, (m.weapon << 4) | m.move); });
        bytes.push(combos.length / 2, ...combos);
        const used = usedSlots(preset);
        const abilities = [];
        let count = 0;
        for (let s = 0; s < SLOT_COUNT; ++s) {
            const key = preset.abilities[s];
            if (!used[s] || !key) continue;
            const short = key.startsWith(ABILITY_PREFIX);
            const k = new TextEncoder().encode(short ? key.slice(ABILITY_PREFIX.length) : key);
            abilities.push(s | (short ? 0x80 : 0), k.length, ...k);
            count++;
        }
        bytes.push(count, ...abilities);
        return toBase64Url(bytes);
    }

    // A preset from a link, checked as a pasted text is; null if it isn't one.
    function decode(text) {
        try {
            const b = fromBase64Url(text);
            if (!b || b[0] !== LINK_VERSION) return null;
            let at = 1;
            const take = n => {
                if (at + n > b.length) throw new Error('short');
                const out = b.subarray(at, at + n);
                at += n;
                return out;
            };
            const preset = emptyPreset();
            const nameLength = take(1)[0];
            preset.name = cleanName(new TextDecoder('utf-8', { fatal: true }).decode(take(nameLength)));
            const combos = take(1)[0];
            for (let c = 0; c < combos; ++c) {
                const [index, wm] = take(2);
                const weapon = wm >> 4, move = wm & 15;
                if (index < PRESSES.length && makesMove(weapon, move)) preset.moves[index] = { weapon, move };
            }
            const abilities = take(1)[0];
            for (let a = 0; a < abilities; ++a) {
                const slot = take(1)[0];
                const keyLength = take(1)[0];
                let key = String.fromCharCode(...take(keyLength));
                if (slot & 0x80) key = ABILITY_PREFIX + key;
                if ((slot & 0x7F) < SLOT_COUNT && isAbilityKey(key)) preset.abilities[slot & 0x7F] = key;
            }
            return preset.name && comboCount(preset) > 0 ? preset : null;
        } catch (e) {
            return null;
        }
    }

    // A short file number for a preset (FNV-1a of its link), shown on its card.
    function fileNumber(code) {
        let h = 0x811c9dc5;
        for (let i = 0; i < code.length; ++i) {
            h ^= code.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h.toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
    }

    root.DMCPresets = {
        PRESSES, BASICS, WEAPONS, MOVES, WEAPON_ABILITY, MOVE_DODGE, MOVE_HEAVY_FINISHER, SLOT_COUNT,
        MAX_CLIPBOARD_CHARS, HEADER,
        weaponKind, makesMove, cleanName, abilityName, abilitySlot, usedSlots, comboCount,
        parsePresetText, presetText, encode, decode, fileNumber,
    };
    if (typeof module !== 'undefined') module.exports = root.DMCPresets;
})(typeof window !== 'undefined' ? window : globalThis);
