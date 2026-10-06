// The page: paste -> cards, share links (#p=...). Everything from a paste or a link is shown with textContent only.
(function () {
    'use strict';
    const P = window.DMCPresets;
    const $ = id => document.getElementById(id);

    const KIND_LABEL = { light: 'Light form', heavy: 'Heavy form', finisher: 'Light finisher', ability: 'Ability' };
    const EXAMPLE = '; Dylan May Cry preset (CONTROL Resonant mod; copy all of this, then Combo List > Presets > Paste a copied preset)\n' +
        '[Brawler]\nLH = Uppercut Surge, Hit 1\nHL = Concussive Beatdown, Hit 1\nLLH = Concussive Beatdown, Hit 2\n' +
        'LHL = Concussive Beatdown, Hit 2\nLHH = Crush, Heavy finisher\nHLL = Concussive Beatdown, Hit 3\n' +
        'HLH = Crush, Hit 3\nHHL = Crush, Dodge attack\nLLHH = Combat ability, Ability slot 3\nLHLH = Crush, Hit 2\n' +
        'Abilities = 3:ABILITY_SHIELD\n';

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    // ---- copying ----
    let toastTimer = 0;
    function toast(text) {
        const t = $('toast');
        t.textContent = text;
        t.classList.add('on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
    }

    async function copy(text, done) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            const area = el('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
        }
        toast(done);
    }

    function copyForGame(preset) {
        copy(P.presetText(preset), 'Copied. In the game: Combo List > Presets > Paste a copied preset');
    }

    function linkFor(code) {
        return location.origin + location.pathname + '#p=' + code;
    }

    // Unix seconds as "6 Oct 2026, 17:45" in the reader's time zone.
    function localTime(t) {
        return new Date(t * 1000).toLocaleString(undefined,
            { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // ---- a preset as a card ----
    function pressKeys(presses) {
        const keys = el('span', 'keys');
        for (const c of presses) keys.appendChild(el('span', 'key key-' + c.toLowerCase(), c));
        return keys;
    }

    function moveText(preset, m) {
        const slot = P.abilitySlot(m);
        if (slot < 0) return P.MOVES[m.move];
        const key = preset.abilities[slot];
        return 'Slot ' + (slot + 1) + (key ? ' · ' + P.abilityName(key) : '');
    }

    function comboRow(preset, i) {
        const m = preset.moves[i];
        const kind = P.weaponKind(m.weapon);
        const row = el('li', 'row');
        row.appendChild(pressKeys(P.PRESSES[i]));
        row.appendChild(el('span', 'arrow'));
        const what = el('span', 'what');
        what.appendChild(el('span', 'weapon', P.WEAPONS[m.weapon]));
        what.appendChild(el('span', 'move', moveText(preset, m)));
        row.appendChild(what);
        row.appendChild(el('span', 'tag tag-' + kind, KIND_LABEL[kind]));
        return row;
    }

    // What the preset needs: the forms and finishers, which ones' dodge attacks / heavy finishers, the abilities.
    function requisitions(preset) {
        const groups = [
            ['Light forms', new Set()], ['Heavy forms', new Set()], ['Light finishers', new Set()],
            ['Dodge attacks', new Set()], ['Heavy finishers', new Set()], ['Abilities', new Set()],
        ];
        const at = Object.fromEntries(groups);
        for (const m of preset.moves) {
            if (m.weapon === 0) continue;
            const name = P.WEAPONS[m.weapon], kind = P.weaponKind(m.weapon);
            if (kind === 'light') at['Light forms'].add(name);
            if (kind === 'heavy') at['Heavy forms'].add(name);
            if (kind === 'finisher') at['Light finishers'].add(name);
            if (m.move === P.MOVE_DODGE) at['Dodge attacks'].add(name);
            if (m.move === P.MOVE_HEAVY_FINISHER) at['Heavy finishers'].add(name);
            if (kind === 'ability') {
                const slot = P.abilitySlot(m), key = preset.abilities[slot];
                at['Abilities'].add(key ? P.abilityName(key) : 'Whatever is in slot ' + (slot + 1));
            }
        }
        const box = el('div', 'reqs');
        box.appendChild(el('h4', 'reqs-title', 'Requisitions'));
        for (const [label, names] of groups) {
            if (names.size === 0) continue;
            const line = el('div', 'req');
            line.appendChild(el('span', 'req-label', label));
            const chips = el('span', 'chips');
            for (const n of [...names].sort()) chips.appendChild(el('span', 'chip', n));
            line.appendChild(chips);
            box.appendChild(line);
        }
        return box;
    }

    function card(preset, options) {
        const code = P.encode(preset);
        const doc = el('article', 'doc');

        const band = el('div', 'doc-band');
        // its Id when it has one: the same file number across its updates
        band.appendChild(el('span', '', 'Bureau file No. ' + (preset.id ? P.idText(preset.id) : P.fileNumber(code))));
        band.appendChild(el('span', '', 'Dylan May Cry preset'));
        doc.appendChild(band);

        const head = el('div', 'doc-head');
        head.appendChild(el('h3', 'doc-title', preset.name));
        const combos = P.PRESSES.map((_, i) => i).filter(i => preset.moves[i].weapon !== 0);
        const strings = combos.filter(i => !P.BASICS.has(P.PRESSES[i]));
        const basics = combos.filter(i => P.BASICS.has(P.PRESSES[i]));
        const meta = [strings.length + (strings.length === 1 ? ' combo' : ' combos')];
        if (basics.length) meta.push(basics.length + ' basic attack' + (basics.length === 1 ? '' : 's'));
        if (preset.updated) meta.push('Updated ' + localTime(preset.updated));
        head.appendChild(el('p', 'doc-meta', meta.join(' · ')));
        doc.appendChild(head);

        const section = (title, list) => {
            if (!list.length) return;
            doc.appendChild(el('h4', 'doc-sub', title));
            const ul = el('ul', 'rows');
            for (const i of list) ul.appendChild(comboRow(preset, i));
            doc.appendChild(ul);
        };
        section('Combos', strings);
        section('Basic attacks', basics);

        if (preset.skipped.length) {
            const red = el('div', 'redacted');
            for (const line of preset.skipped) {
                const bar = el('span', 'bar');
                bar.style.width = Math.min(100, 30 + line.length * 1.5) + '%';
                bar.title = line;
                red.appendChild(bar);
            }
            red.appendChild(el('p', 'redacted-note', preset.skipped.length + ' line' +
                (preset.skipped.length === 1 ? '' : 's') + ' redacted: not a move this version of the mod knows ' +
                '(the game skips ' + (preset.skipped.length === 1 ? 'it' : 'them') + ' too). Hover a bar to see it.'));
            doc.appendChild(red);
        }

        doc.appendChild(requisitions(preset));

        const actions = el('div', 'doc-actions');
        const copyText = el('button', 'primary', 'Copy for the game');
        copyText.type = 'button';
        copyText.addEventListener('click', () => copyForGame(preset));
        const copyLink = el('button', 'secondary', 'Copy share link');
        copyLink.type = 'button';
        copyLink.addEventListener('click', () => {
            const link = linkFor(code);
            if (!options || !options.shared) history.replaceState(null, '', '#p=' + code);
            copy(link, 'Link copied');
        });
        actions.appendChild(copyText);
        actions.appendChild(copyLink);
        doc.appendChild(actions);
        doc.appendChild(el('span', 'stamp', 'Cleared'));
        return doc;
    }

    // ---- paste ----
    function render() {
        const text = $('input').value;
        const status = $('status');
        const cards = $('cards');
        cards.replaceChildren();
        status.className = 'status';
        if (!text.trim()) {
            status.textContent = '';
            $('results').hidden = true;
            return;
        }
        const r = P.parsePresetText(text);
        const notes = [];
        if (r.presets.length) {
            notes.push(r.presets.length + ' preset' + (r.presets.length === 1 ? '' : 's') + ' read');
        }
        if (r.dropped) notes.push(r.dropped + ' without a name or a combo left out');
        if (r.tooLong) notes.push('this text is longer than the game reads from the clipboard (16K characters)');
        if (!r.presets.length) {
            status.classList.add('bad');
            status.textContent = text.includes('[')
                ? 'No preset found: a preset needs a [Name] line and at least one combo line, like LH = Crush, Hit 1.'
                : 'No preset found: a preset starts with a [Name] line. Use Copy as text in the Combo List.';
            if (notes.length) status.textContent += ' (' + notes.join(', ') + ')';
            $('results').hidden = true;
            return;
        }
        status.classList.add('good');
        status.textContent = notes.join(' · ');
        for (const p of r.presets) cards.appendChild(card(p));
        $('results').hidden = false;
    }

    let renderTimer = 0;
    $('input').addEventListener('input', () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, 120);
    });
    $('example').addEventListener('click', () => {
        $('input').value = EXAMPLE;
        render();
        $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // ---- a shared link ----
    // Opened from a link: the copy button goes right under the (smaller) title, the card follows.
    let sharedPreset = null;
    function openLink() {
        const match = /^#p=([A-Za-z0-9_-]+)$/.exec(location.hash);
        const box = $('shared-card');
        box.replaceChildren();
        sharedPreset = match ? P.decode(match[1]) : null;
        document.body.classList.toggle('has-shared', sharedPreset !== null);
        $('handoff').hidden = sharedPreset === null;
        if (!match) {
            $('shared').hidden = true;
            return;
        }
        if (sharedPreset) {
            box.appendChild(card(sharedPreset, { shared: true }));
        } else {
            box.appendChild(el('p', 'status bad', 'This link has no preset in it (cut short when it was pasted?).'));
        }
        $('shared').hidden = false;
    }
    $('shared-copy').addEventListener('click', () => { if (sharedPreset) copyForGame(sharedPreset); });
    window.addEventListener('hashchange', openLink);
    openLink();
})();
