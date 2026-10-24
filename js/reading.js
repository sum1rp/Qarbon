// Qarbon · js/reading.js: the book library, book search, and the reading tracker.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= book library: ready-made books you can read inside Qarbon =================
// Every book here has its full text in js/books/<textId>.js (loaded only when you open it).
// Chapter lists are copied from the books themselves (Siddhartha: the contents page of Project Gutenberg
// ebook #2500); year, work id, cover and page count from Open Library. All are public domain in the US.
const BOOK_LIBRARY = [
  { title: "Siddhartha", author: "Hermann Hesse",
    chapters: ["The Son of the Brahman", "With the Samanas", "Gotama", "Awakening",                 // First Part
               "Kamala", "With the Childlike People", "Sansara", "By the River", "The Ferryman",    // Second Part
               "The Son", "Om", "Govinda"],
    meta: { year: 1922, gutenberg: 2500, openLibrary: "/works/OL872932W", cover: 6562535, textId: "siddhartha",
            parts: "First Part: chapters 1–4 · Second Part: chapters 5–12" } },
  // the "Read in Qarbon" shelf (build 53): short, philosophical public-domain novels, texts from Project Gutenberg
  { title: "Demian", author: "Hermann Hesse",
    chapters: ["Two Worlds", "Cain", "The Thief on the Cross", "Beatrice", "The Bird Fights Its Way Out of the Egg", "Jacob Wrestles with God", "Mother Eve", "Beginning of the End"],
    meta: { year: 1919, gutenberg: 74222, openLibrary: "/works/OL30457295W", cover: 12569297, pages: 184, textId: "demian" } },
  { title: "Steppenwolf", author: "Hermann Hesse",
    chapters: ["Preface", "For Madmen Only", "Treatise on the Steppenwolf", "The Black Eagle", "Hermine", "Pablo", "Maria", "The Fancy Dress Ball", "The Magic Theatre", "Harry’s Execution"],
    meta: { year: 1927, gutenberg: 75756, openLibrary: "/works/OL872773W", cover: 14911616, pages: 224, textId: "steppenwolf" } },
  { title: "The Metamorphosis", author: "Franz Kafka",
    chapters: ["Part I", "Part II", "Part III"],
    meta: { year: 1915, gutenberg: 5200, openLibrary: "/works/OL498556W", cover: 12820198, pages: 88, textId: "metamorphosis" } },
  { title: "Notes from Underground", author: "Fyodor Dostoevsky",
    chapters: ["Underground 1", "Underground 2", "Underground 3", "Underground 4", "Underground 5", "Underground 6", "Underground 7", "Underground 8", "Underground 9", "Underground 10", "Underground 11", "Apropos of the Wet Snow 1", "Apropos of the Wet Snow 2", "Apropos of the Wet Snow 3", "Apropos of the Wet Snow 4", "Apropos of the Wet Snow 5", "Apropos of the Wet Snow 6", "Apropos of the Wet Snow 7", "Apropos of the Wet Snow 8", "Apropos of the Wet Snow 9", "Apropos of the Wet Snow 10"],
    meta: { year: 1864, gutenberg: 600, openLibrary: "/works/OL21025633W", cover: 10445973, pages: 132, textId: "underground",
            parts: "Part I: Underground, chapters 1–11 · Part II: Apropos of the Wet Snow, chapters 12–21" } },
  { title: "Candide", author: "Voltaire",
    chapters: ["How Candide Was Brought Up in a Magnificent Castle, and How He Was Expelled Thence", "What Became of Candide Among the Bulgarians", "How Candide Made His Escape from the Bulgarians, and What Afterwards Became of Him", "How Candide Found His Old Master Pangloss, and What Happened to Them", "Tempest, Shipwreck, Earthquake, and What Became of Doctor Pangloss, Candide, and James the Anabaptist", "How the Portuguese Made a Beautiful Auto-da-fé, to Prevent Any Further Earthquakes; and How Candide Was Publicly Whipped", "How the Old Woman Took Care of Candide, and How He Found the Object He Loved", "The History of Cunegonde", "What Became of Cunegonde, Candide, the Grand Inquisitor, and the Jew", "In What Distress Candide, Cunegonde, and the Old Woman Arrived at Cadiz; and of Their Embarkation", "History of the Old Woman", "The Adventures of the Old Woman Continued", "How Candide Was Forced Away from His Fair Cunegonde and the Old Woman", "How Candide and Cacambo Were Received by the Jesuits of Paraguay", "How Candide Killed the Brother of His Dear Cunegonde", "Adventures of the Two Travellers, with Two Girls, Two Monkeys, and the Savages Called Oreillons", "Arrival of Candide and His Valet at El Dorado, and What They Saw There", "What They Saw in the Country of El Dorado", "What Happened to Them at Surinam, and How Candide Got Acquainted with Martin", "What Happened at Sea to Candide and Martin", "Candide and Martin, Reasoning, Draw Near the Coast of France", "What Happened in France to Candide and Martin", "Candide and Martin Touched upon the Coast of England, and What They Saw There", "Of Paquette and Friar Giroflée", "The Visit to Lord Pococurante, a Noble Venetian", "Of a Supper Which Candide and Martin Took with Six Strangers, and Who They Were", "Candide’s Voyage to Constantinople", "What Happened to Candide, Cunegonde, Pangloss, Martin, etc.", "How Candide Found Cunegonde and the Old Woman Again", "The Conclusion"],
    meta: { year: 1759, gutenberg: 19942, openLibrary: "/works/OL100672W", cover: 14923781, pages: 152, textId: "candide" } },
  { title: "The Prophet", author: "Kahlil Gibran",
    chapters: ["The Coming of the Ship", "On Love", "On Marriage", "On Children", "On Giving", "On Eating and Drinking", "On Work", "On Joy and Sorrow", "On Houses", "On Clothes", "On Buying and Selling", "On Crime and Punishment", "On Laws", "On Freedom", "On Reason and Passion", "On Pain", "On Self-Knowledge", "On Teaching", "On Friendship", "On Talking", "On Time", "On Good and Evil", "On Prayer", "On Pleasure", "On Beauty", "On Religion", "On Death", "The Farewell"],
    meta: { year: 1923, gutenberg: 58585, openLibrary: "/works/OL318900W", cover: 418324, pages: 112, textId: "prophet" } },
  { title: "Flatland", author: "Edwin A. Abbott",
    chapters: ["Of the Nature of Flatland", "Of the Climate and Houses in Flatland", "Concerning the Inhabitants of Flatland", "Concerning the Women", "Of our Methods of Recognizing one another", "Of Recognition by Sight", "Concerning Irregular Figures", "Of the Ancient Practice of Painting", "Of the Universal Colour Bill", "Of the Suppression of the Chromatic Sedition", "Concerning our Priests", "Of the Doctrine of our Priests", "How I had a Vision of Lineland", "How I vainly tried to explain the nature of Flatland", "Concerning a Stranger from Spaceland", "How the Stranger vainly endeavoured to reveal to me in words the", "How the Sphere, having in vain tried words, resorted to deeds", "How I came to Spaceland, and what I saw there", "How, though the Sphere shewed me other mysteries of Spaceland, I", "How the Sphere encouraged me in a Vision.", "How I tried to teach the Theory of Three Dimensions to my", "How I then tried to diffuse the Theory of Three Dimensions by"],
    meta: { year: 1884, gutenberg: 97, openLibrary: "/works/OL118388W", cover: 10069547, pages: 110, textId: "flatland",
            parts: "Part I: This World, chapters 1–12 · Part II: Other Worlds, chapters 13–22" } },
  { title: "Heart of Darkness", author: "Joseph Conrad",
    chapters: ["Part I", "Part II", "Part III"],
    meta: { year: 1899, gutenberg: 219, openLibrary: "/works/OL38663W", cover: 12307847, pages: 136, textId: "heartofdarkness" } },
  { title: "Bartleby, the Scrivener", author: "Herman Melville",
    chapters: ["Part One", "Part Two", "Part Three", "Part Four"],
    meta: { year: 1853, gutenberg: 11231, openLibrary: "/works/OL102732W", cover: 10521439, pages: 70, textId: "bartleby" } },
  { title: "Strange Case of Dr Jekyll and Mr Hyde", author: "Robert Louis Stevenson",
    chapters: ["Story of the Door", "Search for Mr. Hyde", "Dr. Jekyll Was Quite at Ease", "The Carew Murder Case", "Incident of the Letter", "Incident of Dr. Lanyon", "Incident at the Window", "The Last Night", "Dr. Lanyon’s Narrative", "Henry Jekyll’s Full Statement of the Case"],
    meta: { year: 1886, gutenberg: 43, openLibrary: "/works/OL24156W", cover: 295773, pages: 131, textId: "jekyll" } },
  { title: "The Time Machine", author: "H. G. Wells",
    chapters: ["Introduction", "The Machine", "The Time Traveller Returns", "Time Travelling", "In the Golden Age", "The Sunset of Mankind", "A Sudden Shock", "Explanation", "The Morlocks", "When Night Came", "The Palace of Green Porcelain", "In the Darkness", "The Trap of the White Sphinx", "The Further Vision", "The Time Traveller’s Return", "After the Story", "Epilogue"],
    meta: { year: 1895, gutenberg: 35, openLibrary: "/works/OL52267W", cover: 9009316, pages: 120, textId: "timemachine" } },
  { title: "The Sorrows of Young Werther", author: "Johann Wolfgang von Goethe",
    chapters: ["May", "June", "July", "August", "September", "October to March", "April to August", "September and October", "November and December", "The Editor to the Reader"],
    meta: { year: 1774, gutenberg: 2527, openLibrary: "/works/OL52556W", cover: 11316960, pages: 177, textId: "werther",
            parts: "Book One: chapters 1–5 · Book Two: chapters 6–10 (letters, grouped by month)" } }
];

