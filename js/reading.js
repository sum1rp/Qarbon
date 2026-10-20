// Qarbon · js/reading.js: the book library, book search, and the reading tracker.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= book library: ready-made books you can add with one tap =================
// Chapter lists are copied from the books themselves. Siddhartha: the contents page of Project Gutenberg
// ebook #2500 (public domain, free to read); year, work id and cover from Open Library.
const BOOK_LIBRARY = [
  { title: "Siddhartha", author: "Hermann Hesse",
    chapters: ["The Son of the Brahman", "With the Samanas", "Gotama", "Awakening",                 // First Part
               "Kamala", "With the Childlike People", "Sansara", "By the River", "The Ferryman",    // Second Part
               "The Son", "Om", "Govinda"],
    meta: { year: 1922, gutenberg: 2500, openLibrary: "/works/OL872932W", cover: 6562535, textId: "siddhartha",
            parts: "First Part: chapters 1–4 · Second Part: chapters 5–12" } }
];

// ================= book search (Open Library) =================
// Searches Open Library's free catalog. Picking a result fills in the add-book form (title, author) and
// keeps its year, cover and page count. It also looks through the book's editions for a table of contents,
// so the chapter names can fill in too. (Most books don't have one; then you type the number of chapters.)
const OL = "https://openlibrary.org";
const coverUrl = (id, size) => "https://covers.openlibrary.org/b/id/" + Number(id) + "-" + size + ".jpg";
let pendingMeta = null;   // details from the search result you picked, saved with the book when you press Save
let searchRun = 0, pickRun = 0;   // which search / pick is the newest (late answers to older ones are ignored)

// fetch with a time limit, so a slow server can't leave you waiting forever
function fetchWithin(url, seconds, options = {}) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), seconds * 1000);
  return fetch(url, { ...options, signal: stop.signal }).finally(() => clearTimeout(timer));
}

async function searchBooks() {
  const q = $("bs-q").value.trim(), run = ++searchRun, box = $("bs-results");
  box.innerHTML = "";
  if (q.length < 2) { $("bs-msg").textContent = "Type a title or author first."; return; }
  $("bs-msg").textContent = "Searching…";
  let docs;
  try {
    const res = await fetchWithin(OL + "/search.json?limit=8&fields=key,title,author_name,first_publish_year,cover_i," +
                                  "number_of_pages_median,id_project_gutenberg&q=" + encodeURIComponent(q), 15);
    if (!res.ok) throw new Error(res.status);
    docs = (await res.json()).docs || [];
  } catch (e) {
    if (run === searchRun) $("bs-msg").textContent = e.name === "AbortError"
      ? "Open Library is slow right now. Try again in a moment."
      : "Couldn't reach Open Library. Check your internet connection and try again.";
    return;
  }
  if (run !== searchRun) return;   // you've searched again since
  $("bs-msg").textContent = docs.length ? "Tap a book to add it:" : "No books found. Try other words, or add it by hand below.";
  docs.forEach(d => {
    const b = document.createElement("button"); b.className = "bsres";
    if (d.cover_i) {
      const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.src = coverUrl(d.cover_i, "S");
      img.onerror = () => { img.className = "nocover"; img.removeAttribute("src"); };
      b.appendChild(img);
    } else { const none = document.createElement("span"); none.className = "nocover"; b.appendChild(none); }
    const text = document.createElement("span");
    const t = document.createElement("b"); t.textContent = d.title || "Untitled";
    const by = document.createElement("small");
    by.textContent = [(d.author_name || []).slice(0, 2).join(", "), d.first_publish_year].filter(Boolean).join(" · ");
    text.append(t, by);
    b.appendChild(text);
    b.onclick = () => pickResult(d);
    box.appendChild(b);
  });
}

