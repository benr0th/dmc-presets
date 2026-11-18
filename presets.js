// Dylan May Cry presets: the mod's preset text format, read and written as the mod does (src/dmc/commandlist.cpp:
// ParsePresetText, AddComboLine, CleanName, PresetText; src/dmc/menuvalidate.cpp: MakesMove). Keep the tables in step
// with src/common/config.h when the mod changes (the mod's tests/presets-site.test.mjs compares them). No DOM here (node runs it for tests:
// tools/test.js).
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
        'HHHHHL', 'HHHHHH', 'L', 'LL', 'LLL', 'H', 'HH', 'HHH', 'BFL', 'BFH', 'FL', 'FH', 'BL', 'BH', 'FBL', 'FBH',
        'DL', 'DH'];
    const BASICS = new Set(['L', 'LL', 'LLL', 'H', 'HH', 'HHH']);
    // Motion input rows (mod 0.7.0+, while locked on): B = back, F = forward on the stick, then the attack.
    const MOTIONS = new Set(['BFL', 'BFH', 'FL', 'FH', 'BL', 'BH', 'FBL', 'FBH']);
    // Dodge rows: light / heavy pressed during a dodge, in place of the game's dodge attack. Their line in a preset's
    // text is "Dodge = L: <weapon>, <move>" (commandlist.cpp kDodgeKey), not "DL = ...": mods before the rows read a
    // line's key by its L / H / B / F letters alone, so "DL" would have set their L row.
    const DODGES = new Set(['DL', 'DH']);
    const DODGE_KEY = 'Dodge';
    // config.h kPatternWeaponNames / kPatternMoveNames.
    const WEAPONS = ['Off', 'Strike', 'Cleave', 'Glaive', 'Crush', 'Drill', 'Extend', 'Uppercut Surge',
        'Concussive Beatdown', 'Wide Edge', 'Spin Edge', 'Split Pivot', 'Split Orbit', 'Combat ability', 'Custom move'];
    const MOVES = ['', 'Hit 1', 'Hit 2', 'Hit 3', 'Dodge attack', 'Heavy finisher', 'Ability slot 1', 'Ability slot 2',
        'Ability slot 3', 'Ability slot 4', 'Ability slot 5', 'Ability slot 6', 'Sprint attack'];
    const WEAPON_ABILITY = 13, MOVE_DODGE = 4, MOVE_HEAVY_FINISHER = 5, MOVE_SLOT1 = 6, SLOT_COUNT = 6;
    const MOVE_SPRINT = 12;  // a light form's sprint attack (mod 0.8.8)
    // Weapon 14 = a Power Creator custom move; its move is the power's number, written "Power N" (config.h
    // kPatternWeaponCustom / kCustomMoveMax, commandlist.cpp kPowerMovePrefix).
    const WEAPON_CUSTOM = 14, CUSTOM_MOVE_MAX = 128, POWER_PREFIX = 'Power ';
    const MAX_NAME_BYTES = 32, MAX_ABILITY_KEY = 48, MAX_PRESETS = 10, MAX_LINES = 2000;
    const MAX_CLIPBOARD_CHARS = 16 * 1024;  // the mod doesn't read a longer clipboard text
    const HEADER = '; Dylan May Cry preset';
    const ABILITIES_KEY = 'Abilities';
    // Sharing updates (mod, 2026-10-06): "Id = 9F3A12C4" (made when the preset is first saved, kept through overwrites) and
    // "Updated = 2026-10-06 17:45 UTC" (when it was last saved). Pasting a newer version of an Id you have in the game
    // replaces yours.
    const ID_KEY = 'Id';
    const UPDATED_KEY = 'Updated';

    // Readable names for the game's ability keys. Unknown keys are made readable from the key (ABILITY_MOLD_TURRET ->
    // Mold Turret); add a key here when the game's name differs.
    const ABILITY_NAMES = {ABILITY_NEEDLES: "Spore Burst", ABILITY_SUNDER: "Astral Rebuke", ABILITY_FLAME_WAVE: "Inferno"};

    function weaponKind(w) {
        return w === 0 ? 'off' : w <= 3 ? 'light' : w <= 6 ? 'heavy' : w <= 12 ? 'finisher' : w === WEAPON_ABILITY ? 'ability' : 'custom';
    }

    // menuvalidate.cpp Problem / MakesMove.
    function makesMove(w, m) {
        if (!(w >= 1 && w < WEAPONS.length && m >= 1)) return false;
        if (w === WEAPON_CUSTOM) return m <= CUSTOM_MOVE_MAX;  // any number: Power Creator says whether it has it
        if (m >= MOVES.length) return false;
        const light = w <= 3, heavy = w >= 4 && w <= 6;
        const slotMove = m >= MOVE_SLOT1 && m < MOVE_SLOT1 + SLOT_COUNT;
        if (w === WEAPON_ABILITY || slotMove) return w === WEAPON_ABILITY && slotMove;
        if (!light && m === MOVE_SPRINT) return false;
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
            id: 0,       // 32-bit, 0 = none
            updated: 0,  // Unix seconds, 0 = not known
            skipped: [],
        };
    }

    const two = n => (n < 10 ? '0' : '') + n;

    // "2026-10-06 17:45 UTC" for Unix seconds.
    function updatedText(t) {
        const d = new Date(t * 1000);
        return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate()) + ' ' +
            two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ' UTC';
    }

    // ParseUpdated: Unix seconds from "2026-10-06 17:45 UTC" (time optional), 0 if it isn't one.
    function parseUpdated(text) {
        const m = /^(\d+)-(\d+)-(\d+)(?:\s+(\d+):(\d+))?/.exec(trim(text));
        if (!m) return 0;
        const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4] || 0, m[5] || 0].map(Number);
        if (y < 2026 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return 0;
        return Date.UTC(y, mo - 1, d, h, mi) / 1000;
    }

    function idText(id) {
        return id.toString(16).toUpperCase().padStart(8, '0');
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
        const key = equals >= 0 ? trim(text.slice(0, equals)).toLowerCase() : '';
        if (key === ID_KEY.toLowerCase()) {
            const value = trim(text.slice(equals + 1));
            preset.id = /^[0-9A-Fa-f]{1,8}$/.test(value) ? parseInt(value, 16) >>> 0 : 0;
            return;
        }
        if (key === UPDATED_KEY.toLowerCase()) {
            preset.updated = parseUpdated(text.slice(equals + 1));
            return;
        }
        const comma = text.indexOf(',', equals < 0 ? 0 : equals);
        if (text === '' || text[0] === ';' || equals < 0 || comma < 0) return;
        let presses = '';
        let nameAt = equals;  // the weapon's name comes after it
        if (key === DODGE_KEY.toLowerCase()) {
            // a dodge row, "Dodge = L: <weapon>, <move>": its button, then the choice as any row's
            const colon = text.indexOf(':', equals);
            const button = colon < 0 || colon > comma ? '' : trim(text.slice(equals + 1, colon));
            if (button.length === 1) {
                presses = 'D' + button.toUpperCase();
                nameAt = colon;
            }
        } else {
            for (const c of trim(text.slice(0, equals))) {
                const upper = c.toUpperCase();
                if (upper === 'L' || upper === 'H' || upper === 'B' || upper === 'F') presses += upper;  // B F: motion rows
            }
        }
        const index = PRESSES.indexOf(presses);
        // Glaive was called Slash up to mod 0.6.8: older presets still load (commandlist.cpp does the same).
        const weaponName = trim(text.slice(nameAt + 1, comma));
        const weapon = weaponName.toLowerCase() === 'slash' ? 3 : lookup(weaponName, WEAPONS);
        const moveText = trim(text.slice(comma + 1));
        let move;
        if (weapon === WEAPON_CUSTOM && moveText.toLowerCase().startsWith(POWER_PREFIX.toLowerCase())) {
            const number = /^\s*[+-]?\d+/.exec(moveText.slice(POWER_PREFIX.length));  // "Power N", read as atoi does
            move = number ? parseInt(number[0], 10) : 0;
        } else {
            // (an old mod build wrote a power row with the move name at its number, "Hit 2" = power 2: still read)
            move = lookup(moveText, MOVES);
        }
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

    // The move's name in a preset's text and on a card ("Power 5" for a custom move).
    function moveName(m) {
        return m.weapon === WEAPON_CUSTOM ? POWER_PREFIX + m.move : MOVES[m.move];
    }

    // RowLine: a row's line in a preset's text.
    function rowLine(index, m) {
        const presses = PRESSES[index];
        const choice = WEAPONS[m.weapon] + ', ' + moveName(m);
        return DODGES.has(presses) ? DODGE_KEY + ' = ' + presses[1] + ': ' + choice : presses + ' = ' + choice;
    }

    // PresetText: the text the mod's "Paste a copied preset" reads (same header, combo order and Abilities line).
    function presetText(preset) {
        let out = HEADER + ' (CONTROL Resonant mod; copy all of this, then Combo List > Presets > Paste a copied preset)\r\n[' +
            preset.name + ']\r\n';
        if (preset.id) out += ID_KEY + ' = ' + idText(preset.id) + '\r\n';
        if (preset.updated) out += UPDATED_KEY + ' = ' + updatedText(preset.updated) + '\r\n';
        PRESSES.forEach((presses, i) => {
            const m = preset.moves[i];
            if (m.weapon !== 0) out += rowLine(i, m) + '\r\n';
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
    // v2: [2] [id, 4 bytes big-endian] [updated, Unix seconds, 4 bytes big-endian], then v1 from the name on.
    // v3: v2, but a custom move's combo is [combo index] [14 << 4] [its number] (the number doesn't fit 4 bits). Only
    //     written for a preset with a custom move, so every other preset's link (and file number) stays as it was.
    const LINK_VERSION = 2, LINK_VERSION_CUSTOM = 3;
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
        const bytes = [preset.moves.some(m => m.weapon === WEAPON_CUSTOM) ? LINK_VERSION_CUSTOM : LINK_VERSION];
        const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
        bytes.push(...u32(preset.id >>> 0), ...u32(preset.updated >>> 0));
        const name = new TextEncoder().encode(preset.name);
        bytes.push(name.length, ...name);
        const combos = [];
        let count = 0;
        preset.moves.forEach((m, i) => {
            if (m.weapon === 0) return;
            if (m.weapon === WEAPON_CUSTOM) combos.push(i, m.weapon << 4, m.move);
            else combos.push(i, (m.weapon << 4) | m.move);
            count++;
        });
        bytes.push(count, ...combos);
        const used = usedSlots(preset);
        const abilities = [];
        count = 0;
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
            if (!b || !(b[0] >= 1 && b[0] <= LINK_VERSION_CUSTOM)) return null;
            let at = 1;
            const take = n => {
                if (at + n > b.length) throw new Error('short');
                const out = b.subarray(at, at + n);
                at += n;
                return out;
            };
            const preset = emptyPreset();
            if (b[0] >= 2) {
                const u32 = () => { const x = take(4); return ((x[0] << 24) | (x[1] << 16) | (x[2] << 8) | x[3]) >>> 0; };
                preset.id = u32();
                preset.updated = u32();
            }
            const nameLength = take(1)[0];
            preset.name = cleanName(new TextDecoder('utf-8', { fatal: true }).decode(take(nameLength)));
            const combos = take(1)[0];
            for (let c = 0; c < combos; ++c) {
                const [index, wm] = take(2);
                const weapon = wm >> 4;
                if (weapon === WEAPON_CUSTOM && b[0] < LINK_VERSION_CUSTOM) continue;
                const move = weapon === WEAPON_CUSTOM ? take(1)[0] : wm & 15;
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
        PRESSES, BASICS, MOTIONS, DODGES, WEAPONS, MOVES, WEAPON_ABILITY, WEAPON_CUSTOM, MOVE_DODGE, MOVE_HEAVY_FINISHER,
        MOVE_SPRINT, SLOT_COUNT,
        MAX_CLIPBOARD_CHARS, HEADER,
        weaponKind, makesMove, moveName, cleanName, abilityName, abilitySlot, usedSlots, comboCount,
        parsePresetText, presetText, encode, decode, fileNumber, idText, updatedText,
    };
    if (typeof module !== 'undefined') module.exports = root.DMCPresets;
})(typeof window !== 'undefined' ? window : globalThis);