// ================= book search (Open Library + Google Books) =================
// Searches two free catalogs at once, with no account or key: Open Library (openlibrary.org) and Google Books.
// Results come while you type (after a short pause, once there are 3+ letters); a late answer to an older
// search is ignored. The same book from both catalogs shows once. Books you can read inside Qarbon come
// first. 20 results at a time: scrolling to the end of the list loads 20 more.
// Picking a result fills in the add-book form (title, author) and keeps its year, cover and page count.
// It also looks through the book's editions for a table of contents, so the chapter names can fill in too.
const OL = "https://openlibrary.org";
const GB = "https://www.googleapis.com/books/v1/volumes";
const coverUrl = (id, size) => "https://covers.openlibrary.org/b/id/" + Number(id) + "-" + size + ".jpg";
const PAGE = 20;           // results asked from each catalog at a time
let pendingMeta = null;    // details from the search result you picked, saved with the book when you press Save
let searchRun = 0, pickRun = 0;   // which search / pick is the newest (late answers to older ones are ignored)
let search = null;         // the search on screen: { q, run, olPage, gbStart, olDone, gbDone, loading, found: Map }
let typingTimer = null;

// fetch with a time limit, so a slow server can't leave you waiting forever
function fetchWithin(url, seconds, options = {}) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), seconds * 1000);
  return fetch(url, { ...options, signal: stop.signal }).finally(() => clearTimeout(timer));
}