// fill in the add-book form from a search result, then look for chapter names
async function pickResult(d) {
  const run = ++pickRun;
  openBookForm(null);
  $("bf-title").value = d.title || "";
  $("bf-author").value = (d.author_name || []).slice(0, 2).join(", ");
  pendingMeta = cleanMeta({ year: d.first_publish_year, openLibrary: d.key, cover: d.cover_i,
                            pages: d.number_of_pages_median, gutenberg: (d.id_project_gutenberg || [])[0] });
  // a book that's also in Qarbon's own library already has its chapter list (and extra details like the parts)
  const lib = BOOK_LIBRARY.find(lb => lb.title.toLowerCase() === String(d.title || "").toLowerCase() &&
                                     (d.author_name || []).some(a => a.toLowerCase() === lb.author.toLowerCase()));
  if (lib) pendingMeta = cleanMeta({ ...lib.meta, ...pendingMeta });
  $("bf-msg").textContent = "Looking for a chapter list…";
  const chapters = lib ? lib.chapters.slice() : await findChapters(d.key);
  if (run !== pickRun || $("bookform").hidden || editingBook) return;   // you've moved on since
  if (chapters.length) {
    $("bf-chapters").value = chapters.join("\n");
    $("bf-count").value = chapters.length;
    $("bf-msg").textContent = "Found " + chapters.length + " chapters. Check them, then press Save.";
  } else {
    $("bf-msg").textContent = "Open Library has no chapter list for this book. Enter the number of chapters (or their names), then press Save.";
  }
}

// look through a book's editions for one with a table of contents of at least 3 entries
async function findChapters(workKey) {
  if (!/^\/works\/OL\d+W$/.test(workKey || "")) return [];
  try {
    const res = await fetchWithin(OL + workKey + "/editions.json?limit=50", 15);
    if (!res.ok) return [];
    for (const ed of (await res.json()).entries || []) {
      const toc = (ed.table_of_contents || [])
        .filter(t => t && (typeof t === "string" || !(t.level > 1)))   // skip sub-sections
        .map(t => String(typeof t === "string" ? t : t.title || t.label || "").trim())
        .filter(t => t && !/^(contents|table of contents|index|copyright|title page|dedication)$/i.test(t));
      if (toc.length >= 3) return toc.slice(0, 500);
    }
  } catch (e) {}
  return [];
}

$("bs-go").onclick = searchBooks;
$("bs-q").addEventListener("keydown", e => { if (e.key === "Enter") searchBooks(); });

// ================= Reading tracker =================
// Your books, each with a list of chapters and how many you've finished (book.done).
// Tap 📖 Read: ⏱ Focus opens, focus time counts toward the book, and after each focus session
// (or when you tap Done reading) it asks how far you got, which moves the progress bar.
let readSecs = 0;          // focus seconds spent on the current book since the last "How far did you get?"
let endAfterSave = false;  // true when you tapped Done reading (so saving ends the reading session)
let editingBook = null;    // the book open in the add/edit form (null = adding a new one)

const bookById = id => state.books.find(b => b.id === id);
// chapter i (counting from 0): its name if we know it, otherwise "Chapter 4"
const chapterName = (b, i) => b.chapters[i] || "Chapter " + (i + 1);
// finished = the total is known (not "more to come") and every chapter is done
const isFinished = b => !b.open && b.done >= b.chapters.length;
let askingBook = null;     // the book whose card is asking "you finished a chapter: what was it?"
const mins = m => m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";

// draw every book: still reading first, then the Finished shelf
function renderBooks() {
  const box = $("booklist");
  box.innerHTML = "";
  const reading = state.books.filter(b => !isFinished(b));
  const finished = state.books.filter(isFinished);
  if (!state.books.length) box.textContent = "No books yet. Tap + Add a book to start.";
  const shelf = (label, books) => {
    if (!books.length) return;
    const h = document.createElement("div"); h.className = "shelf"; h.textContent = label;
    box.appendChild(h);
    books.forEach(b => box.appendChild(bookCard(b)));
  };
  shelf("Reading", reading);
  shelf("Finished", finished);
  renderLibrary();
}

// the top of a book card: its cover (when we know it), title, and "by author · year · pages"
function bookHead(b, extra) {
  const head = document.createElement("div"); head.className = "bookhead";
  if (b.meta && b.meta.cover) {
    const img = document.createElement("img");
    img.className = "cover"; img.alt = ""; img.loading = "lazy";
    img.src = coverUrl(b.meta.cover, "M");
    img.onerror = () => img.remove();   // offline, or no cover: just leave it out
    head.appendChild(img);
  }
  const text = document.createElement("div");
  const title = document.createElement("div"); title.className = "title"; title.textContent = b.title;
  const by = document.createElement("div"); by.className = "by";
  by.textContent = [b.author && "by " + b.author, b.meta && b.meta.year, b.meta && b.meta.pages && b.meta.pages + " pages", extra]
    .filter(Boolean).join(" · ");
  text.append(title, by);
  head.appendChild(text);
  return head;
}

