// Qarbon · js/translate.js: 🌐 Translate mode. Type a French or English word (or a short phrase), see it as the
// card you'd get, and add it to a deck in one tap. Free services with no account or key:
//   · your own cards and the built-in packs first (instant, and they work offline)
//   · Wiktionary (en.wiktionary.org): single words, with word type, gender and an example sentence
//   · MyMemory (mymemory.translated.net): phrases, and a second opinion for single words
//     (about 5,000 characters a day without an account; after that it says so until tomorrow)
// The script files run in the order index.html lists them, and share one set of variables.

const WIKI = "https://en.wiktionary.org";
const MYMEMORY = "https://api.mymemory.translated.net/get";
let trRun = 0;             // which lookup is the newest (late answers to older ones are ignored)
let trTimer = null;        // waits for a short pause in typing
let trResult = null;       // what's showing: { front, back, pos, gender, exFr, exEn, alts: [{ text, note }], local }
let packRows = null;       // the built-in packs' words, read once when first needed

// ================= small helpers =================
const trDirFr = () => state.trDir === "fr";   // true = French → English
const ARTICLE = /^(le|la|les|un|une|des|l['’])\s*/i;
const bare = w => w.trim().replace(ARTICLE, "").trim();                  // "la fenêtre" → "fenêtre"
const plainWord = t => String(t || "").toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
const noTags = html => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.replace(/\s+/g, " ").trim(); };
const fromWiki = t => t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/'''?/g, "").trim();
// add le / la / l' to a French noun, like the built-in packs ("la fenêtre", "l'arbre")
function withArticle(word, gender) {
  if (ARTICLE.test(word) || !["m", "f"].includes(gender)) return word;
  if (/^[aeiouyàâäéèêëîïôöùûüh]/i.test(word)) return "l'" + word;
  return (gender === "m" ? "le " : "la ") + word;
}
// Wiktionary's word types → the ones Qarbon's cards use
const POS = { noun: "noun", "proper noun": "noun", verb: "verb", adjective: "adjective", adverb: "adverb", pronoun: "pronoun",
              preposition: "preposition", conjunction: "conjunction", article: "article", determiner: "determiner",
              interjection: "expression", phrase: "expression", "prepositional phrase": "expression", idiom: "expression" };

// ================= 1. your cards and the built-in packs (offline) =================
function localMatch(q) {
  if (!packRows) {
    packRows = BUILT_IN.flatMap(s => {
      const rows = parseCSV(PACKS[s.id].trim()), head = rows[0];
      return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]))).map(o => ({ ...o, pack: s.name }));
    });
  }
  const want = plainWord(bare(q));
  const fits = c => trDirFr()
    ? plainWord(bare(c.front)) === want || plainWord(c.front) === plainWord(q)
    : String(c.back || "").toLowerCase().split(/\s*[/,;]\s*/).some(b => plainWord(b.replace(/^to /, "")) === plainWord(q.replace(/^to /, "")));
  const mine = state.cards.find(fits);
  if (mine) return { card: mine, where: "your cards" };
  const row = packRows.find(fits);
  return row ? { card: row, where: row.pack } : null;
}

// ================= 2. Wiktionary =================
// a French word's meanings in English, its word type and an example (the "definition" service)
async function wikiDefinitions(word) {
  const res = await fetchWithin(WIKI + "/api/rest_v1/page/definition/" + encodeURIComponent(word.replace(/ /g, "_")), 12);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(res.status);
  const fr = ((await res.json()).fr || []);
  if (!fr.length) return null;
  const meanings = [], first = fr[0];
  let exFr = "", exEn = "";
  fr.forEach(entry => (entry.definitions || []).forEach(d => {
    const text = noTags(d.definition || "");
    if (text) meanings.push({ text, pos: String(entry.partOfSpeech || "").toLowerCase() });
    const ex = (d.parsedExamples || []).find(x => x.translation && x.example);
    if (!exFr && ex && noTags(ex.example).length < 90) { exFr = noTags(ex.example); exEn = noTags(ex.translation); }
  }));
  return { pos: String(first.partOfSpeech || "").toLowerCase(), meanings, exFr, exEn };
}

// a page's source text (to find a French noun's gender, or an English word's French translations)
async function wikiSource(title) {
  const res = await fetchWithin(WIKI + "/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2" +
                                "&format=json&origin=*&titles=" + encodeURIComponent(title), 12);
  if (!res.ok) throw new Error(res.status);
  const page = ((await res.json()).query || {}).pages || [];
  return page[0] && page[0].revisions ? page[0].revisions[0].slots.main.content : "";
}
// the part of a page about one language ("==French==" up to the next language)
function section(text, lang) {
  const i = text.indexOf("==" + lang + "==");
  if (i < 0) return "";
  const rest = text.slice(i + 4 + lang.length), next = rest.search(/\n==[^=]/);
  return next < 0 ? rest : rest.slice(0, next);
}
// a French noun's gender from its page, like {{fr-noun|f}}
async function wikiGender(word) {
  const fr = section(await wikiSource(word), "French");
  const m = fr.match(/\{\{fr-noun\|(m|f|mf|m-p|f-p)\b/) || fr.match(/\{\{fr-proper noun\|(m|f)\b/);
  return !m ? "" : m[1] === "mf" ? "m/f" : m[1][0];
}
// an English word's French translations, in the page's order (big words keep them on a "/translations" page)
async function wikiTranslations(word) {
  const [main, sub] = await Promise.all([wikiSource(word), wikiSource(word + "/translations").catch(() => "")]);
  const out = [];
  [section(sub, "English") || sub, section(main, "English")].forEach(text => {
    // every "* French: …" line, whichever kind of translation box it's in; its meaning is the box's title, if it has one
    for (const m of text.matchAll(/^\*:? French: (.*)$/gm)) {
      const tops = [...text.slice(0, m.index).matchAll(/\{\{(?:trans-top(?:-see|-also)?|checktrans-top)(?:\|([^}|]*))?[^}]*\}\}/g)];
      const note = tops.length ? fromWiki(tops[tops.length - 1][1] || "") : "";
      for (const t of m[1].matchAll(/\{\{tt?\+?\|fr\|([^|}]+)((?:\|[^}]*)?)\}\}/g)) {
        const word = fromWiki(t[1]), g = (t[2].match(/\|(m|f)(?=\||$)/) || [])[1] || "";
        if (word && !out.some(o => o.text === word)) out.push({ text: word, gender: g, note });
      }
    }
  });
  return out;
}

// ================= 3. MyMemory =================
async function myMemory(q, from, to) {
  const res = await fetchWithin(MYMEMORY + "?q=" + encodeURIComponent(q) + "&langpair=" + from + "|" + to, 12);
  if (res.status === 429) return { limit: true };
  if (!res.ok) throw new Error(res.status);
  const d = await res.json();
  if (d.quotaFinished || /MYMEMORY WARNING/i.test((d.responseData || {}).translatedText || "")) return { limit: true };
  const main = noTags((d.responseData || {}).translatedText || "");
  const others = (d.matches || []).map(m => noTags(m.translation || "")).filter(t => t && t.toLowerCase() !== q.toLowerCase());
  return { main: main.toLowerCase() === q.toLowerCase() ? "" : main, all: [...new Set([main, ...others].filter(Boolean))] };
}

// ================= looking a word up =================
async function lookUp(q) {
  const run = ++trRun, fr = trDirFr();
  trResult = null;
  const local = localMatch(q);
  if (local) {   // a word you have (or one in a built-in pack): show it right away
    const c = local.card;
    trResult = { front: c.front, back: c.back, pos: c.part_of_speech, gender: c.gender, exFr: c.example_target, exEn: c.example_english,
                 alts: [], local: local.where, owned: state.cards.includes(c) ? c : null };
  }
  showTranslation(trResult ? "" : "Translating…");
  if (!navigator.onLine) {
    const found = !!trResult;
    if (!found) blankCard(q);
    showTranslation(found ? "" : "You're offline. Type the translation yourself, or connect to look it up.");
    return;
  }

  const short = q.split(/\s+/).length <= 3;   // single words and short expressions: Wiktionary first
  const settle = p => p.then(v => ({ ok: true, v }), () => ({ ok: false }));
  let res;
  if (fr) {
    const word = bare(q);
    const [defs, gender, mm] = await Promise.all([short ? settle(wikiDefinitions(word.toLowerCase())) : { ok: true, v: null },
                                                  short ? settle(wikiGender(word.toLowerCase())) : { ok: true, v: "" },
                                                  settle(myMemory(q, "fr", "en"))]);
    if (run !== trRun) return;   // you've typed something else since
    const d = defs.ok && defs.v, m = mm.ok && mm.v;
    const meanings = d ? d.meanings.map(x => x.text) : [];
    const back = shortMeaning(meanings[0] || (m && m.main) || "");
    if (!back && !trResult) return failed(q, mm, defs);
    const g = (gender.ok && gender.v) || (/^la\s|^une\s/i.test(q) ? "f" : /^le\s|^un\s/i.test(q) ? "m" : "");
    const pos = d ? POS[d.pos] || "" : q.includes(" ") ? "expression" : "";
    res = { front: pos === "noun" ? withArticle(word, g) : q.trim(), back, pos, gender: pos === "noun" ? g : "",
            exFr: d ? d.exFr : "", exEn: d ? d.exEn : "",
            alts: [...meanings.slice(1), ...((m && m.all) || [])].map(t => ({ text: shortMeaning(t) })), via: d ? "Wiktionary" : "MyMemory" };
  } else {
    const [tr, mm] = await Promise.all([short ? settle(wikiTranslations(q.trim().toLowerCase())) : { ok: true, v: [] }, settle(myMemory(q, "en", "fr"))]);
    if (run !== trRun) return;
    const cands = (tr.ok && tr.v) || [], m = mm.ok && mm.v;
    // Wiktionary's translation that MyMemory agrees with, else Wiktionary's first, else MyMemory's
    const agreed = m && cands.find(c => m.all.some(a => plainWord(bare(a)) === plainWord(c.text)));
    const pick = agreed || cands[0] || (m && m.main ? { text: m.main, gender: "" } : null);
    if (!pick && !trResult) return failed(q, mm, tr);
    if (pick) {
      res = await frenchDetails(pick.text, pick.gender, run);
      if (!res) return;
      res.back = q.trim();
      res.alts = [...cands.filter(c => c !== pick), ...((m && m.all) || []).filter(a => !cands.some(c => c.text === a)).map(text => ({ text }))]
        .filter(a => plainWord(bare(a.text)) !== plainWord(bare(pick.text)));
      res.via = cands.length ? "Wiktionary" : "MyMemory";
    }
  }
  if (run !== trRun) return;
  if (trResult && res) trResult.alts = res.alts.filter(a => plainWord(a.text) !== plainWord(trDirFr() ? trResult.back : bare(trResult.front)));
  else if (res) trResult = res;
  showTranslation("");
}

// the details of a French word (word type, gender, example) for the card's front
async function frenchDetails(word, gender, run) {
  const w = bare(word);
  const [defs, g] = await Promise.all([wikiDefinitions(w.toLowerCase()).catch(() => null), gender ? gender : wikiGender(w.toLowerCase()).catch(() => "")]);
  if (run !== trRun) return null;
  const pos = defs ? POS[defs.pos] || "" : w.includes(" ") ? "expression" : "";
  return { front: pos === "noun" ? withArticle(w, g) : word, pos, gender: pos === "noun" ? g : "", exFr: defs ? defs.exFr : "", exEn: defs ? defs.exEn : "", alts: [] };
}

// "window (opening for light)" → "window"; long meanings are cut at the first ; or ,
function shortMeaning(t) {
  t = String(t || "").replace(/^\([^)]*\)\s*/, "").replace(/\s*\([^)]*\)$/, "").trim();
  if (t.length > 50) t = t.split(/[;,.]/)[0];
  return t.slice(0, 80);
}

// nothing found online: say why, and let you type the card yourself
function failed(q, mm, wiki) {
  const limit = mm.ok && mm.v && mm.v.limit;
  const down = !mm.ok && !wiki.ok;
  blankCard(q);
  showTranslation(limit ? "MyMemory's free daily limit is used up (about 5,000 characters a day). It works again tomorrow; meanwhile, type the translation yourself."
    : down ? "The translators aren't answering right now. Type the translation yourself, or try again in a moment."
    : "No translation found. Check the spelling, or type the translation yourself.");
}
// an empty card with what you typed on its side, so you can still fill it in and add it
function blankCard(q) {
  trResult = trDirFr() ? { front: q.trim(), back: "", alts: [] } : { front: "", back: q.trim(), alts: [] };
}

// ================= drawing the screen =================
function renderTranslate() {
  const fr = trDirFr();
  $("tr-from").textContent = fr ? "Français" : "English";
  $("tr-to").textContent = fr ? "English" : "Français";
  $("tr-text").placeholder = fr ? "Type a French word or phrase" : "Type an English word or phrase";
  $("tr-text").lang = fr ? "fr" : "en";
  fillDecks();
  showTranslation($("tr-msg").textContent);
}

function showTranslation(msg) {
  $("tr-msg").textContent = msg;
  const r = trResult;
  $("tr-card").hidden = $("tr-addrow").hidden = !r;
  $("tr-altbox").hidden = !r || !r.alts.length;
  $("tr-note").textContent = "";
  if (!r) return;
  $("tr-card").dataset.type = r.pos || "";
  $("tr-pill").textContent = [r.pos, { m: "masculine", f: "feminine", "m/f": "masculine or feminine" }[r.gender]].filter(Boolean).join(" · ") || "word";
  if (document.activeElement !== $("tr-front")) $("tr-front").value = r.front || "";
  if (document.activeElement !== $("tr-back")) $("tr-back").value = r.back || "";
  $("tr-front").placeholder = "French"; $("tr-back").placeholder = "English";
  $("tr-ex").textContent = r.exFr ? r.exFr + (r.exEn ? " · " + r.exEn : "") : "";
  $("tr-say").hidden = !hasSpeech();
  $("tr-note").textContent = r.local ? (r.owned ? "✓ Already one of your cards" : "From the " + r.local + " deck")
                           : r.via ? "From " + r.via : "";
  const box = $("tr-alts");
  box.innerHTML = "";
  r.alts.slice(0, 8).forEach(a => {
    const b = document.createElement("button"); b.className = "tr-alt";
    b.textContent = a.text + (a.note ? " (" + a.note.slice(0, 30) + ")" : "");
    b.onclick = () => useAlt(a);
    box.appendChild(b);
  });
  updateAdd();
}

// tapping another meaning puts it on the card (English → French: it also looks up the new word's details)
async function useAlt(a) {
  const r = trResult;
  r.alts = r.alts.filter(x => x !== a);
  if (trDirFr()) {
    r.alts.unshift({ text: r.back }); r.back = a.text; delete r.local; delete r.owned;
    showTranslation("");
    return;
  }
  const old = r.front, run = ++trRun;
  showTranslation("Looking up “" + a.text + "”…");
  const d = await frenchDetails(a.text, a.gender, run);
  if (!d || run !== trRun) return;
  Object.assign(r, { front: d.front, pos: d.pos, gender: d.gender, exFr: d.exFr, exEn: d.exEn });
  delete r.local; delete r.owned;
  if (old) r.alts.unshift({ text: bare(old) });
  showTranslation("");
}

// the deck dropdown: your own decks, or French (the course's word lists are fixed, so it goes in its personal binder)
function fillDecks() {
  const sel = $("tr-deck");
  sel.innerHTML = "";
  const opt = (value, text) => { const o = document.createElement("option"); o.value = value; o.textContent = text; sel.appendChild(o); };
  opt("", "Add to: French (personal binder)");
  state.decks.forEach(d => opt(d.id, "Add to: " + d.name));
  opt("new", "+ New deck…");
  const want = state.trDeck || (stack && stack.custom ? stack.id : "");
  sel.value = state.decks.some(d => d.id === want) ? want : "";
}

// the card you'd add, and whether it's already there
function cardToAdd() {
  const front = $("tr-front").value.trim(), back = $("tr-back").value.trim();
  const key = front.toLowerCase();
  const have = front && state.cards.find(c => wordKey(c) === key || c.front.trim().toLowerCase() === key);
  const deck = state.decks.find(d => d.id === $("tr-deck").value);
  return { front, back, have, deck, inDeck: have && (deck ? deck.words.includes(wordKey(have)) : true) };
}
function updateAdd() {
  const c = cardToAdd(), btn = $("tr-add");
  btn.disabled = !c.front || !c.back || c.inDeck;
  btn.textContent = c.inDeck ? "✓ Already there" : c.have ? "+ Add to deck" : "+ Add card";
}

function addTranslated() {
  const c = cardToAdd(), r = trResult || {};
  if (!c.front || !c.back || c.inDeck) return;
  let card = c.have;
  if (!card) {
    // the word type, gender and example only fit if you didn't change the French
    const same = plainWord(c.front) === plainWord(r.front || "");
    card = { front: c.front, back: c.back, part_of_speech: same ? r.pos || "" : "", gender: same ? r.gender || "" : "",
             example_target: same ? r.exFr || "" : "", example_english: same ? r.exEn || "" : "", tags: "translator",
             interval: 1, ease: 2.5, due: today(), reviews: 0, correct: 0 };
    state.cards.push(card);
  }
  if (c.deck) {
    c.deck.words.push(wordKey(card));
    if (stack && stack.id === c.deck.id) stack.words.add(wordKey(card));
  }
  save();
  $("tr-note").textContent = "✓ Added “" + card.front + "” to " + (c.deck ? "“" + c.deck.name + "”" : "French's personal binder") + ".";
  updateAdd();
}

// ================= buttons and typing =================
$("tr-text").addEventListener("input", () => {
  clearTimeout(trTimer);
  const q = $("tr-text").value.trim();
  if (!q) { ++trRun; trResult = null; showTranslation(""); return; }
  trTimer = setTimeout(() => lookUp(q), 600);
});
$("tr-text").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {   // Enter looks it up at once (instead of a new line)
    e.preventDefault(); clearTimeout(trTimer);
    const q = $("tr-text").value.trim();
    if (q) lookUp(q);
  }
});
$("tr-swap").onclick = () => {
  state.trDir = trDirFr() ? "en" : "fr";
  save();
  // what's on the other side of the card becomes the new word to look up
  const r = trResult, q = r ? (trDirFr() ? r.front : r.back) : "";
  $("tr-text").value = q || "";
  ++trRun; trResult = null;
  renderTranslate();
  if (q) lookUp(q);
};
$("tr-front").addEventListener("input", updateAdd);
$("tr-back").addEventListener("input", updateAdd);
[$("tr-front"), $("tr-back")].forEach(el => el.addEventListener("keydown", e => { if (e.key === "Enter") addTranslated(); }));
$("tr-add").onclick = addTranslated;
$("tr-say").onclick = () => { const f = $("tr-front").value.trim(); if (f) speak(f); };
$("tr-deck").onchange = () => {
  const sel = $("tr-deck");
  if (sel.value === "new") {
    const name = (prompt("Name of the new deck:") || "").trim().slice(0, 60);
    if (name) {
      const d = { id: "deck-" + Date.now(), name, words: [], added: today() };
      state.decks.push(d);
      state.trDeck = d.id;
      save();
    }
    fillDecks();
  } else {
    state.trDeck = sel.value;
    save();
  }
  updateAdd();
};