// two results are the same book when their titles (without "The", accents or a subtitle) and the author's last name match
const plainText = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[:(]/)[0].replace(/^(the|a|an) /, "").replace(/[^a-z0-9]+/g, " ").trim();
const sameBookKey = (title, authors) => plainText(title) + "|" + plainText(((authors || [])[0] || "").split(" ").pop());
// the library book (readable in Qarbon) that a result is, if any: same Open Library work (which also catches
// titles in the original language, like "Der Steppenwolf"), or the same title and author
const libraryMatch = r => BOOK_LIBRARY.find(lb => (r.olKey && r.olKey === lb.meta.openLibrary) || sameBookKey(lb.title, [lb.author]) === r.key);

// a Google Books cover: only their own image addresses, always https
const googleCover = u => /^https?:\/\/books\.google(usercontent)?\.com\//.test(u || "") ? u.replace(/^http:/, "https:") : "";

// one page of Open Library results, as plain result objects
async function olResults(q, page) {
  const res = await fetchWithin(OL + "/search.json?limit=" + PAGE + "&page=" + page + "&fields=key,title,author_name," +
    "first_publish_year,cover_i,number_of_pages_median,id_project_gutenberg&q=" + encodeURIComponent(q), 15);
  if (!res.ok) throw new Error(res.status);
  return ((await res.json()).docs || []).map(d => ({
    title: d.title || "Untitled", authors: (d.author_name || []).slice(0, 2), year: d.first_publish_year,
    cover: d.cover_i, pages: d.number_of_pages_median, olKey: d.key, gutenberg: (d.id_project_gutenberg || [])[0], from: ["Open Library"] }));
}