// library books you haven't added yet, each with a "+ Add" button
function renderLibrary() {
  const box = $("library");
  box.innerHTML = "";
  const have = b => state.books.some(x => x.title.toLowerCase() === b.title.toLowerCase());
  const left = BOOK_LIBRARY.filter(b => !have(b));
  if (!left.length) return;
  const h = document.createElement("div"); h.className = "shelf"; h.textContent = "From the library";
  box.appendChild(h);
  left.forEach(lb => {
    const card = document.createElement("div"); card.className = "book";
    const head = bookHead(lb, lb.chapters.length + " chapters");
    const btns = document.createElement("div"); btns.className = "bookbtns";
    const add = document.createElement("button"); add.className = "read"; add.textContent = "+ Add to my books";
    add.onclick = () => {
      state.books.push({ id: "book-" + Date.now(), title: lb.title, author: lb.author, chapters: lb.chapters.slice(), open: false,
                         done: 0, minutes: 0, sessions: 0, added: today(), finished: "", log: [], meta: { ...lb.meta } });
      save();
      renderBooks();
    };
    btns.appendChild(add);
    card.append(head, btns);
    box.appendChild(card);
  });
}

function bookCard(b) {
  const total = b.chapters.length, isDone = isFinished(b);
  const pct = b.open ? 0 : Math.round(100 * b.done / total);
  const card = document.createElement("div"); card.className = "book" + (isDone ? " finished" : "");
  const add = (cls, text, tag = "div") => { const el = document.createElement(tag); el.className = cls; el.textContent = text; card.appendChild(el); return el; };
  card.appendChild(bookHead(b));
  // the bar: filled by percent, or striped when the total isn't known yet
  const bar = add(b.open ? "bar open" : "bar", "");
  if (!b.open) { const fill = document.createElement("div"); fill.style.width = pct + "%"; bar.appendChild(fill); }
  add("", (isDone ? "Finished" + (b.finished ? " on " + b.finished : "")
          : b.open ? b.done + " chapter" + (b.done === 1 ? "" : "s") + " read · more to come"
          : b.done + " of " + total + " chapters done · " + pct + "%") +
          (b.minutes ? " · " + mins(b.minutes) + " read" : ""), "small");
  if (!isDone) add("", "Next: " + chapterName(b, b.done), "small");
  if (b.meta && b.meta.parts) add("", b.meta.parts, "small");
  if (b.meta && b.meta.gutenberg) {   // public-domain books: a link to read it free
    const link = add("", "Read it free on Project Gutenberg ↗", "a");
    link.href = "https://www.gutenberg.org/ebooks/" + b.meta.gutenberg;
    link.target = "_blank"; link.rel = "noopener";
  }
  const btns = add("bookbtns", "");
  const button = (text, title, fn, cls) => {
    const el = document.createElement("button"); el.textContent = text; el.title = title; el.setAttribute("aria-label", title);
    if (cls) el.className = cls;
    el.onclick = fn; btns.appendChild(el);
  };
  if (b.done > 0) button("−", "One chapter back", () => setChapters(b, b.done - 1));
  // +1 chapter: if we don't know the next chapter yet, ask its name (and whether it was the last) first
  if (!isDone) button("+1 chapter", "Finished a chapter", () => {
    if (b.open && b.done >= b.chapters.length) { askingBook = b.id; renderBooks(); }
    else setChapters(b, b.done + 1);
  });
  if (bookTextId(b)) button("📖 Open book", "Read it in Qarbon", () => openReader(b), "openbook");
  else if (pdfBooks.has(b.id)) button("📄 Open PDF", "Read the PDF in Qarbon", () => openReader(b), "openbook");
  if (!isDone) button("⏱ Read", "Start a reading session with the timer", () => startReading(b), "read");
  button("✎", "Edit book", () => openBookForm(b));
  if (askingBook === b.id) card.appendChild(chapterPrompt(b));
  return card;
}

// "You finished Chapter 4": name it (optional), and tick if it was the last one
function chapterPrompt(b) {
  const box = document.createElement("div"); box.className = "chapask";
  const q = document.createElement("b"); q.textContent = "You finished " + chapterName(b, b.done) + "!";
  const name = document.createElement("input"); name.placeholder = "Its name (optional)"; name.autocomplete = "off";
  const check = document.createElement("label"); check.className = "check";
  const final = document.createElement("input"); final.type = "checkbox";
  check.append(final, " That was the final chapter");
  const btns = document.createElement("div"); btns.className = "bookbtns";
  const saveBtn = document.createElement("button"); saveBtn.className = "read"; saveBtn.textContent = "Save";
  const cancel = document.createElement("button"); cancel.textContent = "Cancel";
  saveBtn.onclick = () => { askingBook = null; finishChapters(b, b.done + 1, name.value.trim(), final.checked); };
  cancel.onclick = () => { askingBook = null; renderBooks(); };
  btns.append(saveBtn, cancel);
  box.append(q, name, check, btns);
  setTimeout(() => name.focus(), 0);
  return box;
}

// move a book forward to "to" finished chapters. Chapters past the known list are added as you go:
// the last one gets the name you typed (if any), the others "Chapter N". final = it was the last chapter.
function finishChapters(b, to, lastName, final) {
  while (b.chapters.length < to) {
    const n = b.chapters.length + 1;
    b.chapters.push(n === to && lastName ? lastName : "Chapter " + n);
  }
  if (final) { b.open = false; b.chapters = b.chapters.slice(0, to); }   // now we know the total
  setChapters(b, to);
}

// change how many chapters are done (kept between 0 and the number of chapters)
function setChapters(b, n) {
  const was = isFinished(b);
  b.done = Math.min(b.chapters.length, Math.max(0, n));
  const now = isFinished(b);
  if (now && !was) b.finished = today();
  if (!now) b.finished = "";
  if (now && state.readingBook === b.id) state.readingBook = "";
  save();
  renderBooks();
}

// ----- add / edit a book -----
function openBookForm(b) {
  editingBook = b;
  $("bookform").hidden = false;
  $("addbook").hidden = true;
  $("bftitle").textContent = b ? "Edit book" : "Add a book";
  $("bf-title").value = b ? b.title : "";
  $("bf-author").value = b ? b.author : "";
  $("bf-count").value = b && b.chapters.length ? b.chapters.length : "";
  $("bf-open").checked = !!(b && b.open);
  $("readingmsg").textContent = "";
  // show the chapter names only if they aren't just "Chapter 1, Chapter 2…"
  const plain = b && b.chapters.every((c, i) => c === "Chapter " + (i + 1));
  $("bf-chapters").value = b && !plain ? b.chapters.join("\n") : "";
  $("bf-delete").hidden = !b;
  $("bf-pdf").value = "";
  $("bf-pdfremove").hidden = !(b && pdfBooks.has(b.id));
  $("bf-msg").textContent = "";
  $("bookform").scrollIntoView({ block: "start" });
}

function closeBookForm() {
  editingBook = null;
  pendingMeta = null;   // details from a search only belong to the book being added
  $("bookform").hidden = true;
  $("addbook").hidden = false;
}

$("bf-save").onclick = () => {
  const title = $("bf-title").value.trim();
  const names = $("bf-chapters").value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 500);
  const count = Math.round(Number($("bf-count").value));
  if (!title) { $("bf-msg").textContent = "The book needs a title."; return; }
  if (!names.length && $("bf-count").value.trim() && !(count >= 1 && count <= 500)) {
    $("bf-msg").textContent = "The number of chapters has to be from 1 to 500 (or leave it empty)."; return;
  }
  const chapters = names.length ? names : count >= 1 ? Array.from({ length: count }, (_, i) => "Chapter " + (i + 1)) : [];
  const open = $("bf-open").checked || !chapters.length;   // no chapters given: they'll be added as you finish them
  const pdf = $("bf-pdf").files && $("bf-pdf").files[0];
  if (pdf && !/pdf$/i.test(pdf.type || pdf.name)) { $("bf-msg").textContent = "That file isn't a PDF."; return; }
  const id = editingBook ? editingBook.id : "book-" + Date.now();
  if (editingBook) {
    Object.assign(editingBook, { title, author: $("bf-author").value.trim(), chapters, open });
    editingBook.done = Math.min(editingBook.done, chapters.length);   // fewer chapters now? keep progress in range
    editingBook.finished = isFinished(editingBook) ? editingBook.finished || today() : "";
  } else {
    state.books.push({ id, title, author: $("bf-author").value.trim(), chapters, done: 0, open,
                       minutes: 0, sessions: 0, added: today(), finished: "", log: [], meta: pendingMeta || {} });
    if (pendingMeta) {   // added from a search: clear the search away
      $("bs-q").value = ""; $("bs-msg").textContent = ""; $("bs-results").innerHTML = "";
    }
  }
  save();
  closeBookForm();
  renderBooks();
  if (!chapters.length)
    $("readingmsg").textContent = "Saved “" + title + "” without chapters, and that's fine. Each time you finish one, Qarbon asks its name and whether it was the last.";
  if (pdf) {   // keep the PDF on this device, then show "📄 Open PDF"
    putPdf(id, pdf).then(() => { pdfBooks.add(id); renderBooks(); $("readingmsg").textContent = "The PDF is ready: tap 📄 Open PDF."; })
                   .catch(() => { $("readingmsg").textContent = "Couldn't keep the PDF on this device (storage may be full or blocked)."; });
  }
};
$("bf-pdfremove").onclick = () => {
  const b = editingBook;
  delPdf(b.id).then(() => { pdfBooks.delete(b.id); $("bf-pdfremove").hidden = true; $("bf-msg").textContent = "PDF removed from this device."; }).catch(() => {});
};
$("bf-cancel").onclick = () => { closeBookForm(); renderBooks(); };
$("bf-delete").onclick = () => {
  const b = editingBook;
  if (!confirm("Delete “" + b.title + "” and its reading history?")) return;
  state.books = state.books.filter(x => x !== b);
  if (state.readingBook === b.id) state.readingBook = "";
  if (pdfBooks.has(b.id)) { delPdf(b.id).catch(() => {}); pdfBooks.delete(b.id); }
  save();
  closeBookForm();
  renderBooks();
  showReadbar();
};
$("addbook").onclick = () => openBookForm(null);