// one page of Google Books results (Google allows a little use without a key; when it says "too many", we skip it)
async function gbResults(q, start) {
  const res = await fetchWithin(GB + "?printType=books&maxResults=" + PAGE + "&startIndex=" + start +
    "&fields=items(volumeInfo(title,authors,publishedDate,pageCount,imageLinks/thumbnail))&q=" + encodeURIComponent(q), 15);
  if (!res.ok) throw new Error(res.status);
  return ((await res.json()).items || []).map(it => it.volumeInfo || {}).filter(v => v.title).map(v => ({
    title: v.title, authors: (v.authors || []).slice(0, 2), year: parseInt(v.publishedDate) || undefined,
    coverUrl: googleCover(v.imageLinks && v.imageLinks.thumbnail), pages: v.pageCount, from: ["Google Books"] }));
}

// add results to the search, folding the same book from both catalogs into one (keeping the best details of each)
function addResults(list) {
  list.forEach(r => {
    r.key = sameBookKey(r.title, r.authors);
    const had = search.found.get(r.key);
    if (!had) { search.found.set(r.key, r); return; }
    for (const f of ["year", "cover", "coverUrl", "pages", "olKey", "gutenberg"]) if (!had[f] && r[f]) had[f] = r[f];
    if (r.year && had.year && r.year < had.year) had.year = r.year;   // the first edition's year
    r.from.forEach(f => { if (!had.from.includes(f)) had.from.push(f); });
  });
}

// typing: wait for a short pause, then search
function searchTyped() {
  clearTimeout(typingTimer);
  const q = $("bs-q").value.trim();
  if (q.length < 3) { ++searchRun; search = null; showResults(); $("bs-msg").textContent = q ? "Keep typing…" : ""; return; }
  typingTimer = setTimeout(() => startSearch(q), 450);
}

function startSearch(q) {
  clearTimeout(typingTimer);
  if (search && search.q === q) return;   // already showing this one
  search = { q, run: ++searchRun, olPage: 1, gbStart: 0, olDone: false, gbDone: false, loading: false, found: new Map() };
  showResults();
  loadMore();
}

// ask both catalogs for their next 20 (at the same time); a catalog that fails or runs out is left out after that
async function loadMore() {
  const s = search;
  if (!s || s.loading || (s.olDone && s.gbDone)) return;
  if (!navigator.onLine) { s.olDone = s.gbDone = true; s.offline = true; showResults(); return; }
  s.loading = true; showResults();
  const [ol, gb] = await Promise.allSettled([
    s.olDone ? Promise.resolve([]) : olResults(s.q, s.olPage),
    s.gbDone ? Promise.resolve([]) : gbResults(s.q, s.gbStart)]);
  if (s.run !== searchRun) return;   // you've searched for something else since
  s.loading = false;
  const olList = ol.status === "fulfilled" ? ol.value : [], gbList = gb.status === "fulfilled" ? gb.value : [];
  if (ol.status === "rejected") { s.olDone = true; s.olFailed = true; }
  if (gb.status === "rejected") { s.gbDone = true; s.gbFailed = true; }
  if (!s.olDone) { s.olPage++; if (olList.length < PAGE) s.olDone = true; }
  if (!s.gbDone) { s.gbStart += PAGE; if (gbList.length < PAGE) s.gbDone = true; }
  // take turns (Open Library's 1st, Google's 1st, …), so the best matches of both come first
  const mixed = [];
  for (let n = 0; n < Math.max(olList.length, gbList.length); n++) { if (olList[n]) mixed.push(olList[n]); if (gbList[n]) mixed.push(gbList[n]); }
  addResults(mixed);
  showResults();
}