// ----- reading sessions on the Focus page -----
function startReading(b) {
  state.readingBook = b.id;
  readSecs = 0;
  save();
  setMode("focus");   // switch to ⏱ Focus, with the book attached
  showReadbar();
  timerNote("Reading “" + b.title + "”. Press Start when you're ready.");
}

// the "📖 Reading …" bar at the top of the Focus page
function showReadbar() {
  const b = bookById(state.readingBook);
  $("readbar").hidden = !b;
  if (!b) { $("readcheck").hidden = true; return; }
  $("readtitle").textContent = b.title;
  $("readwhere").textContent = "next: " + chapterName(b, b.done) + (b.open ? "" : " (" + (b.done + 1) + " of " + b.chapters.length + ")");
}

// "How far did you get?": a list starting at where you are now. ending = you tapped Done reading
function askChapter(ending) {
  const b = bookById(state.readingBook);
  if (!b) return;
  endAfterSave = ending;
  $("readq").textContent = "How far did you get in “" + b.title + "”?";
  // books with more chapters to come: offer up to 5 more than we know about
  const last = b.open ? Math.max(b.chapters.length, b.done) + 5 : b.chapters.length;
  const options = [[String(b.done), "Still on " + chapterName(b, b.done)]];
  for (let i = b.done + 1; i <= last; i++)
    options.push([String(i), "Finished " + chapterName(b, i - 1) + (!b.open && i === last ? " (the end!)" : "")]);
  setOptions($("readto"), options, String(b.done));
  $("readname").value = "";
  $("readfinal").checked = false;
  readExtras();
  $("readlater").textContent = ending ? "Cancel" : "Not now";
  $("readcheck").hidden = false;
}

// for books with more chapters to come: show "name it" (for a chapter we don't know yet) and "final chapter"
function readExtras() {
  const b = bookById(state.readingBook), to = Number($("readto").value);
  const show = !!b && b.open && to > b.done;
  $("readextras").hidden = !show;
  if (!show) return;
  const isNew = to > b.chapters.length;   // a chapter we don't have a name for yet
  $("readname").hidden = !isNew;
  $("readname").placeholder = "Name of " + chapterName(b, to - 1) + " (optional)";
}
$("readto").onchange = readExtras;
$("readdone").onclick = () => askChapter(true);
$("readlater").onclick = () => { $("readcheck").hidden = true; };
$("readsave").onclick = () => {
  const b = bookById(state.readingBook);
  if (!b) return;
  const from = b.done, to = Number($("readto").value), minutes = Math.round(readSecs / 60);
  b.minutes += minutes;
  b.sessions++;
  b.log.push({ date: today(), minutes, from, to });   // a diary of sessions, ready for stats later
  b.log = b.log.slice(-200);
  readSecs = 0;
  $("readcheck").hidden = true;
  const open = b.open && to > b.done;
  finishChapters(b, to, open ? $("readname").value.trim() : "", open && $("readfinal").checked);   // also marks it finished on the last chapter
  const finished = isFinished(b);
  if (endAfterSave || finished) state.readingBook = "";
  save();
  showReadbar();
  timerNote(finished ? "You finished “" + b.title + "”! 🎉"
    : to > from ? "Saved: " + (to - from) + " chapter" + (to - from === 1 ? "" : "s") + " further" + (minutes ? ", " + mins(minutes) + " of reading" : "") + "."
    : "Saved" + (minutes ? ": " + mins(minutes) + " of reading" : "") + ".");
};
showReadbar();
$("gohome").onclick = () => show("home");
$("logo").onclick = () => show("home");   // tapping the Qarbon logo also takes you back to the black hole