// draw the results: "Read in Qarbon" (library books matching what you typed, or found by the catalogs) then "More books"
function showResults() {
  const box = $("bs-results"), msg = $("bs-msg"), more = $("bs-more");
  box.innerHTML = "";
  more.hidden = true;
  if (!search) return;
  const words = plainText(search.q).split(" ").filter(Boolean);
  const readable = BOOK_LIBRARY.filter(lb => { const t = plainText(lb.title + " " + lb.author); return words.every(w => t.includes(w)); });
  const others = [];
  for (const r of search.found.values()) {
    const lb = libraryMatch(r);
    if (lb) { if (!readable.includes(lb)) readable.push(lb); } else others.push(r);
  }
  const section = (label, rows) => {
    if (!rows.length) return;
    const h = document.createElement("div"); h.className = "shelf"; h.textContent = label;
    box.appendChild(h);
    rows.forEach(row => box.appendChild(row));
  };
  section("Read in Qarbon", readable.map(lb => resultRow({ title: lb.title, authors: [lb.author], year: lb.meta.year, cover: lb.meta.cover },
                                                          () => readLibraryBook(lb), true)));
  section(readable.length ? "More books" : "Books", others.map(r => resultRow(r, () => pickResult(r))));
  const s = search, none = !readable.length && !others.length;
  msg.textContent = s.offline ? "You're offline. Books you can read in Qarbon still show; connect to search everything."
    : s.loading && none ? "Searching…"
    : s.olFailed && s.gbFailed && none ? "Couldn't reach the book catalogs. Check your internet connection and try again."
    : none && s.olDone && s.gbDone ? "No books found. Try other words, or add it by hand below."
    : "Tap a book to " + (others.length ? "add it" : "read it") + ":";
  // the "more" row at the end: scrolling it into view loads the next 20 (you can tap it too)
  if (!(s.olDone && s.gbDone) || s.loading) {
    more.hidden = false;
    more.textContent = s.loading ? "Loading…" : "More results";
    more.disabled = s.loading;
  }
}

// one result: cover, title, "author · year", and a badge when you can read it here
function resultRow(r, onPick, readable) {
  const b = document.createElement("button"); b.className = "bsres";
  const src = r.cover ? coverUrl(r.cover, "S") : r.coverUrl;
  if (src) {
    const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.src = src;
    img.onerror = () => { img.className = "nocover"; img.removeAttribute("src"); };
    b.appendChild(img);
  } else { const none = document.createElement("span"); none.className = "nocover"; b.appendChild(none); }
  const text = document.createElement("span");
  const t = document.createElement("b"); t.textContent = r.title;
  const by = document.createElement("small");
  by.textContent = [r.authors.join(", "), r.year].filter(Boolean).join(" · ");
  text.append(t, by);
  if (readable) { const badge = document.createElement("span"); badge.className = "badge"; badge.textContent = "📖 Read in Qarbon"; text.appendChild(badge); }
  else if (r.from) { const f = document.createElement("small"); f.className = "src"; f.textContent = r.from.join(" + "); text.appendChild(f); }
  b.appendChild(text);
  b.onclick = onPick;
  return b;
}

function clearSearch() {
  clearTimeout(typingTimer); ++searchRun; search = null;
  $("bs-q").value = ""; $("bs-msg").textContent = ""; showResults();
}