// ================= the in-app reader =================
// Two kinds: a book's built-in text (like Siddhartha), chapter by chapter, or a PDF you attached to a book.
// Where you stopped is kept in book.place (so it syncs). Reading time counts while the reader is open and
// you're actually reading (it pauses after 3 minutes without scrolling or tapping).
const BOOK_TEXT_FILES = { siddhartha: "js/books/siddhartha.js" };   // book texts that come with Qarbon
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";   // Mozilla's PDF viewer (loaded only when needed)
const VERSION = (BUILD.match(/build (\d+)/) || [])[1] || "1";
let reader = null;   // the open book: { b, kind: "text" | "pdf", text, ch, pdf, page, pages, zoom, from, minutes }
let rdSecs = 0, rdActive = 0, placeTimer = null;

// load a script file once (a book's text, or the PDF viewer); the promise finishes when it has run
const scriptLoads = {};
function loadScript(src) {
  if (!scriptLoads[src]) scriptLoads[src] = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = ok;
    s.onerror = () => { delete scriptLoads[src]; fail(new Error("couldn't load " + src)); };
    document.head.appendChild(s);
  });
  return scriptLoads[src];
}

// the built-in text a book has, if any (books added before texts existed are recognized by title and author)
function bookTextId(b) {
  if (b.meta && b.meta.textId && BOOK_TEXT_FILES[b.meta.textId]) return b.meta.textId;
  const lib = BOOK_LIBRARY.find(l => l.meta.textId && l.title.toLowerCase() === b.title.toLowerCase() &&
                                     (!b.author || b.author.toLowerCase() === l.author.toLowerCase()));
  return lib ? lib.meta.textId : "";
}

// ----- PDFs: kept in this browser's IndexedDB (a storage area for bigger files), never uploaded -----
function pdfStore(mode) {
  return new Promise((ok, fail) => {
    const r = indexedDB.open("qarbon-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("pdfs");
    r.onerror = () => fail(r.error);
    r.onsuccess = () => ok(r.result.transaction("pdfs", mode).objectStore("pdfs"));
  });
}
const idb = (mode, fn) => pdfStore(mode).then(st => new Promise((ok, fail) => {
  const r = fn(st); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
}));
// the PDF is stored as its raw bytes (an ArrayBuffer): some Safari versions can't store a File object itself
const putPdf = async (id, file) => { const data = await file.arrayBuffer(); return idb("readwrite", st => st.put({ name: file.name, data }, id)); };
const getPdf = id => idb("readonly", st => st.get(id));
const delPdf = id => idb("readwrite", st => st.delete(id));
let pdfBooks = new Set();   // ids of books that have a PDF on this device
try {
  idb("readonly", st => st.getAllKeys()).then(keys => { pdfBooks = new Set(keys); if (!$("reading").hidden) renderBooks(); }).catch(() => {});
} catch (e) {}

// ----- opening and closing -----
async function openReader(b) {
  closeBookForm();
  askingBook = null;
  const textId = bookTextId(b);
  reader = { b, kind: textId ? "text" : "pdf", from: b.done, minutes: 0, zoom: 1 };
  rdSecs = 0; rdActive = Date.now();
  $("reading").classList.add("rd-open");
  $("readerview").hidden = false;
  $("rd-text").hidden = !textId;
  $("rd-pdf").hidden = !!textId;
  $("rd-text").innerHTML = "";
  $("rd-msg").textContent = "Opening…";
  $("rd-text").style.setProperty("--rd-size", state.readerSize + "px");
  scrollTo(0, 0);
  const mine = reader;
  try {
    if (textId) {
      await loadScript(BOOK_TEXT_FILES[textId] + "?v=" + VERSION);
      if (reader !== mine) return;   // closed while loading
      reader.text = BOOK_TEXTS[textId];
      const p = b.place || {};
      const last = reader.text.chapters.length - 1;
      showChapter(Number.isInteger(p.ch) ? Math.min(p.ch, last) : Math.min(b.done, last), p.y || 0);
    } else {
      await openPdf(b);
    }
    if (reader === mine) $("rd-msg").textContent = "";
  } catch (e) {
    if (reader === mine) $("rd-msg").textContent = textId ? "Couldn't load the book's text." : e.message;
  }
}

function closeReader() {
  if (!reader) return;
  rememberPlace(true);
  commitReadingTime(true);
  if (reader.task) reader.task.cancel();
  reader = null;
  $("readerview").hidden = true;
  $("reading").classList.remove("rd-open");
  if (mode === "reading") renderBooks();
}

// ----- the built-in text, one chapter at a time -----
const readerTop = () => $("rd-text").getBoundingClientRect().top + scrollY - 80;
const readerSpan = () => Math.max(1, $("rd-text").offsetHeight - innerHeight * .6);
const readFraction = () => Math.min(1, Math.max(0, (scrollY - readerTop()) / readerSpan()));

function showChapter(i, y = 0) {
  const t = reader.text, c = t.chapters[i], box = $("rd-text");
  reader.ch = i;
  box.innerHTML = "";
  const add = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; el.textContent = text; box.appendChild(el); };
  if (c.part) add("p", "rd-part", c.part);
  if (c.dedication) add("p", "rd-ded", c.dedication);
  add("h2", "", c.title);
  c.paragraphs.forEach(p => add("p", "", p));
  if (i === t.chapters.length - 1 && t.note) add("p", "rd-note", t.note);
  $("rd-where").textContent = "Chapter " + (i + 1) + " of " + t.chapters.length;
  $("rd-prev").disabled = i === 0; $("rd-prev").setAttribute("aria-label", "Previous chapter");
  $("rd-next").disabled = i === t.chapters.length - 1; $("rd-next").setAttribute("aria-label", "Next chapter");
  updateFinish();
  requestAnimationFrame(() => { scrollTo(0, y ? readerTop() + y * readerSpan() : 0); updateProgress(); });
  rememberPlace();
}

// the thin bar under the top: how far through the chapter (or the PDF) you are
function updateProgress() {
  if (!reader) return;
  const f = reader.kind === "text" ? readFraction() : reader.page / reader.pages;
  $("rd-progress").firstElementChild.style.width = Math.round(100 * f) + "%";
}

// "Finish chapter ✓": what it says depends on where you are
function updateFinish() {
  const b = reader.b, btn = $("rd-finish");
  const ch = reader.kind === "text" ? reader.ch : b.done;
  if (isFinished(b)) { btn.textContent = "✓ Book finished"; btn.disabled = true; return; }
  if (ch < b.done) { btn.textContent = "✓ Chapter finished"; btn.disabled = true; return; }
  btn.disabled = false;
  btn.textContent = reader.kind === "text" ? "Finish chapter ✓" : "Finish " + chapterName(b, b.done) + " ✓";
}

$("rd-finish").onclick = () => {
  const b = reader.b;
  const to = reader.kind === "text" ? Math.max(b.done, reader.ch + 1) : b.done + 1;
  const name = chapterName(b, to - 1);
  commitReadingTime(false);
  finishChapters(b, to, "", false);   // moves the progress bar (and saves)
  if (isFinished(b)) { $("rd-msg").textContent = "You finished “" + b.title + "”! 🎉"; updateFinish(); return; }
  $("rd-msg").textContent = "✓ " + name + " finished.";
  if (reader.kind === "text" && reader.ch < reader.text.chapters.length - 1) showChapter(reader.ch + 1);
  else updateFinish();
};

// ----- PDFs, one page at a time -----
async function openPdf(b) {
  let file;
  try { file = await getPdf(b.id); } catch (e) { file = null; }
  if (!file) throw new Error("This book's PDF isn't on this device. Add it with ✎ → PDF of this book.");
  try {
    await loadScript(PDFJS + "pdf.min.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
  } catch (e) { throw new Error("The PDF viewer needs the internet the first time. Connect and try again."); }
  reader.pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.data) }).promise;
  reader.pages = reader.pdf.numPages;
  const p = b.place || {};
  await showPage(Math.min(reader.pages, Math.max(1, p.page || 1)));
}