// fill in the add-book form from a search result, then look for chapter names
async function pickResult(r) {
  const run = ++pickRun;
  openBookForm(null);
  $("bf-title").value = r.title;
  $("bf-author").value = r.authors.join(", ");
  pendingMeta = cleanMeta({ year: r.year, openLibrary: r.olKey, cover: r.cover, coverUrl: r.coverUrl, pages: r.pages, gutenberg: r.gutenberg });
  $("bf-msg").textContent = "Looking for a chapter list…";
  const chapters = await findChapters(r.olKey);
  if (run !== pickRun || $("bookform").hidden || editingBook) return;   // you've moved on since
  if (chapters.length) {
    $("bf-chapters").value = chapters.join("\n");
    $("bf-count").value = chapters.length;
    $("bf-msg").textContent = "Found " + chapters.length + " chapters. Check them, then press Save.";
  } else {
    $("bf-msg").textContent = "No chapter list found for this book. Enter the number of chapters (or their names), then press Save.";
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

$("bs-q").addEventListener("input", searchTyped);
$("bs-q").addEventListener("keydown", e => {
  if (e.key === "Enter") { const q = $("bs-q").value.trim(); if (q.length >= 2) startSearch(q); }
});
$("bs-more").onclick = loadMore;
// scrolling the "More results" row into view loads the next 20 (an IntersectionObserver watches when it shows up)
if ("IntersectionObserver" in window)
  new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadMore(); }, { rootMargin: "300px" }).observe($("bs-more"));

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
  if (b.meta && (b.meta.cover || b.meta.coverUrl)) {
    const img = document.createElement("img");
    img.className = "cover"; img.alt = ""; img.loading = "lazy";
    img.src = b.meta.cover ? coverUrl(b.meta.cover, "M") : b.meta.coverUrl;
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

// ================= the "Read in Qarbon" shelf =================
// Every library book as a cover in a grid (3 across). Tapping one adds it to your books (if it isn't there
// yet) and opens it in the reader. The first 6 show; "Show all" opens the rest.
let shelfAll = false;   // true after you tap "Show all"

// the book in your list that is this library book (same id on every device, or the same title)
const libraryBookOf = lb => state.books.find(x => x.id === "lib-" + lb.meta.textId || x.title.toLowerCase() === lb.title.toLowerCase());

function addLibraryBook(lb) {
  let b = libraryBookOf(lb);
  if (b) return b;
  // library books get the same id on every device (like "lib-siddhartha"), so syncing sees they're one book
  b = { id: "lib-" + lb.meta.textId, title: lb.title, author: lb.author, chapters: lb.chapters.slice(), open: false,
        done: 0, minutes: 0, sessions: 0, added: today(), finished: "", log: [], meta: { ...lb.meta } };
  state.books.push(b);
  save();
  return b;
}
const readLibraryBook = lb => openReader(addLibraryBook(lb));

// a cover button: the photo from Open Library on top of a plain title card (which shows when you're offline)
function shelfCover(lb) {
  const btn = document.createElement("button"); btn.className = "shelfbook";
  btn.setAttribute("aria-label", "Read " + lb.title + " by " + lb.author);
  const cv = document.createElement("span"); cv.className = "cv";
  const plain = document.createElement("span"); plain.className = "plain"; plain.textContent = lb.title;
  cv.appendChild(plain);
  const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.src = coverUrl(lb.meta.cover, "M");
  img.onerror = () => img.remove();
  cv.appendChild(img);
  const t = document.createElement("span"); t.className = "st"; t.textContent = lb.title;
  btn.append(cv, t);
  if (libraryBookOf(lb)) { const mine = document.createElement("span"); mine.className = "mine"; mine.textContent = "✓ In my books"; btn.appendChild(mine); }
  btn.onclick = () => readLibraryBook(lb);
  return btn;
}

function renderLibrary() {
  const box = $("library");
  box.innerHTML = "";
  const h = document.createElement("div"); h.className = "shelf";
  h.textContent = "Read in Qarbon · " + BOOK_LIBRARY.length + " free books";
  const grid = document.createElement("div"); grid.className = "shelfgrid";
  (shelfAll ? BOOK_LIBRARY : BOOK_LIBRARY.slice(0, 6)).forEach(lb => grid.appendChild(shelfCover(lb)));
  box.append(h, grid);
  if (BOOK_LIBRARY.length > 6) {
    const more = document.createElement("button"); more.className = "shelfmore";
    more.textContent = shelfAll ? "Show fewer ▴" : "Show all " + BOOK_LIBRARY.length + " ▾";
    more.setAttribute("aria-expanded", shelfAll);
    more.onclick = () => { shelfAll = !shelfAll; renderLibrary(); };
    box.appendChild(more);
  }
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
      clearSearch();
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
// ‹ goes home, unless the mini Qpod brought you into the Qpod: then back to where you were (see miniTap in js/media.js)
// ‹: back to where the mini Qpod brought you from, back to the map that opened Review, or home
$("gohome").onclick = () => { if (mode === "media" && miniFrom) miniBack(); else if (mapBack && mode === "daily") setMode("solar"); else show("home"); };
$("logo").onclick = () => show("home");   // tapping the Qarbon logo also takes you back home

// ================= the in-app reader =================
// Two kinds: a book's built-in text (like Siddhartha), chapter by chapter, or a PDF you attached to a book.
// Where you stopped is kept in book.place (so it syncs). Reading time counts while the reader is open and
// you're actually reading (it pauses after 3 minutes without scrolling or tapping).
// book texts that come with Qarbon: one file per library book, like js/books/siddhartha.js
const BOOK_TEXT_FILES = Object.fromEntries(BOOK_LIBRARY.map(b => [b.meta.textId, "js/books/" + b.meta.textId + ".js"]));
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

// ----- PDFs: kept in this browser's IndexedDB (the "pdfs" store, see fileStore in js/data.js), never uploaded -----
const idb = (mode, fn) => fileDo("pdfs", mode, fn);
// the PDF is stored as its raw bytes (an ArrayBuffer): some Safari versions can't store a File object itself
const putPdf = async (id, file) => { const data = await file.arrayBuffer(); return idb("readwrite", st => st.put({ name: file.name, data }, id)); };
const getPdf = id => idb("readonly", st => st.get(id));
const delPdf = id => idb("readwrite", st => st.delete(id));
// a book was folded into its twin while syncing: its PDF (kept on this device) moves along with it
async function movePdf(from, to) {
  try {
    const f = await getPdf(from);
    if (!f || from === to) return;
    if (!(await getPdf(to))) await idb("readwrite", st => st.put(f, to));
    await delPdf(from);
    pdfBooks.delete(from); pdfBooks.add(to);
  } catch (e) {}   // no PDFs on this device (or no storage): nothing to move
}
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
  shownPlace = JSON.stringify(b.place || null);
  placePending = false;
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
  // a paragraph can also be a small heading ("## May 4", the date of a letter), a scene break ("* * *"),
  // or a poem (its lines are kept: they're separated by line breaks, "\n")
  c.paragraphs.forEach(p => p.startsWith("## ") ? add("h3", "", p.slice(3))
                          : p === "* * *" ? add("p", "rd-break", "* * *")
                          : add("p", p.includes("\n") ? "rd-verse" : "", p));
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
// ----- keeping your place, also between your devices -----
// The place is stored 1.5 s after you stop scrolling (or at once when the book closes or you leave the app).
// Syncing can bring a newer place from another device: then the open book jumps there (followSyncedPlace),
// so this screen never saves its older page over the newer one.
let placePending = false;   // you've moved and the place isn't stored yet
let shownPlace = "";        // the place this screen is showing, as saved (JSON), to notice when a sync changes it
function rememberPlace(now) {
  if (!reader) return;
  clearTimeout(placeTimer);
  placePending = true;
  const store = () => {
    if (!reader) return;
    // a sync is under way: wait for it, it may move this screen to a newer place first
    if (!now && typeof syncing !== "undefined" && syncing) { placeTimer = setTimeout(store, 500); return; }
    placePending = false;
    const b = reader.b;
    b.place = reader.kind === "text" ? { ch: reader.ch, y: Math.round(readFraction() * 1000) / 1000 } : { page: reader.page };
    shownPlace = JSON.stringify(b.place);
    save();
  };
  if (now) store(); else placeTimer = setTimeout(store, 1500);
}
// store a waiting place right away: before a sync (js/account.js), and when you leave the app or lock the phone
function flushPlace() { if (reader && placePending) rememberPlace(true); }
document.addEventListener("visibilitychange", () => { if (document.hidden) flushPlace(); });   // runs before account.js's sync
addEventListener("pagehide", flushPlace);
// after a sync (applyMerged in js/account.js): if the open book's place changed, you read on elsewhere: go there
function followSyncedPlace() {
  if (!reader || !reader.b.place) return;
  const p = reader.b.place, key = JSON.stringify(p);
  if (key === shownPlace) return;
  shownPlace = key;
  clearTimeout(placeTimer);
  placePending = false;
  if (reader.kind === "text" && reader.text && Number.isInteger(p.ch)) showChapter(Math.min(p.ch, reader.text.chapters.length - 1), p.y || 0);
  else if (reader.kind === "pdf" && reader.pdf && p.page) showPage(p.page);
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