async function showPage(n) {
  reader.page = n;
  $("rd-where").textContent = "Page " + n + " of " + reader.pages;
  $("rd-prev").disabled = n <= 1; $("rd-prev").setAttribute("aria-label", "Previous page");
  $("rd-next").disabled = n >= reader.pages; $("rd-next").setAttribute("aria-label", "Next page");
  updateFinish(); updateProgress(); rememberPlace();
  const page = await reader.pdf.getPage(n);
  const box = $("rd-pdf"), canvas = $("rd-canvas");
  const fit = (box.clientWidth - 2) / page.getViewport({ scale: 1 }).width;   // fit the page to the screen's width
  const view = page.getViewport({ scale: fit * reader.zoom }), dpr = Math.min(devicePixelRatio || 1, 2);   // sharp on phones
  if (reader.task) reader.task.cancel();   // a page still being drawn gets cancelled
  canvas.width = Math.floor(view.width * dpr); canvas.height = Math.floor(view.height * dpr);
  canvas.style.width = Math.floor(view.width) + "px"; canvas.style.height = Math.floor(view.height) + "px";
  reader.task = page.render({ canvasContext: canvas.getContext("2d"), viewport: view, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
  try { await reader.task.promise; } catch (e) { if (!e || e.name !== "RenderingCancelledException") throw e; }
}

// ----- buttons -----
$("rd-close").onclick = closeReader;
$("rd-prev").onclick = () => { if (reader.kind === "text") showChapter(reader.ch - 1); else showPage(reader.page - 1); };
$("rd-next").onclick = () => { if (reader.kind === "text") showChapter(reader.ch + 1); else showPage(reader.page + 1); };
// A− / A+: the text size for books, the zoom for PDFs
function resize(step) {
  if (reader.kind === "text") {
    const keep = readFraction();
    state.readerSize = Math.min(28, Math.max(14, state.readerSize + step * 2));
    $("rd-text").style.setProperty("--rd-size", state.readerSize + "px");
    save();
    scrollTo(0, readerTop() + keep * readerSpan());
  } else {
    reader.zoom = Math.min(3, Math.max(1, reader.zoom + step * .25));
    showPage(reader.page);
  }
}
$("rd-smaller").onclick = () => resize(-1);
$("rd-bigger").onclick = () => resize(1);
// on a computer: ← and → turn chapters or pages
document.addEventListener("keydown", e => {
  if (!reader || $("reading").hidden || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (e.key === "ArrowRight" && !$("rd-next").disabled) $("rd-next").click();
  if (e.key === "ArrowLeft" && !$("rd-prev").disabled) $("rd-prev").click();
});

// ----- remembering your place, and counting reading time -----
// saved a moment after you stop scrolling (saving on every tiny scroll would be wasteful)
function rememberPlace(now) {
  if (!reader) return;
  clearTimeout(placeTimer);
  const store = () => {
    if (!reader) return;
    const b = reader.b;
    b.place = reader.kind === "text" ? { ch: reader.ch, y: Math.round(readFraction() * 1000) / 1000 } : { page: reader.page };
    save();
  };
  if (now) store(); else placeTimer = setTimeout(store, 1500);
}
const activity = () => { rdActive = Date.now(); };
addEventListener("scroll", () => { if (reader && !$("reading").hidden) { activity(); updateProgress(); if (reader.kind === "text") rememberPlace(); } }, { passive: true });
["pointerdown", "keydown", "touchmove", "wheel"].forEach(t => $("readerview").addEventListener(t, activity, { passive: true }));
// every 5 seconds: if the reader is showing and you've been active in the last 3 minutes, count it
setInterval(() => {
  if (reader && !$("reading").hidden && !$("study").hidden && !document.hidden && Date.now() - rdActive < 180000) rdSecs += 5;
}, 5000);
// add the whole minutes read to the book; ending = you closed the reader (that counts as one reading session)
function commitReadingTime(ending) {
  const b = reader.b, m = Math.floor(rdSecs / 60);
  if (m > 0) { b.minutes += m; rdSecs -= m * 60; reader.minutes += m; }
  if (ending && (reader.minutes > 0 || b.done > reader.from)) {
    b.sessions++;
    b.log.push({ date: today(), minutes: reader.minutes, from: reader.from, to: b.done });
    b.log = b.log.slice(-200);
  }
  save();
}
