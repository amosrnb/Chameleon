// Chameleon workspace — double navigation shell (product rail + contextual sidebar)
(function () {
  const TODAY = new Date(2026, 9, 13); // prototype "today" so due-date groups stay meaningful
  const root = document.getElementById("root");

  /* ---------- persistence (per-viewer convenience only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cham-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cham-" + k, JSON.stringify(v)); } catch (e) {} },
  };
  // all data is kept in the browser so edits survive a reload; a newer data.js version replaces older saves
  const saved = store.get("data", null);
    const D = saved && saved.version === window.DATA.version ? saved : window.DATA;
  D.timelines = D.timelines || []; // added after version 4; older saves start without timelines
  // horizon pages added after version 4: older saves get the Now / Next / Later page, and every goal sits on a page and column that exists
  if (!D.hzPages || !D.hzPages.length) D.hzPages = [{ id: "hz-main", name: "Horizons", cols: [{ id: "now", name: "Now", sub: "This quarter" }, { id: "next", name: "Next", sub: "Next quarter" }, { id: "later", name: "Later", sub: "6–12 months" }] }];
  D.horizons.forEach(g => { const p = D.hzPages.find(x => x.id === g.page) || D.hzPages[0]; g.page = p.id; if (!p.cols.some(c => c.id === g.h)) g.h = p.cols[0].id; });
  let saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set("data", D), 150); };

  /* ---------- state ---------- */
  const S = {
    route: store.get("route", "pin/inbox"),
    theme: store.get("theme", "dark"),
    collapsed: innerWidth < 900, // on narrow screens the sidebar overlays content, so start closed
    closedSecs: new Set(store.get("closedSecs", [])),
    openFolders: new Set(store.get("openFolders", [])),
    curProd: store.get("prod", "work"), // product whose sidebar is shown ("pin/…" and "folder/…" routes keep it)
    lastRoute: { plan: "plan/timelines", work: "work/notes", wiki: "wiki/flashcards", files: "files/folders", ai: "ai/new", settings: "settings/general" },
    draft: null, // ToDo being created in the dialog
    fdraft: null, // folder being created or edited in the settings dialog
    ftab: "plan", // tab on the folder page: plan | content | folders
    ibxT: "today", // inbox ToDo tab: today | upcoming | undated
    ibxN: null, // inbox notification tab: new | all (null: new while anything is unread)
    ibx: null, // inbox widgets [{ id, on, size }], loaded on first visit
    ibxRows: store.get("ibxRows", 6), // rows per inbox list
    prefs: { notifications: true, digest: false, autoAssign: true, publicLinks: false },
    chatSeq: 3,
    study: { deck: null, i: 0, flipped: false, good: 0 }, // flashcard session
    practice: null, // current practice round
    dump: { deck: null, text: "", result: null }, // brain dump session
    summary: null, // source shown on the tutor summary page
    notesLabel: null, // label filter on the notes overview
    timer: { running: false, start: 0, todo: null },
    asst: { open: false, chatId: null, draft: "", model: "Claude Sonnet 5.5", mode: "build" },
  };

  if (!/^(pin|folder)$/.test(S.route.split("/")[0])) S.curProd = S.route.split("/")[0];

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, size = 16, color) => `<i class="icon-${n}" aria-hidden="true" style="font-size:${size}px;width:${size}px;height:${size}px${color ? ";color:" + color : ""}"></i>`;
  const initials = n => n.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const av = (n, s = 20) => `<span class="av" title="${esc(n)}" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .45)}px;background:${D.people[n] || "var(--gray-6)"}">${initials(n)}</span>`;
  const prio = id => D.priorities.find(p => p.id === id) || D.priorities[0];
  const parseDue = d => { if (!d) return null; const [day, mon] = d.split(" "); const m = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ").indexOf(mon); return new Date(2026, m, +day); };
  const dayDiff = d => Math.round((parseDue(d) - TODAY) / 864e5);
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"; // shortcut modifier label
  const kbd = keys => keys.map(k => `<span class="kbd">${k}</span>`).join("");
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const nav = (route, icon, label, extra = {}) => {
    const active = S.route === route || (extra.match && S.route.startsWith(extra.match));
    const lead = extra.lead || (extra.emoji ? `<span class="emoji">${extra.emoji}</span>` : ic(icon, 16, extra.color));
    const on = extra.active != null ? extra.active : active;
    return `<button class="nav${on ? " active" : ""}${extra.sub ? " sub" : ""}" data-a="${extra.action || "go:" + route}"${extra.pad ? ` style="padding-left:${extra.pad}px"` : ""}${extra.drag ? ` data-drag="${extra.drag}" draggable="true"` : ""}>${lead}<span class="lbl">${esc(label)}</span>${extra.count ? `<span class="count">${extra.count}</span>` : ""}</button>`;
  };

  /* ---------- elements: one registry for every type ---------- */
  // fam "plan" = things you schedule, fam "content" = things you make; the two are always shown apart
  const TYPES = {
    todo: { fam: "plan", label: "ToDo", plural: "ToDos", icon: x => x.done ? "circle-check" : "circle", list: () => D.todos, name: x => x.text, route: () => "pin/todos" },
    event: { fam: "plan", label: "Event", plural: "Events", icon: x => x.type === "focus" ? "headphones" : "calendar", list: () => D.events, name: x => x.title || "(No title)", route: () => "pin/calendar" },
    timeline: { fam: "plan", label: "Timeline", plural: "Timelines", icon: () => "chart-gantt", list: () => D.timelines, name: x => x.name, route: () => "plan/timelines" },
    goal: { fam: "plan", label: "Goal", plural: "Goals", icon: () => "telescope", list: () => D.horizons, name: x => x.title, route: x => "plan/horizons/" + hzPage(x.page).id },
    note: { fam: "content", label: "Note", plural: "Notes", icon: () => "file-text", list: () => D.notes, name: x => x.title || "Untitled", route: x => "work/notes/" + x.id },
    canvas: { fam: "content", label: "Canvas", plural: "Canvases", icon: () => "layout-dashboard", list: () => D.canvases, name: x => x.name, route: x => "work/canvas/" + x.id },
    sticky: { fam: "content", label: "Sticky", plural: "Stickies", icon: () => "sticky-note", list: () => D.stickies, name: x => (x.text.split("\n")[0] || "Empty sticky").slice(0, 32), route: x => "work/stickies/" + x.id },
    deck: { fam: "content", label: "Deck", plural: "Decks", icon: () => "gallery-vertical-end", list: () => D.decks, name: x => x.name, route: x => "wiki/flashcards/" + x.id },
    page: { fam: "content", label: "Page", plural: "Pages", icon: x => x.icon || "file-text", list: () => D.pages, name: x => x.title || "Untitled", route: x => "wiki/" + x.id },
    file: { fam: "content", label: "File", plural: "Files", icon: x => x.icon || "file", list: () => D.files, name: x => x.name, route: x => "files/file/" + x.id },
    chat: { fam: "content", label: "Chat", plural: "Chats", icon: () => "message-square", list: () => D.chats, name: x => x.title, route: x => "ai/" + x.id },
  };
  const TYPE_KEYS = Object.keys(TYPES);
  // which element types each product's sidebar shows inside the folder tree
  const PROD_TYPES = { plan: ["todo", "event", "timeline", "goal"], work: ["note", "canvas", "sticky"], wiki: ["deck", "page"], files: TYPE_KEYS, ai: ["chat"] };
  const find = (t, id) => TYPES[t] && TYPES[t].list().find(x => x.id === id);
  const todo = id => find("todo", id);
  const allItems = () => TYPE_KEYS.flatMap(t => TYPES[t].list().map(x => ({ t, x })));
  const itemsIn = (fid, types = TYPE_KEYS) => allItems().filter(({ t, x }) => (x.folder || null) === fid && types.includes(t));
  const famTypes = fam => TYPE_KEYS.filter(t => TYPES[t].fam === fam);

  /* ---------- folders: one global tree ---------- */
  const FOLDER_COLORS = { "": "", blue: "var(--blue-500)", green: "var(--green-500)", amber: "var(--amber-500)", violet: "var(--violet-500)", red: "var(--red-500)" };
  const FOLDER_ICONS = ["folder", "book-open", "graduation-cap", "calculator", "flask-conical", "languages", "palette", "code", "briefcase", "box", "megaphone", "user-round", "heart", "globe", "music", "dumbbell"];
  const folder = id => id ? D.folders.find(f => f.id === id) : null;
  const kids = id => D.folders.filter(f => (f.parent || null) === (id || null));
  const fpath = id => { const out = []; for (let f = folder(id); f; f = folder(f.parent)) out.unshift(f); return out; };
  const descendants = id => kids(id).flatMap(k => [k, ...descendants(k.id)]);
  const subtreeIds = id => [id, ...descendants(id).map(f => f.id)];
  const deepItems = (id, types) => { const ids = new Set(subtreeIds(id)); return allItems().filter(({ t, x }) => ids.has(x.folder) && (!types || types.includes(t))); };
  const folderIcon = (f, size = 16) => f.emoji ? `<span class="emoji" style="font-size:${Math.round(size * .82)}px;width:${size}px;text-align:center">${f.emoji}</span>` : ic(f.icon || "folder", size, FOLDER_COLORS[f.color || ""] || "");
  const folderName = id => { const f = folder(id); return f ? f.name : ""; };
  // knowledge base: the nearest explicit kb flag up the tree decides (subfolders inherit, can switch off)
  const kbState = f => { for (let x = f; x; x = folder(x.parent)) if (x.kb != null) return { on: x.kb, from: x }; return { on: false, from: null }; };
  // project folders: progress = done / all ToDos anywhere inside the folder
  const projProgress = f => { const ts = deepItems(f.id, ["todo"]).map(i => i.x); return ts.length ? Math.round(ts.filter(t => t.done).length / ts.length * 100) : 0; };
  const projects = () => D.folders.filter(f => f.project);
  const revealFolder = id => fpath(id).forEach(f => S.openFolders.add(f.id));
  // Linear-style section: muted label followed by a small solid caret
  const section = (key, label, body, action = "", route) => `<div class="sec${S.closedSecs.has(key) ? " closed" : ""}" data-fold="sec:${key}"><div class="sec-head${route ? " linked" + (S.route === route || S.route.startsWith(route + "/") ? " active" : "") : ""}" data-a="${route ? "opensec:" + key + "|" + route : "sec:" + key}"><span>${label}</span>${route ? `<span class="caret-hit" data-a="sec:${key}" title="Expand / collapse"><span class="caret"></span></span>` : `<span class="caret"></span>`}${action}</div><div class="fold-body"${S.closedSecs.has(key) ? " inert" : ""}><div class="sec-body sb-group">${body}</div></div></div>`;
  const unreadCount = () => D.inbox.filter(m => m.unread).length;
  // horizon pages: unknown ids fall back to the first page, unknown columns to the page's first column
  const hzPage = id => D.hzPages.find(p => p.id === id) || D.hzPages[0];
  const hzCol = x => { const p = hzPage(x.page); return p.cols.find(c => c.id === x.h) || p.cols[0]; };
  const curHzPage = () => hzPage(S.route.startsWith("plan/horizons/") ? S.route.split("/")[2] : null);
  // focus an inline-editable field and select its text
  const focusEdit = sel => setTimeout(() => { const el = document.querySelector(sel); if (!el) return; el.focus(); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });

  /* ---------- top bar & rail ---------- */
  function topbar() {
    return `<header class="topbar">
      <button class="ws-switch" data-a="wsmenu"><span class="ws-logo">${D.workspace.initial}</span><span class="ws-name">${esc(D.workspace.name)}</span>${ic("chevron-down", 14, "var(--text-tertiary)")}</button>
      <button class="search" data-a="palette" aria-label="Search">${ic("search", 14)}<span class="q">Search ${esc(D.workspace.name)}…</span>${kbd([MOD, "S"])}</button>
      <div class="top-actions">
        <button class="ib" data-a="theme" title="Toggle theme">${ic(S.theme === "dark" ? "sun" : "moon")}</button>
        <button class="btn${S.asst.open ? "" : " ghost"}" data-a="asst-toggle" aria-pressed="${S.asst.open}">${ic(S.asst.open ? "x" : "sparkles", 14)}AI assistant</button>      </div>
    </header>`;
  }
  function rail() {
    const p = S.curProd;
    const b = (id, icon, label, key) => `<button class="rail-btn${p === id ? " active" : ""}" data-a="product:${id}" aria-label="${label}"><span class="tile">${ic(icon, 20)}${id === "work" && unreadCount() && p !== "work" ? '<span class="rail-badge"></span>' : ""}</span><span class="rail-lbl">${label}</span><span class="tip">${label}${kbd([key])}</span></button>`;
    return `<nav class="rail" aria-label="Products">${b("plan", "route", "Plan", "1")}${b("work", "kanban", "Work", "2")}${b("wiki", "notebook-text", "Learn", "3")}${b("files", "folder-open", "Files", "4")}${b("ai", "bot", "AI", "5")}
      <div class="rail-bottom">${b("settings", "settings", "Settings", ",")}<div class="rail-sep" style="margin:0"></div><button class="rail-btn" data-a="usermenu" aria-label="${esc(D.me)}"><span class="tile">${av(D.me, 22)}</span><span class="tip">${esc(D.me)}</span></button></div></nav>`;
  }

  /* ---------- sidebars ---------- */
  // Linear-style header: workspace switcher left, search + round compose button right
  // sidebar title bar: product name left, collapse button right
  const PROD_NAMES = { plan: "Plan", work: "Work", wiki: "Learn", files: "Files", ai: "AI" };
  function sbHead(compose, composeTitle) {
    return `<div class="sb-titlebar"><span class="sb-name">${PROD_NAMES[S.curProd] || ""}</span><button class="ib" data-a="collapse" title="Collapse sidebar  [">${ic("panel-left")}</button></div>
      <div class="sb-top"><div class="sb-tools">
        <button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button>
        ${compose ? `<button class="ib compose" data-a="${compose}" title="${composeTitle}">${ic("square-pen")}</button>` : ""}
      </div>${pinned()}</div>`;
  }
  function sbFoot() {
    return `<div class="sb-foot"><button class="ib compose" data-a="shortcuts" title="Help and shortcuts">${ic("circle-help")}</button><span style="flex:1"></span><button class="ib" data-a="collapse" title="Collapse sidebar  [">${ic("panel-left")}</button></div>`;
  }
  // Pinned pages: shown at the top of every product sidebar; their routes ("pin/…") keep the current product's sidebar
  function pinned() {
    return `<div class="sb-group pinned">
        ${nav("pin/inbox", "inbox", "Inbox", { count: unreadCount() || "" })}
        ${nav("pin/calendar", "calendar", "Calendar")}
        ${nav("pin/todos", "list-checks", "ToDos", { count: D.todos.filter(t => !t.done).length || "" })}
      </div>`;
  }
  // expandable nav row (Notes, Canvas): click shows/hides its entries; "+" on hover adds one
  // with `route`, the row itself opens that page and only the caret expands/collapses
  function expandRow(id, icon, label, itemsHtml, addAction, addTitle, route) {
    const open = S.openFolders.has(id), caret = route ? `<span class="caret-hit" data-a="tfold:${id}" title="${open ? "Collapse" : "Expand"}"><span class="caret"></span></span>` : `<span class="caret"></span>`;
    return `<div class="tree${open ? " open" : ""}" data-fold="tree:${id}">
      <button class="nav team${route && S.route === route ? " active" : ""}" data-a="${route ? "openrow:" + id + "|" + route : "tfold:" + id}" aria-expanded="${open}">${ic(icon)}<span class="lbl">${label}</span>${caret}${addAction ? `<span class="more" data-a="${addAction}" title="${addTitle}">${ic("plus", 14)}</span>` : ""}</button>
      <div class="fold-body"${open ? "" : " inert"}><div class="fold-inner">${itemsHtml || `<div class="nav sub empty-sub"><span class="lbl">Empty</span></div>`}</div></div>
    </div>`;
  }
  const FOLDERS_SEC_ACT = `<span class="ib sm sec-act" data-a="newfolder" title="New folder">${ic("plus", 14)}</span>`;
  function sidebarWork() {
    return sbHead("qc", "Create  C") +
      `<div class="sb-group">
        ${expandRow("x-notes", "notebook-pen", "Notes", D.notes.map(n => nav("work/notes/" + n.id, "file-text", n.title || "Untitled", { sub: true, drag: "note:" + n.id })).join(""), "note-add", "New note", "work/notes")}
        ${expandRow("x-canvas", "shapes", "Canvas", D.canvases.map(b => nav("work/canvas/" + b.id, "layout-dashboard", b.name, { sub: true, drag: "canvas:" + b.id })).join(""), "canvas-add", "New canvas", "work/canvas")}
        ${nav("work/stickies", "sticky-note", "Stickies", { match: "work/stickies" })}
      </div>
      ${section("folders", "Folders", folderForest("work"), FOLDERS_SEC_ACT)}
      ${sbFoot()}`;
  }
  function sidebarWiki() {
    return sbHead("qc", "Create  C") +
      `<div class="sb-group">
        ${nav("wiki/flashcards", "gallery-vertical-end", "Flashcards", { match: "wiki/flashcards" })}
        ${expandRow("x-practice", "dumbbell", "Practice", nav("wiki/practice/test", "clipboard-check", "Test", { sub: true }) + nav("wiki/practice/braindump", "brain", "Brain dump", { sub: true }), null, null, "wiki/practice")}
        ${expandRow("x-tutor", "graduation-cap", "AI Tutor", nav("wiki/tutor/chat", "messages-square", "Conversation mode", { sub: true }) + nav("wiki/tutor/summary", "scroll-text", "Summary", { sub: true }), null, null, "wiki/tutor")}
        ${nav("wiki/progress", "trending-up", "Track & progress")}
      </div>
      ${section("folders", "Folders", folderForest("wiki"), FOLDERS_SEC_ACT)}
      ${sbFoot()}`;
  }
  const fileItem = f => nav("files/file/" + f.id, f.icon, f.name, { sub: true });
  const liveFiles = () => D.files;
  const kbTree = k => ({ id: k.id, name: k.name, items: liveFiles().filter(f => k.files.includes(f.name)) });
  // events, timelines and goals open in a dialog instead of a page of their own
  const DIALOG_TYPES = ["event", "timeline", "goal"];
  // one row of an element inside the sidebar tree; Plan elements share a page, so they never show as active
  function treeItem({ t, x }, depth) {
    const T = TYPES[t], route = T.route(x);
    return nav(route, T.icon(x), T.name(x), { sub: true, pad: 30 + Math.min(depth, 4) * 14, drag: t + ":" + x.id, active: T.fam === "plan" ? false : null, color: t === "todo" && x.done ? "var(--success)" : "", action: DIALOG_TYPES.includes(t) ? `open:${t}|${x.id}` : null });
  }
  // a folder in the global tree: the row opens the folder page, the caret only folds; shows the product's own types
  function folderNode(f, depth, types) {
    const open = S.openFolders.has(f.id), pad = 8 + Math.min(depth, 4) * 14;
    const items = itemsIn(f.id, types), plan = items.filter(i => TYPES[i.t].fam === "plan"), cont = items.filter(i => TYPES[i.t].fam === "content");
    const famLbl = (l, list) => plan.length && cont.length ? `<div class="tree-fam label-mono" style="padding-left:${pad + 22}px">${l}</div>` + list : list;
    const body = kids(f.id).map(k => folderNode(k, depth + 1, types)).join("")
      + famLbl("Plan", plan.map(i => treeItem(i, depth)).join("")) + famLbl("Content", cont.map(i => treeItem(i, depth)).join(""));
    const n = deepItems(f.id, types).length;
    return `<div class="tree${open ? " open" : ""}" data-fold="tree:${f.id}">
      <button class="nav team${S.route === "folder/" + f.id ? " active" : ""}" style="padding-left:${pad}px" data-a="openfolder:${f.id}" data-drop="${f.id}" data-drag="folder:${f.id}" draggable="true" aria-expanded="${open}">${folderIcon(f)}<span class="lbl">${esc(f.name)}</span><span class="caret-hit" data-a="tfold:${f.id}" title="${open ? "Collapse" : "Expand"}"><span class="caret"></span></span><span class="count">${n || ""}</span></button>
      <div class="fold-body"${open ? "" : " inert"}><div class="fold-inner">${body || `<div class="nav sub empty-sub" style="padding-left:${pad + 22}px"><span class="lbl">Empty</span></div>`}</div></div>
    </div>`;
  }
  const folderForest = prod => kids(null).map(f => folderNode(f, 0, PROD_TYPES[prod] || TYPE_KEYS)).join("") || `<div class="nav sub empty-sub" style="padding-left:8px"><span class="lbl">No folders yet</span></div>`;
  // expandable list row used by the knowledge base collections (flat lists of files)
  function folderTree(f, itemRow, icons = ["folder", "folder-open"]) {
    const open = S.openFolders.has(f.id);
    const items = f.items.length
      ? f.items.map((it, n) => itemRow(it, n, f)).join("")
      : `<div class="nav sub empty-sub"><span class="lbl">Empty</span></div>`;
    return `<div class="tree${open ? " open" : ""}" data-fold="tree:${f.id}">
      <button class="nav team" data-a="tfold:${f.id}" aria-expanded="${open}">${ic(open ? icons[1] : icons[0])}<span class="lbl">${esc(f.name)}</span><span class="caret"></span><span class="count">${f.items.length || ""}</span></button>
      <div class="fold-body"${open ? "" : " inert"}><div class="fold-inner">${items}</div></div>
    </div>`;
  }
  const stickyLabel = s => TYPES.sticky.name(s);
  function sidebarPlan() {
    return sbHead("qc", "Create  C") +
      `<div class="sb-group">
        ${nav("plan/timelines", "chart-gantt", "Timelines")}
        ${expandRow("x-hz", "telescope", "Horizons", D.hzPages.map(p => nav("plan/horizons/" + p.id, "columns-3", p.name || "Untitled", { sub: true })).join(""), "hz-page-add", "New horizon page", "plan/horizons")}
        ${nav("plan/time", "timer", "Time tracking")}
        ${nav("plan/analytics", "chart-column", "Analytics")}
      </div>
      ${section("folders", "Folders", folderForest("plan"), FOLDERS_SEC_ACT)}
      ${sbFoot()}`;
  }
  function sidebarFiles() {
    return sbHead("upload", "Upload file") +
      `<div class="sb-group">
        ${nav("files/folders", "folders", "All folders")}
        ${nav("files/recent", "clock", "Recent")}
        ${nav("files/starred", "star", "Starred")}
        ${nav("files/trash", "trash-2", "Trash", { count: D.trash.length || "" })}
      </div>
      ${section("folders", "Folders", folderForest("files"), FOLDERS_SEC_ACT, "files/folders")}
      ${section("kbase", "Knowledge base", D.knowledge.map(k => folderTree(kbTree(k), fileItem, ["book-marked", "library-big"])).join(""), `<span class="ib sm sec-act" data-a="newcollection" title="New collection">${ic("plus", 14)}</span>`, "files/kb")}
      ${sbFoot()}`;
  }
  function sidebarAI() {
    return sbHead("go:ai/new", "New chat") +
      `<div class="sb-group">${nav("ai/new", "message-square-plus", "New chat")}</div>
      ${section("chats", "Recent chats", D.chats.map(c => nav("ai/" + c.id, "message-square", c.title, { drag: "chat:" + c.id })).join(""))}
      ${section("folders", "Folders", folderForest("ai"), FOLDERS_SEC_ACT)}
      ${sbFoot()}`;
  }
  function sidebarSettings() {
    const s = (id, icon, label) => nav("settings/" + id, icon, label);
    return `<div class="sb-head"><button class="nav back" data-a="back">${ic("chevron-left")}<span class="lbl">Back to app</span></button></div>
      <div class="ws-card"><span class="ws-logo">${D.workspace.initial}</span><div class="meta"><div class="name">${esc(D.workspace.name)}</div><div class="role">Owner</div></div><span class="badge">${D.workspace.plan}</span></div>
      ${section("adm", "Administration", s("general", "building-2", "General") + s("members", "users", "Members") + s("billing", "credit-card", "Billing and plans") + s("imports", "download", "Imports") + s("exports", "upload", "Exports"))}
      ${section("prod", "Products", s("wiki", "book-open", "Wiki") + s("ai", "sparkles", "AI"))}
      ${section("feat", "Features", s("projects", "box", "Projects") + s("initiatives", "lightbulb", "Initiatives"))}
      ${section("acct", "Account", s("profile", "user-round", "Profile") + s("preferences", "palette", "Preferences"))}
      ${sbFoot()}`;
  }

  /* ---------- shared content pieces ---------- */
  function header(title, opts = {}) {
    return `<div class="ph">${S.collapsed ? `<button class="ib" data-a="collapse" title="Show sidebar">${ic("panel-left")}</button>` : ""}${opts.lead || ""}<span class="title">${title}</span>${opts.count != null ? `<span class="mono" style="color:var(--text-tertiary)">${opts.count}</span>` : ""}${opts.mid || ""}<span class="spacer"></span>${opts.actions || ""}</div>`;
  }
  function emptyState(icon, title, text, acts = "") {
    return `<div class="empty">${ic(icon, 44)}<h3>${title}</h3><p>${text}</p>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
  }
  const ago = u => !u ? "–" : u === "now" ? "just now" : u + " ago";
  // short, type-specific detail shown next to an element in tables
  function itemDetail(t, x) {
    if (t === "todo") { if (x.done) return "Done"; if (!x.due) return "No date"; const dd = dayDiff(x.due); return `<span style="${dd < 0 ? "color:var(--danger)" : ""}">${x.due}</span>`; }
    if (t === "goal") return esc((D.hzPages.length > 1 ? hzPage(x.page).name + " · " : "") + hzCol(x).name);
    if (t === "event") return fmtShort(x.date) + (x.endDate ? " – " + fmtShort(x.endDate) : "");
    if (t === "timeline") return fmtShort(x.start) + " – " + fmtShort(x.end);
    if (t === "deck") return x.cards.length + " cards";
    if (t === "canvas") return x.items.length + " items";
    if (t === "file") return x.size;
    if (t === "chat") return x.log.length ? Math.ceil(x.log.length / 2) + " messages" : "Empty";
    if (t === "page") return x.body.join(" ").trim().split(/\s+/).filter(Boolean).length + " words";
    return ago(x.updated);
  }
  // secondary column: what matters most for each type
  function itemMeta(t, x) {
    if (t === "todo") { const p = prio(x.prio); return p.id ? `<span style="display:inline-flex;align-items:center;gap:5px">${ic(p.icon, 12, p.color)}${p.name}</span>` : ""; }
    if (t === "goal") return { on: "On track", risk: "At risk", idea: "Idea" }[x.conf] || "";
    if (t === "event") return (x.allDay ? "All day" : fmtT(x.start) + " – " + fmtT(x.end)) + (x.rrule ? " · repeats" : "");
    if (t === "timeline") { const n = isoDiff(x.start, x.end) + 1; return n >= 14 ? Math.round(n / 7) + " weeks" : n + (n === 1 ? " day" : " days"); }
    if (t === "note") return esc((x.labels || []).join(", "));
    if (t === "deck") { const n = x.cards.filter(c => !c.known).length; return n ? n + " to learn" : "Mastered"; }
    if (t === "file") return esc(x.owner || "");
    return TYPES[t].label;
  }
  // one table row for any element: open on click, drag into a folder, right-click or "…" for actions
  function itemRow({ t, x }, opts = {}) {
    const T = TYPES[t];
    const lead = t === "todo" ? `<button class="todo-ck${x.done ? " on" : ""}" data-a="todo:${x.id}" title="${x.done ? "Mark as open" : "Mark as done"}">${x.done ? ic("check", 11) : ""}</button>` : ic(T.icon(x), 16, "var(--text-secondary)");
    return `<div class="coll-row c-item${t === "todo" && x.done ? " is-done" : ""}" data-a="open:${t}|${x.id}" data-drag="${t}:${x.id}" draggable="true">
      <span class="coll-name">${lead}<span>${esc(T.name(x))}</span>${x.starred ? ic("star", 12, "var(--warning)") : ""}</span>
      <span class="mono" style="color:var(--text-tertiary)">${opts.folderCol ? esc(folderName(x.folder) || "No folder") : itemMeta(t, x)}</span>
      <span class="mono" style="color:var(--text-tertiary)">${itemDetail(t, x)}</span>
      <button class="ib sm" data-a="imenu:${t}|${x.id}" title="More">${ic("ellipsis", 14)}</button></div>`;
  }
  const folderField = (fid, act) => { const f = folder(fid); return `<span class="chip${f ? "" : " is-empty"}" data-a="${act}" title="Folder">${f ? folderIcon(f, 13) : ic("folder-plus", 13)}${f ? esc(f.name) : "No folder"}</span>`; };
  const folderChip = (t, x) => { const f = folder(x.folder); return `<span class="chip${f ? "" : " is-empty"}" data-a="move:${t}|${x.id}" title="Move to folder">${f ? folderIcon(f, 13) : ic("folder-plus", 13)}${f ? esc(f.name) : "No folder"}</span>`; };
  // rows grouped by type (in registry order), each group with a small label
  const itemGroups = (items, opts) => TYPE_KEYS.map(t => { const list = items.filter(i => i.t === t); return list.length ? `<div class="coll-sub label-mono">${TYPES[t].plural}<span>${list.length}</span></div>` + list.map(i => itemRow(i, opts)).join("") : ""; }).join("");

  /* ---------- views ---------- */
  const stat = (v, k, icon) => `<div class="stat"><div style="display:flex;justify-content:space-between;align-items:center"><span class="v">${v}</span>${ic(icon, 16, "var(--text-tertiary)")}</div><div class="k">${k}</div></div>`;
  // folder page: path, settings, subfolders, then Plan and Content as two separate areas
  function viewFolder(id) {
    const f = folder(id);
    if (!f) return header("Folder") + emptyState("folder-x", "Folder not found", "It may have been deleted.", `<button class="btn" data-a="go:files/folders">All folders</button>`);
    const path = fpath(id), kb = kbState(f), sub = kids(id);
    const crumb = path.map((p, n) => n < path.length - 1 ? `<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="openfolder:${p.id}">${esc(p.name)}</span> <span class="crumb-sep">›</span> ` : esc(p.name)).join("");
    const plan = itemsIn(id, famTypes("plan")), cont = itemsIn(id, famTypes("content"));
    const badges = (kb.on ? `<span class="chip" data-a="fsettings:${id}" title="${kb.from && kb.from !== f ? "Inherited from " + esc(kb.from.name) : "Knowledge Base"}">${ic("library-big", 12)}Knowledge Base${kb.from && kb.from !== f ? `<span style="color:var(--text-tertiary)">· inherited</span>` : ""}</span>` : "")
      + (f.project ? `<span class="chip" data-a="fsettings:${id}">${ic("folder-kanban", 12)}Project</span>` : "");
    let proj = "";
    if (f.project) {
      const ts = deepItems(id, ["todo"]).map(i => i.x), next = (f.project.milestones || [])[0];
      proj = `<div class="stats fd-stats">${stat(projProgress(f) + "%", "Progress", "chart-no-axes-column")}${stat(ts.filter(t => !t.done).length, "Open ToDos", "circle")}${stat(esc(f.project.target || "–"), "Target", "target")}${stat(next ? esc(next.name) : "–", next ? "Milestone · ends " + esc(next.end) : "No milestone", "flag")}</div>
        <div class="bar fd-bar"><span style="width:${projProgress(f)}%"></span></div>`;
    }
    const subRows = sub.map(k => { const p = deepItems(k.id, famTypes("plan")).length, c = deepItems(k.id, famTypes("content")).length;
      return `<div class="coll-row c-item" data-a="openfolder:${k.id}" data-drag="folder:${k.id}" data-drop="${k.id}" draggable="true">
        <span class="coll-name">${folderIcon(k)}<span>${esc(k.name)}</span>${kbState(k).on ? ic("library-big", 12, "var(--text-tertiary)") : ""}</span>
        <span class="mono" style="color:var(--text-tertiary)">${p} plan</span><span class="mono" style="color:var(--text-tertiary)">${c} content</span>
        <button class="ib sm" data-a="fmenu:${k.id}" title="More">${ic("ellipsis", 14)}</button></div>`; }).join("");
    // tabs: Plan (default) · Content · Folders — one area at a time
    const tab = ["plan", "content", "folders"].includes(S.ftab) ? S.ftab : "plan";
    const tabBtn = (k, label, n) => `<button class="tab${tab === k ? " active" : ""}" data-a="ftab:${k}" role="tab" aria-selected="${tab === k}">${label}<span class="mono">${n}</span></button>`;
    const empty = (icon, hint) => `<div class="box ibx-empty fd-empty">${ic(icon, 16, "var(--text-tertiary)")}${hint}</div>`;
    const panel = tab === "folders" ? (sub.length ? `<div class="coll-table fd-area">${subRows}</div>` : empty("folder-plus", "No subfolders yet."))
      : tab === "content" ? (cont.length ? `<div class="coll-table fd-area">${itemGroups(cont)}</div>` : empty("notebook-pen", "No notes, canvases, stickies, decks or files in this folder yet."))
      : (plan.length ? `<div class="coll-table fd-area">${itemGroups(plan)}</div>` : empty("calendar-check", "No ToDos, events, timelines or goals in this folder yet."));
    const add = tab === "folders" ? `<button class="btn sm" data-a="newfolder:${id}">${ic("folder-plus", 13)}New folder</button>` : `<button class="btn sm" data-a="qcfam:${tab}|${id}">${ic("plus", 13)}Add</button>`;
    return header(crumb, { lead: folderIcon(f), actions: `<button class="ib" data-a="fsettings:${id}" title="Folder settings">${ic("settings-2")}</button><button class="ib" data-a="fmenu:${id}" title="More">${ic("ellipsis")}</button>` }) +
      `<div class="scroll"><div class="coll">
        <div class="coll-head"><span class="coll-icon">${folderIcon(f, 24)}</span><h1>${esc(f.name)}</h1>${badges}<span class="spacer"></span>
          <button class="btn" data-a="fsettings:${id}">${ic("settings-2", 14)}Settings</button>
          <button class="btn primary" data-a="qc:${id}">${ic("plus", 14)}New</button></div>
        <p class="coll-desc">${f.desc ? esc(f.desc) + " · " : ""}${sub.length} ${sub.length === 1 ? "subfolder" : "subfolders"} · ${plan.length + cont.length} ${plan.length + cont.length === 1 ? "element" : "elements"} here · ${deepItems(id).length} in total</p>
        ${proj}
        <div class="fd-tabbar" role="tablist">${tabBtn("plan", "Plan", plan.length)}${tabBtn("content", "Content", cont.length)}${tabBtn("folders", "Folders", sub.length)}<span class="spacer"></span>${add}</div>
        ${panel}
      </div></div>`;
  }
  // Inbox: a column of widgets the viewer picks, orders and sizes (Customize dialog); layout is kept per browser
  const IB_ICONS = { reminder: "bell", study: "gallery-vertical-end", milestone: "flag", time: "timer", done: "circle-check", system: "sparkles" };
  const dueLabel = dd => dd < 0 ? `${-dd}d overdue` : dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : `In ${dd}d`;
  // id: [label, description, icon, default width, shown by default]; fixed widgets always span the full width
  const IBX_W = {
    greeting: ["Greeting", "Date, greeting and the one-line status.", "hand", "full", true],
    summary: ["Summary tiles", "Unread, overdue, due today and this week as big numbers.", "layout-grid", "full", true],
    todos: ["My ToDos", "Open ToDos in tabs: today, upcoming, no date.", "list-checks", "half", true],
    notes: ["Notifications", "Reminders and updates, new ones first.", "bell", "half", true],
    projects: ["Projects", "Progress, open ToDos, next milestone and target per project.", "folder-kanban", "full", true],
    days: ["Next 14 days", "How many ToDos are due on each of the next 14 days.", "calendar-days", "half", true],
    milestones: ["Milestones", "The next milestones across all projects.", "flag", "half", false],
    time: ["Time this week", "Hours logged per day this week.", "timer", "half", true],
    learn: ["Learning", "Flashcards mastered and study time.", "gallery-vertical-end", "half", true],
  };
  const IBX_FIXED = ["greeting"];
  const ibxDefault = () => Object.entries(IBX_W).map(([id, w]) => ({ id, on: w[4], size: w[3] }));
  // saved layout first (unknown ids dropped), widgets added later go to the end with their defaults
  const ibxLoad = () => {
    const saved = (store.get("ibxLayout", []) || []).filter(w => IBX_W[w.id]);
    return [...saved, ...ibxDefault().filter(d => !saved.some(w => w.id === d.id))];
  };
  function viewInbox() {
    S.ibx = S.ibx || ibxLoad();
    const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const open = D.inbox.filter(m => !m.done), cleared = D.inbox.length - open.length, unread = unreadCount();
    const mono = s => `<span class="mono ibx-m">${s}</span>`;
    const MAX = S.ibxRows; // rows per list before "Show all"
    // open ToDos by due date; undated ones have their own tab
    const openT = D.todos.filter(t => !t.done).map(t => ({ t, dd: t.due ? dayDiff(t.due) : null }));
    const byDue = f => openT.filter(f).sort((a, b) => a.dd - b.dd);
    const over = byDue(x => x.dd !== null && x.dd < 0), today = byDue(x => x.dd === 0), upcoming = byDue(x => x.dd > 0), undated = openT.filter(x => x.dd === null);
    const week = upcoming.filter(x => x.dd <= 7);

    const card = (title, tabs, actions, body) => `<div class="ibx-card-h"><h2 class="ibx-h2">${title}</h2>${tabs}<span class="spacer"></span>${actions}</div>${body}`;
    const tabs = (act, cur, list) => `<div class="ibx-tabs" role="tablist">${list.map(([k, label, n]) => `<button class="tab${cur === k ? " active" : ""}" data-a="${act}:${k}" role="tab" aria-selected="${cur === k}">${label}${n ? `<span class="mono">${n}</span>` : ""}</button>`).join("")}</div>`;
    const empty = (icon, text) => `<div class="ibx-empty">${ic(icon, 16, "var(--text-tertiary)")}<span>${text}</span></div>`;
    const list = (items, render, a, e) => items.length ? `<div class="ibx-list">${items.slice(0, MAX).map(render).join("")}</div>${items.length > MAX ? `<button class="ibx-more" data-a="${a}">Show all ${items.length}</button>` : ""}` : e;
    const link = (a, label) => `<button class="btn sm ghost" data-a="${a}">${label}</button>`;

    const W = {};
    // greeting: the numbers that matter, each one opens the matching tab
    const st = [over.length && [over.length + " overdue", "t:today", " late"], today.length && [today.length + " due today", "t:today", ""], unread && [unread + " unread", "n:new", ""]].filter(Boolean);
    const date = TODAY.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    W.greeting = () => `<span class="label-mono">${date}</span><h1 class="ibx-title">${greet}, ${esc(D.me.split(" ")[0])}.</h1>
      <p class="ibx-status">${st.length ? st.map(([t, a, c]) => `<button class="ibx-st${c}" data-a="ibx-go:${a}">${t}</button>`).join('<span class="ibx-sep">·</span>') : "Nothing urgent. You're on track."}</p>`;

    const sum = (k, n, icon, a, hot) => `<div class="ibx-tile${hot ? " hot" : ""}" data-a="ibx-go:${a}"><div class="ibx-tile-top"><span class="label-mono">${k}</span>${ic(icon, 14, "var(--text-tertiary)")}</div><div class="ibx-num">${n}</div></div>`;
    W.summary = () => `<div class="ibx-sum">${sum("Unread", unread, "mail", "n:new")}${sum("Overdue", over.length, "circle-alert", "t:today", over.length)}${sum("Due today", today.length, "calendar-check", "t:today")}${sum("This week", week.length, "calendar-range", "t:upcoming")}</div>`;

    // ToDos: the circle ticks one off, the rest of the row opens the ToDos page
    const tt = ["today", "upcoming", "undated"].includes(S.ibxT) ? S.ibxT : "today";
    const todoRow = ({ t, dd }) => {
      const pr = prio(t.prio), fo = folder(t.folder);
      return `<div class="ibx-row" data-a="go:pin/todos"><span class="ibx-ck" data-a="todo:${t.id}" title="Mark done"></span>
        <span class="ibx-t">${esc(t.text)}</span>${fo ? `<span class="ibx-fo">${esc(fo.name)}</span>` : ""}
        <span class="ibx-pr" title="${pr.name}">${pr.id ? ic(pr.icon, 13, "var(--text-tertiary)") : ""}</span>
        <span class="ibx-due${dd !== null && dd < 0 ? " late" : ""}">${dd === null ? "No date" : dueLabel(dd)}</span></div>`;
    };
    const tItems = tt === "today" ? [...over, ...today] : tt === "upcoming" ? upcoming : undated;
    const tEmpty = tt === "today" ? `Nothing due today.${upcoming.length ? ` ${upcoming.length} coming up.` : ""}` : tt === "upcoming" ? "Nothing scheduled." : "Every ToDo has a date.";
    W.todos = () => card("My ToDos",
      tabs("ibx-t", tt, [["today", "Today", over.length + today.length], ["upcoming", "Upcoming", upcoming.length], ["undated", "No date", undated.length]]),
      `<button class="ib sm" data-a="qcfam:plan|" title="New ToDo">${ic("plus", 14)}</button>${link("go:pin/todos", "All")}`,
      list(tItems, todoRow, "go:pin/todos", empty("circle-check", tEmpty)));

    // notifications: new ones by default; read, clear and open on the row
    const nt = ["new", "all"].includes(S.ibxN) ? S.ibxN : unread ? "new" : "all";
    const noteRow = m => {
      const t = m.todo && todo(m.todo), title = t ? esc(t.text) : esc(m.title || "Deleted ToDo");
      return `<div class="ibx-row ibx-note${m.unread ? " unread" : ""}" data-a="ib-open:${m.id}"><span class="ibx-ico">${ic(IB_ICONS[m.kind] || "bell", 14)}</span>
        <span class="ibx-txt"><span class="ibx-t">${title}</span><span class="ibx-s">${esc(m.body)}</span></span>
        <span class="ibx-tools"><button class="ib sm" data-a="ib-read:${m.id}" title="${m.unread ? "Mark read" : "Mark unread"}">${ic(m.unread ? "mail-open" : "mail", 14)}</button><button class="ib sm" data-a="ib-done:${m.id}" title="Clear">${ic("check", 14)}</button></span>
        <span class="ibx-time">${m.time}</span>${m.unread ? '<span class="unread-dot"></span>' : '<span class="dot-gap"></span>'}</div>`;
    };
    const nItems = nt === "new" ? open.filter(m => m.unread) : open;
    W.notes = () => card("Notifications",
      tabs("ibx-n", nt, [["new", "New", unread], ["all", "All", open.length]]),
      unread ? `<button class="ib sm" data-a="readall" title="Mark all read">${ic("check-check", 14)}</button>` : "",
      list(nItems, noteRow, "ibx-n:all", empty("sparkles", nt === "new" ? "No new notifications." : "You're all caught up.")) + (cleared ? `<button class="ibx-more" data-a="ib-restore">Restore ${cleared} cleared</button>` : ""));

    // projects: one row each with progress, open ToDos, next milestone and target
    // dates carry no year, so an end far in the past (e.g. January) means next year
    const msOf = p => (p.project.milestones || []).map(m => ({ m, p, dd: (d => d < -180 ? d + 365 : d)(dayDiff(m.end)) })).filter(x => x.dd >= 0);
    const projRows = projects().map(p => {
      const pct = projProgress(p), ms = msOf(p).sort((a, b) => a.dd - b.dd)[0], n = deepItems(p.id, ["todo"]).filter(i => !i.x.done).length;
      return `<div class="ibx-prow" data-a="openfolder:${p.id}"><span class="ibx-pname">${folderIcon(p, 15)}<span>${esc(p.name)}</span></span>
        <span class="ibx-pbar"><span class="bar"><span style="width:${pct}%"></span></span>${mono(pct + "%")}</span>
        <span class="ibx-pc">${n} open</span><span class="ibx-pc">${ms ? `${esc(ms.m.name)} · ${dueLabel(ms.dd).toLowerCase()}` : "No milestone"}</span>${mono(esc(p.project.target || "–"))}</div>`;
    }).join("");
    W.projects = () => card("Projects", "", link("go:plan/timelines", "Timeline"),
      projRows ? `<div class="ibx-list">${projRows}</div>` : empty("folder-kanban", "No project folders yet. Turn a folder into a project in its settings."));

    const allMs = projects().flatMap(msOf).sort((a, b) => a.dd - b.dd);
    W.milestones = () => card("Milestones", "", link("go:plan/timelines", "Timeline"),
      list(allMs, ({ m, p, dd }) => `<div class="ibx-row" data-a="openfolder:${p.id}"><span class="ibx-ico">${ic("flag", 14)}</span><span class="ibx-txt"><span class="ibx-t">${esc(m.name)}</span><span class="ibx-s">${esc(p.name)}</span></span><span class="ibx-due">${dueLabel(dd)}</span></div>`, "go:plan/timelines", empty("flag", "No upcoming milestones.")));

    // next 14 days: one column per day, a dot per ToDo due (up to 4)
    const days = Array.from({ length: 14 }, (_, d) => ({ d, n: openT.filter(x => x.dd === d).length, wd: "MTWTFSS"[(TODAY_IDX + d) % 7] }));
    W.days = () => card("Next 14 days", "", `<span class="label-mono">${days.reduce((s, x) => s + x.n, 0)} due</span>`,
      `<div class="ibx-pad"><div class="ibx-dots">${days.map(x => `<div class="col${x.d === 0 ? " now" : ""}" title="${x.n} due ${x.d === 0 ? "today" : "in " + x.d + "d"}"><em>${x.n || ""}</em>${[3, 2, 1, 0].map(k => `<i class="${k < x.n ? "on" : ""}"></i>`).join("")}<b>${x.wd}</b></div>`).join("")}</div></div>`);

    // the week: hours per day and flashcard progress
    const myHours = [0, 1, 2, 3, 4, 5, 6].map(d => D.timeEntries.reduce((s, e) => s + e.hours[d], 0));
    const maxH = Math.max(4, ...myHours), totalH = myHours.reduce((a, b) => a + b, 0);
    W.time = () => card("Time this week", "", link("go:plan/time", "Time sheet"),
      `<div class="ibx-wk"><div class="ibx-big">${totalH}h<small>${(totalH / Math.max(1, TODAY_IDX + 1)).toFixed(1)}h per day</small></div>
        <div class="ibx-bars">${myHours.map((h, d) => `<div class="b${d === TODAY_IDX ? " now" : ""}" title="${h}h"><span class="${h ? "" : "zero"}" style="height:${Math.max(6, h / maxH * 100)}%"></span><b>${"MTWTFSS"[d]}</b></div>`).join("")}</div></div>`);
    const cards = D.decks.flatMap(d => d.cards), known = cards.filter(c => c.known).length, studyMin = D.studyMinutes.reduce((a, b) => a + b, 0);
    const pctKnown = cards.length ? Math.round(known / cards.length * 100) : 0;
    W.learn = () => card("Learning", "", link("go:wiki/flashcards", "Study"),
      `<div class="ibx-wk"><div class="ibx-big">${pctKnown}%<small>mastered</small></div>
        <div class="ibx-kvs"><span class="bar"><span style="width:${pctKnown}%"></span></span><div class="ibx-kv"><span>Cards known</span>${mono(known + " / " + cards.length)}</div><div class="ibx-kv"><span>Studied this week</span>${mono(studyMin + " min")}</div></div></div>`);

    // greeting and tiles sit on the page, everything else in a card
    const plain = ["greeting", "summary"];
    const shown = S.ibx.filter(w => w.on);
    const body = shown.map(w => `<section class="ibx-w${plain.includes(w.id) ? " plain" : " ibx-card"}${IBX_FIXED.includes(w.id) || w.size === "full" ? " full" : ""}" id="ibx-w-${w.id}">${W[w.id]()}</section>`).join("");
    return header("Inbox", { lead: ic("inbox", 16, "var(--text-secondary)"), actions: `<button class="btn sm ghost" data-a="ibx-custom">${ic("sliders-horizontal", 13)}Customize</button>` }) + `<div class="scroll"><div class="home ibx">
      ${shown.length ? `<div class="ibx-grid">${body}</div>` : `<div class="ibx-card">${empty("layout-dashboard", `Your Inbox is empty. <button class="ibx-st" data-a="ibx-custom">Choose what to show</button>`)}</div>`}
    </div></div>`;
  }
  // Customize dialog: show/hide, order (up/down) and width per widget, plus rows per list
  function ibxCustomHtml() {
    const seg = (cur, list, a) => `<div class="ibc-seg">${list.map(([k, label]) => `<button class="tab${cur === k ? " active" : ""}" data-a="${a}${k}">${label}</button>`).join("")}</div>`;
    const rows = S.ibx.map((w, i) => {
      const [label, desc, icon] = IBX_W[w.id], last = i === S.ibx.length - 1;
      return `<div class="ibc-row${w.on ? "" : " off"}">
        <span class="ibc-move"><button class="ib sm" data-a="ibc-move:${i}|-1" title="Move up"${i ? "" : " disabled"}>${ic("chevron-up", 14)}</button><button class="ib sm" data-a="ibc-move:${i}|1" title="Move down"${last ? " disabled" : ""}>${ic("chevron-down", 14)}</button></span>
        <span class="ibx-ico">${ic(icon, 14)}</span>
        <div class="l"><b>${label}</b><span>${desc}</span></div>
        ${IBX_FIXED.includes(w.id) ? "" : seg(w.size, [["half", "Half"], ["full", "Full"]], `ibc-size:${i}|`)}
        <button class="switch${w.on ? " on" : ""}" data-a="ibc-on:${i}" role="switch" aria-checked="${w.on}" aria-label="Show ${label}"></button></div>`;
    }).join("");
    return `<div class="dialog ibc" role="dialog" aria-modal="true">
      <div class="dh"><span style="font:var(--type-heading)">Customize Inbox</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db"><p class="ibc-hint">Pick what the Inbox shows, in which order and how wide. Half-width widgets sit side by side.</p>
        <div class="ibc-list">${rows}</div>
        <div class="ibc-row ibc-opt"><div class="l"><b>Rows per list</b><span>How many ToDos, notifications and milestones a card shows before “Show all”.</span></div>${seg(S.ibxRows, [[4, "4"], [6, "6"], [10, "10"]], "ibc-rows:")}</div></div>
      <div class="df"><button class="btn ghost" data-a="ibc-reset">${ic("rotate-ccw", 13)}Reset to default</button><span style="flex:1"></span><button class="btn primary" data-a="close">Done</button></div></div>`;
  }
  // save, redraw the page behind, then the dialog in place (keeping its scroll)
  function ibxSave() {
    store.set("ibxLayout", S.ibx); store.set("ibxRows", S.ibxRows); render();
    if (!layer) return;
    const db = layer.querySelector(".db"), top = db ? db.scrollTop : 0;
    layer.innerHTML = ibxCustomHtml(); layer.firstElementChild.style.animation = "none";
    layer.querySelector(".db").scrollTop = top;
  }
  /* ---------- Work: notes, canvas, stickies ---------- */
  const STICKY_COLORS = { amber: ["var(--warning-soft)", "var(--warning)"], green: ["var(--success-soft)", "var(--success)"], blue: ["var(--info-soft)", "var(--info)"], violet: ["var(--violet-900)", "var(--violet-500)"], red: ["var(--danger-soft)", "var(--danger)"] };
  // Notes: overview of all notes as cards; a single note opens full width (no list column)
  function viewNotes(id) {
    const note = id && D.notes.find(n => n.id === id);
    const newBtn = `<button class="btn sm primary" data-a="note-add">${ic("plus", 13)}New note</button>`;
    const ago = u => u === "now" ? "just now" : u + " ago";
    if (!note) { // collection overview: title block + table of notes
      const list = S.notesLabel ? D.notes.filter(n => (n.labels || []).includes(S.notesLabel)) : D.notes;
      const words = n => (n.body.trim() ? n.body.trim().split(/\s+/).length : 0);
      const labels = n => (n.labels || []).length
        ? n.labels.map(l => `<span class="dot" style="background:${D.labels[l]}"></span>${esc(l)}`).join('<span style="color:var(--text-tertiary)">,</span> ')
        : `${ic("tag", 13)}Select labels`;
      const rows = list.map(n => `<div class="coll-row" data-a="go:work/notes/${n.id}" data-drag="note:${n.id}" draggable="true">
          <span class="coll-name">${ic("file-text", 16, "var(--text-secondary)")}<span>${esc(n.title || "Untitled")}</span>${n.starred ? ic("star", 12, "var(--warning)") : ""}</span>
          <span>${folderChip("note", n)}</span>
          <span class="mono">${words(n)}</span>
          <span><span class="chip${(n.labels || []).length ? "" : " is-empty"}" data-a="note-labels:${n.id}">${labels(n)}</span></span>
          <span style="color:var(--text-secondary)">${ago(n.updated)}</span>
          <button class="ib sm" data-a="imenu:note|${n.id}" title="More">${ic("ellipsis", 14)}</button></div>`).join("");
      return header("Notes", { lead: ic("notebook-pen", 16, "var(--text-secondary)"), actions: `<button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button><button class="ib" data-a="notes-more" title="More">${ic("ellipsis")}</button>` }) +
        `<div class="scroll"><div class="coll">
          <div class="coll-head"><span class="coll-icon">${ic("notebook-pen", 24)}</span><h1>Notes</h1><span class="chip" style="cursor:default">${ic("lock", 12)}Private</span><span class="spacer"></span>
            <span class="split-btn"><button class="btn primary" data-a="note-add">New note</button><button class="btn primary" data-a="note-new-menu" title="More ways to create">${ic("chevron-down", 14)}</button></span>
            <button class="ib coll-filter${S.notesLabel ? " on" : ""}" data-a="notes-filter" title="Filter by label">${ic("list-filter")}</button></div>
          <p class="coll-desc">Your personal notes. Only you can see this collection${S.notesLabel ? ` · filtered by <b>${esc(S.notesLabel)}</b>` : ""}.</p>
          ${list.length ? `<div class="coll-table"><div class="coll-row head"><span>Page name</span><span>Folder</span><span>Words</span><span>Labels</span><span>Last activity</span><span></span></div>${rows}</div>`
            : emptyState("notebook-pen", S.notesLabel ? "No notes with this label" : "No notes yet", S.notesLabel ? "Clear the filter to see all notes." : "Notes are quick, private documents. Capture an idea before it becomes a work item.", `<button class="btn primary" data-a="${S.notesLabel ? "notes-clear" : "note-add"}">${S.notesLabel ? "Clear filter" : "New note"}</button>`)}
        </div></div>`;
    }
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:work/notes">Notes</span> <span class="crumb-sep">›</span> <span data-note-title="${note.id}">${esc(note.title || "Untitled")}</span>`, { lead: ic("notebook-pen", 16, "var(--text-secondary)"),
      actions: `${folderChip("note", note)}<button class="ib" data-a="star:note|${note.id}" title="${note.starred ? "Unstar" : "Star"}">${ic("star", 16, note.starred ? "var(--warning)" : "")}</button><button class="ib" data-a="note-del:${note.id}" title="Move to trash">${ic("trash-2")}</button>${newBtn}` }) +
      `<div class="scroll"><div class="doc"><h1 class="editable" contenteditable="true" data-edit="note-title:${note.id}" data-ph="Untitled">${esc(note.title)}</h1><div class="label-mono" style="margin:6px 0 18px">Edited ${note.updated === "now" ? "just now" : note.updated + " ago"}</div>
        <p class="editable note-body" contenteditable="true" data-edit="note-body:${note.id}" data-ph="Start writing…">${esc(note.body)}</p></div></div>`;
  }
  // canvas boards: the board in the route, else the first one; item helpers search every board
  const curBoard = () => { const p = S.route.split("/"); return (p[1] === "canvas" && D.canvases.find(b => b.id === p[2])) || D.canvases[0]; };
  const boardOf = id => D.canvases.find(b => b.items.some(c => c.id === id));
  const cvFind = id => { const b = boardOf(id); return b && b.items.find(c => c.id === id); };
  function viewCanvasOverview() {
    const count = (b, k) => b.items.filter(c => (c.kind || "card") === k).length;
    const rows = D.canvases.map(b => `<div class="coll-row c5" data-a="go:work/canvas/${b.id}" data-drag="canvas:${b.id}" draggable="true">
        <span class="coll-name">${ic("layout-dashboard", 16, "var(--text-secondary)")}<span>${esc(b.name)}</span>${b.starred ? ic("star", 12, "var(--warning)") : ""}</span>
        <span class="mono">${count(b, "card")}</span><span class="mono">${count(b, "sticky")}</span>
        <span style="color:var(--text-secondary)">${b.updated === "now" ? "just now" : (b.updated || "–") + (b.updated ? " ago" : "")}</span>
        <button class="ib sm" data-a="canvas-menu:${b.id}" title="More">${ic("ellipsis", 14)}</button></div>`).join("");
    return header("Canvas", { lead: ic("shapes", 16, "var(--text-secondary)"), actions: `<button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button>` }) +
      `<div class="scroll"><div class="coll">
        <div class="coll-head"><span class="coll-icon">${ic("shapes", 24)}</span><h1>Canvas</h1><span class="chip" style="cursor:default">${ic("lock", 12)}Private</span><span class="spacer"></span>
          <button class="btn primary" data-a="canvas-add">New canvas</button></div>
        <p class="coll-desc">Free-form boards for cards and stickies. Double-click a board to add a card.</p>
        ${D.canvases.length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Canvas name</span><span>Cards</span><span>Stickies</span><span>Last activity</span><span></span></div>${rows}</div>`
          : emptyState("shapes", "No canvases yet", "A canvas is a free-form board for cards and stickies.", `<button class="btn primary" data-a="canvas-add">New canvas</button>`)}
      </div></div>`;
  }
  function viewCanvas(id) {
    if (!id) return viewCanvasOverview();
    const board = D.canvases.find(b => b.id === id);
    if (!board) return header("Canvas") + emptyState("shapes", "Canvas not found", "It may have been deleted.", `<button class="btn" data-a="go:work/canvas">All canvases</button>`);
    const items = board.items.map(c => `<div class="cv-item${c.kind === "sticky" ? " sticky" : ""}" data-cv="${c.id}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px${c.kind === "sticky" ? `;background:${STICKY_COLORS[c.color || "amber"][0]};border-color:${STICKY_COLORS[c.color || "amber"][1]}` : ""}">
        <div class="cv-grip" title="Drag to move">${ic("grip-horizontal", 14)}<span class="spacer"></span><button class="ib sm" data-a="cv-del:${c.id}" title="Remove">${ic("x", 12)}</button></div>
        <div class="cv-text editable" contenteditable="true" data-edit="canvas:${c.id}" data-ph="Type something…">${esc(c.text)}</div></div>`).join("");
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:work/canvas">Canvas</span> <span class="crumb-sep">›</span> ${esc(board.name)}`, { lead: ic("shapes", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">Double-click to add a card · drag the handle to move</span>`,
      actions: `${folderChip("canvas", board)}<button class="ib" data-a="imenu:canvas|${board.id}" title="More">${ic("ellipsis")}</button><button class="btn sm" data-a="cv-add:sticky">${ic("sticky-note", 13)}Sticky</button><button class="btn sm primary" data-a="cv-add:card">${ic("square-plus", 13)}Card</button>` }) +
      `<div class="scroll canvas-wrap"><div class="canvas" id="canvas">${items}</div></div>`;
  }
  function viewStickies(selId) {
    const cards = D.stickies.map(s => { const c = STICKY_COLORS[s.color] || STICKY_COLORS.amber, f = folder(s.folder); return `<div class="sticky-card${s.id === selId ? " sel" : ""}" data-sticky="${s.id}" data-drag="sticky:${s.id}" style="background:${c[0]};border-color:${c[1]}">
        <div class="editable sticky-text" contenteditable="true" data-edit="sticky:${s.id}" data-ph="Write a sticky…">${esc(s.text)}</div>
        <div class="sticky-foot"><span class="chip sticky-folder${f ? "" : " is-empty"}" data-a="move:sticky|${s.id}" title="Move to folder">${ic(f ? "folder" : "folder-plus", 12)}${f ? esc(f.name) : "Folder"}</span><span class="spacer"></span><span class="mono" style="color:var(--text-tertiary);margin-right:4px">${s.updated}</span><button class="ib sm" data-a="sticky-color:${s.id}" title="Colour">${ic("palette", 13)}</button><button class="ib sm" data-a="sticky-del:${s.id}" title="Delete">${ic("trash-2", 13)}</button></div></div>`; }).join("");
    return header("Stickies", { lead: ic("sticky-note", 16, "var(--text-secondary)"), count: D.stickies.length, actions: `<button class="btn sm primary" data-a="sticky-add">${ic("plus", 13)}Add sticky</button>` }) +
      (D.stickies.length ? `<div class="scroll"><div class="stickies">${cards}</div></div>` : emptyState("sticky-note", "No stickies", "Stickies are quick personal notes. Jot something down before it becomes a work item.", `<button class="btn primary" data-a="sticky-add">Add sticky</button>`));
  }
  function viewWork(parts) {
    switch (parts[1]) {
      case "notes": return viewNotes(parts[2]);
      case "canvas": return viewCanvas(parts[2]);
      case "stickies": return viewStickies(parts[2]);
      default: return viewNotes();
    }
  }
  /* ---------- Learn: flashcards, practice, AI tutor ---------- */
  function viewFlashcards(deckId) {
    const deck = deckId && D.decks.find(x => x.id === deckId);
    if (!deck) { // deck overview
      const rows = D.decks.map(k => `<div class="coll-row c5" data-a="study:${k.id}" data-drag="deck:${k.id}" draggable="true">
          <span class="coll-name">${ic("gallery-vertical-end", 16, "var(--text-secondary)")}<span>${esc(k.name)}</span></span>
          <span class="mono">${k.cards.length}</span><span class="mono">${k.cards.filter(x => !x.known).length}</span>
          <span style="color:var(--text-secondary)">${k.last === "now" ? "just now" : k.last + " ago"}</span>
          <button class="ib sm" data-a="study:${k.id}" title="Study">${ic("play", 13)}</button></div>`).join("");
      return header("Flashcards", { lead: ic("gallery-vertical-end", 16, "var(--text-secondary)") }) +
        `<div class="scroll"><div class="coll">
          <div class="coll-head"><span class="coll-icon">${ic("gallery-vertical-end", 24)}</span><h1>Flashcards</h1><span class="spacer"></span>
            <button class="btn" data-a="go:wiki/practice">${ic("dumbbell", 14)}Practice</button></div>
          <p class="coll-desc">Decks built from your Learn pages. Flip a card, then mark whether you knew it.</p>
          ${D.decks.length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Deck</span><span>Cards</span><span>To learn</span><span>Last studied</span><span></span></div>${rows}</div>`
            : emptyState("gallery-vertical-end", "No decks yet", "Decks hold question and answer cards you study and practise.")}
        </div></div>`;
    }
    if (S.study.deck !== deck.id) S.study = { deck: deck.id, i: 0, flipped: false, good: 0 }; // opened from a folder or the sidebar
    const st = S.study, card = deck.cards[st.i], done = st.i >= deck.cards.length;
    const crumb = `<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:wiki/flashcards">Flashcards</span> <span class="crumb-sep">›</span> ${esc(deck.name)}`;
    const bar = `<div class="study-bar"><span style="width:${Math.min(st.i, deck.cards.length) / deck.cards.length * 100}%"></span></div>`;
    if (done) return header(crumb, { lead: ic("gallery-vertical-end", 16, "var(--text-secondary)") }) + bar +
      `<div class="empty">${ic("trophy", 44)}<h3>Deck finished</h3><p>You knew ${st.good} of ${deck.cards.length} cards. Cards you missed stay in “To learn”.</p>
        <div class="acts"><button class="btn" data-a="study:${deck.id}">${ic("rotate-ccw", 14)}Study again</button><button class="btn primary" data-a="go:wiki/practice/test">Take a test</button></div></div>`;
    return header(crumb, { lead: ic("gallery-vertical-end", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">${st.i + 1} / ${deck.cards.length}</span>` }) + bar +
      `<div class="scroll"><div class="study">
        <button class="flashcard${st.flipped ? " flipped" : ""}" data-a="flip" title="Flip  Space"><span class="fc-inner">
          <span class="fc-face fc-front"><span class="label-mono">Question</span><span class="fc-text">${esc(card.q)}</span><span class="fc-hint">Click or press Space to flip</span></span>
          <span class="fc-face fc-back"><span class="label-mono">Answer</span><span class="fc-text">${esc(card.a)}</span></span></span></button>
        <div class="study-acts${st.flipped ? "" : " hidden"}"><button class="btn" data-a="rate:again">${ic("repeat", 14)}Again ${kbd(["1"])}</button><button class="btn primary" data-a="rate:good">${ic("check", 14)}Knew it ${kbd(["2"])}</button></div>
      </div></div>`;
  }
  // practice: multiple choice built from every deck; wrong options are answers from other cards
  function practiceQuestions() {
    const all = D.decks.flatMap(k => k.cards.map(x => Object.assign({ deck: k.name }, x)));
    return all.map(x => {
      const wrong = all.filter(y => y.a !== x.a).sort(() => Math.random() - .5).slice(0, 3).map(y => y.a);
      return { q: x.q, a: x.a, deck: x.deck, options: wrong.concat(x.a).sort(() => Math.random() - .5) };
    }).sort(() => Math.random() - .5).slice(0, 6);
  }
  const LOG_KIND = { study: ["gallery-vertical-end", "Studied"], practice: ["clipboard-check", "Test"], braindump: ["brain", "Brain dump"] };
  function viewPracticeHome() {
    const recent = D.learnLog.filter(l => l.type !== "study").slice(0, 5).map(l => `<div class="lg-row">${ic(LOG_KIND[l.type][0], 14, "var(--text-secondary)")}<span class="lg-t">${LOG_KIND[l.type][1]} · ${esc(l.deck)}</span><span class="mono">${l.score}/${l.total}</span><span class="lg-when">${l.when === "now" ? "just now" : l.when + " ago"}</span></div>`).join("");
    const mode = (route, icon, title, text, meta) => `<button class="mode-card" data-a="go:${route}"><span class="mode-icon">${ic(icon, 22)}</span><span class="mode-t">${title}</span><span class="mode-d">${text}</span><span class="mode-meta">${meta}${ic("arrow-right", 14)}</span></button>`;
    const cards = D.decks.reduce((s, k) => s + k.cards.length, 0);
    return header("Practice", { lead: ic("dumbbell", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="coll">
      <div class="coll-head"><span class="coll-icon">${ic("dumbbell", 24)}</span><h1>Practice</h1></div>
      <p class="coll-desc">Check what you really know. Pick a mode — both use the cards from your ${D.decks.length} decks.</p>
      <div class="modes">
        ${mode("wiki/practice/test", "clipboard-check", "Test", "Six multiple-choice questions drawn from all decks. Instant feedback after each answer.", `6 questions · ${cards} cards in the pool`)}
        ${mode("wiki/practice/braindump", "brain", "Brain dump", "Write down everything you remember about one deck. We check which answers you recalled on your own.", `Free recall · ${D.decks.length} decks`)}
      </div>
      <div class="card" style="margin-top:16px"><div class="an-title">Recent results</div>${recent || '<div class="none">No practice yet. Start a test or a brain dump.</div>'}</div>
    </div></div>`;
  }
  // brain dump: free recall for one deck, checked against the deck's answers
  const norm = s => s.toLowerCase().replace(/[^a-z0-9äöüß ]+/g, " ");
  const recalled = (text, answer) => { const t = norm(text), words = norm(answer).split(" ").filter(w => w.length > 1); return t.includes(norm(answer).trim()) || (words.length > 0 && words.every(w => t.includes(w))); };
  function viewBrainDump() {
    const b = S.dump, deck = D.decks.find(k => k.id === b.deck) || D.decks[0];
    const crumb = `<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:wiki/practice">Practice</span> <span class="crumb-sep">›</span> Brain dump`;
    if (!deck) return header(crumb, { lead: ic("brain", 16, "var(--text-secondary)") }) + emptyState("brain", "No decks yet", "A brain dump checks your recall against a deck. Create a deck first.", `<button class="btn" data-a="go:wiki/flashcards">Flashcards</button>`);
    const picker = D.decks.map(k => `<button class="${k.id === deck.id ? "on" : ""}" data-a="dump-deck:${k.id}">${esc(k.name)}</button>`).join("");
    let result = "";
    if (b.result) {
      const hits = deck.cards.filter(x => recalled(b.result, x.a)).length;
      result = `<div class="card dump-result"><div class="an-title">You recalled ${hits} of ${deck.cards.length}</div>
        ${deck.cards.map(x => { const ok = recalled(b.result, x.a); return `<div class="lg-row">${ic(ok ? "circle-check" : "circle-dashed", 15, ok ? "var(--success)" : "var(--text-tertiary)")}<span class="lg-t">${esc(x.q)}</span><span style="color:${ok ? "var(--text-primary)" : "var(--text-tertiary)"}">${esc(x.a)}</span></div>`; }).join("")}
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" data-a="dump-reset">${ic("rotate-ccw", 14)}Try again</button><button class="btn" data-a="study:${deck.id}">${ic("gallery-vertical-end", 14)}Study this deck</button></div></div>`;
    }
    return header(crumb, { lead: ic("brain", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="study">
      <div class="seg dump-decks">${picker}</div>
      <div class="pr-q"><span class="label-mono">${esc(deck.name)} · ${deck.cards.length} facts</span><h2>Write down everything you remember about ${esc(deck.name)}.</h2></div>
      <textarea id="dump-text" class="dump-text" placeholder="Facts, numbers, names — one per line or as a paragraph…"${b.result ? " disabled" : ""}>${esc(b.text)}</textarea>
      ${b.result ? result : `<div style="display:flex;align-items:center;gap:10px"><span class="mono" style="color:var(--text-tertiary)">${b.text.trim() ? b.text.trim().split(/\s+/).length : 0} words</span><span style="flex:1"></span><button class="btn primary" data-a="dump-check">${ic("check", 14)}Check my recall</button></div>`}
    </div></div>`;
  }
  function viewPractice() {
    if (!D.decks.some(k => k.cards.length)) return header("Test", { lead: ic("clipboard-check", 16, "var(--text-secondary)") }) + emptyState("clipboard-check", "No cards to test", "Tests draw their questions from your decks. Add cards to a deck first.", `<button class="btn" data-a="go:wiki/flashcards">Flashcards</button>`);
    const p = S.practice || (S.practice = { qs: practiceQuestions(), i: 0, picked: null, score: 0 });
    const head = header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:wiki/practice">Practice</span> <span class="crumb-sep">›</span> Test`, { lead: ic("clipboard-check", 16, "var(--text-secondary)"), mid: p.i < p.qs.length ? `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">Question ${p.i + 1} of ${p.qs.length} · ${p.score} correct</span>` : "",
      actions: `<button class="btn sm" data-a="practice-restart">${ic("rotate-ccw", 13)}New round</button>` });
    const bar = `<div class="study-bar"><span style="width:${p.i / p.qs.length * 100}%"></span></div>`;
    if (p.i >= p.qs.length) return head + bar + `<div class="empty">${ic("trophy", 44)}<h3>${p.score} of ${p.qs.length} correct</h3><p>${p.score === p.qs.length ? "Perfect round." : "Review the cards you missed in Flashcards, then try another round."}</p>
      <div class="acts"><button class="btn" data-a="go:wiki/flashcards">Flashcards</button><button class="btn primary" data-a="practice-restart">New round</button></div></div>`;
    const q = p.qs[p.i], answered = p.picked !== null;
    const opts = q.options.map((o, n) => { const cls = !answered ? "" : o === q.a ? " right" : n === p.picked ? " wrong" : " dim";
      return `<button class="pr-opt${cls}" data-a="pick:${n}"${answered ? " disabled" : ""}><span class="pr-key">${"ABCD"[n]}</span><span>${esc(o)}</span>${answered && o === q.a ? ic("check", 16, "var(--success)") : answered && n === p.picked ? ic("x", 16, "var(--danger)") : ""}</button>`; }).join("");
    return head + bar + `<div class="scroll"><div class="study">
      <div class="pr-q"><span class="label-mono">${esc(q.deck)}</span><h2>${esc(q.q)}</h2></div>
      <div class="pr-opts">${opts}</div>
      ${answered ? `<div class="pr-feedback ${q.options[p.picked] === q.a ? "ok" : "bad"}">${q.options[p.picked] === q.a ? "Correct." : "Not quite — the answer is highlighted."}<span class="spacer"></span><button class="btn primary" data-a="practice-next">${p.i + 1 < p.qs.length ? "Next question" : "See result"}</button></div>` : ""}
    </div></div>`;
  }
  // AI tutor: local, rule-based explanations drawn from Learn pages and decks
  function tutorAnswer(q) {
    const s = q.toLowerCase();
    if (/quiz|test|practice|abfrag/.test(s)) return `Let's practise. I've prepared a round of questions from your decks — <a href="#" data-a="go:wiki/practice/test">start the test</a>.`;
    const page = D.pages.find(p => s.includes(p.title.toLowerCase()) || p.title.toLowerCase().split(" ").some(w => w.length > 4 && s.includes(w)));
    if (page) return `<b>${esc(page.title)}</b><br>${page.body.map(esc).join("<br>")}<br><br>Want me to quiz you on this? Ask “quiz me”.`;
    const card = D.decks.flatMap(k => k.cards).find(x => x.q.toLowerCase().split(/\W+/).some(w => w.length > 4 && s.includes(w)));
    if (card) return `${esc(card.q)} — <b>${esc(card.a)}</b>.`;
    return `I can explain anything from your Learn pages (${D.pages.map(p => esc(p.title)).join(", ")}) or quiz you on your decks. What would you like to learn?`;
  }
  // learning history: finished flashcard decks and practice rounds (newest first); today counts toward study time
  function logLearning(type, deck, score, total) {
    D.learnLog.unshift({ type, deck, score, total, when: "now" });
    D.studyMinutes[TODAY_IDX] += type === "study" ? total : Math.ceil(total * 1.5);
  }
  function viewProgress() {
    const cards = D.decks.flatMap(k => k.cards), known = cards.filter(x => x.known).length;
    const pr = D.learnLog.filter(l => l.type === "practice"), acc = pr.length ? Math.round(pr.reduce((s, l) => s + l.score, 0) / pr.reduce((s, l) => s + l.total, 0) * 100) : 0;
    const week = D.studyMinutes.reduce((a, b) => a + b, 0), max = Math.max(1, ...D.studyMinutes);
    let streak = 0; for (let n = TODAY_IDX; n >= 0 && D.studyMinutes[n] > 0; n--) streak++;
    const stat = (v, k, icon) => `<div class="stat"><div style="display:flex;justify-content:space-between;align-items:center"><span class="v">${v}</span>${ic(icon, 16, "var(--text-tertiary)")}</div><div class="k">${k}</div></div>`;
    const mastery = D.decks.map(k => { const kn = k.cards.filter(x => x.known).length, pct = Math.round(kn / k.cards.length * 100);
      return `<div class="an-row" title="${esc(k.name)}: ${kn} of ${k.cards.length} cards known"><span class="an-lbl">${ic("gallery-vertical-end", 13)}${esc(k.name)}</span><span class="an-track"><span class="an-bar" style="width:${pct}%"></span></span><span class="an-v">${pct}%</span></div>`; }).join("");
    const days = WEEKDAYS.map((w, n) => `<div class="wk-col${n === TODAY_IDX ? " today" : ""}" title="${w}: ${D.studyMinutes[n]} min"><span class="wk-v">${D.studyMinutes[n] || ""}</span><span class="wk-track"><span class="wk-bar" style="height:${D.studyMinutes[n] / max * 100}%"></span></span><span class="wk-d">${w}</span></div>`).join("");
    const log = D.learnLog.slice(0, 8).map(l => `<div class="lg-row">${ic(LOG_KIND[l.type][0], 14, "var(--text-secondary)")}<span class="lg-t">${LOG_KIND[l.type][1]} · ${esc(l.deck)}</span><span class="mono">${l.score}/${l.total}</span><span class="lg-when">${l.when === "now" ? "just now" : l.when + " ago"}</span></div>`).join("");
    return header("Track & progress", { lead: ic("trending-up", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="home">
      <div class="stats">${stat(known + "/" + cards.length, "Cards mastered", "check")}${stat(acc + "%", "Practice accuracy", "target")}${stat(week + " min", "Studied this week", "timer")}${stat(streak + (streak === 1 ? " day" : " days"), "Current streak", "flame")}</div>
      <div class="an-grid">
        <div class="card"><div class="an-title">Mastery by deck</div><div class="an-bars">${mastery}</div>
          <div style="margin-top:14px;display:flex;gap:8px"><button class="btn sm" data-a="go:wiki/flashcards">${ic("gallery-vertical-end", 13)}Study</button><button class="btn sm" data-a="go:wiki/practice">${ic("dumbbell", 13)}Practice</button></div></div>
        <div class="card"><div class="an-title">Study time this week <span class="mono" style="color:var(--text-tertiary);font-weight:400">minutes</span></div><div class="wk">${days}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="an-title">Recent activity</div>${log || '<div class="none">No sessions yet. Finish a deck or a practice round to see it here.</div>'}</div>
    </div></div>`;
  }
  function viewTutorHome() {
    const mode = (route, icon, title, text, meta) => `<button class="mode-card" data-a="go:${route}"><span class="mode-icon">${ic(icon, 22)}</span><span class="mode-t">${title}</span><span class="mode-d">${text}</span><span class="mode-meta">${meta}${ic("arrow-right", 14)}</span></button>`;
    const asked = D.tutorLog.filter(m => m.me).slice(-4).reverse().map(m => `<div class="lg-row">${ic("message-square", 14, "var(--text-secondary)")}<span class="lg-t">${esc(m.text)}</span><button class="btn sm ghost" data-a="tutor-ask:${esc(m.text)}">Ask again</button></div>`).join("");
    return header("AI Tutor", { lead: ic("graduation-cap", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="coll">
      <div class="coll-head"><span class="coll-icon">${ic("graduation-cap", 24)}</span><h1>AI Tutor</h1></div>
      <p class="coll-desc">Learn with a tutor that knows your ${D.pages.length} Learn pages and ${D.decks.length} decks.</p>
      <div class="modes">
        ${mode("wiki/tutor/chat", "messages-square", "Conversation mode", "Ask questions in your own words and get explanations from your Learn pages. Say “quiz me” to switch to a test.", `${D.tutorLog.filter(m => m.me).length} questions asked`)}
        ${mode("wiki/tutor/summary", "scroll-text", "Summary", "Pick a page or a deck and get its key points on one screen — ready to save as a note.", `${D.pages.length + D.decks.length} sources`)}
      </div>
      <div class="card" style="margin-top:16px"><div class="an-title">Recent questions</div>${asked || '<div class="none">No questions yet. Start a conversation.</div>'}</div>
    </div></div>`;
  }
  // summary: key points of one Learn page or deck (local, sentence-based)
  function summarySource(src) {
    const [kind, id] = (src || "").split(":");
    if (kind === "deck") { const k = D.decks.find(x => x.id === id); if (k) return { id: k.id, title: k.name, kind: "Deck", icon: "gallery-vertical-end", points: k.cards.map(x => `${x.q.replace(/\?$/, "")}: ${x.a}`) }; }
    const p = D.pages.find(x => x.id === id) || D.pages[0];
    if (!p) { const k = D.decks[0]; return k ? summarySource("deck:" + k.id) : null; }
    return { title: p.title, kind: "Page", icon: p.icon, points: p.body.join(" ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) };
  }
  function viewSummary() {
    const src = S.summary, s = summarySource(src);
    if (!s) return header("Summary", { lead: ic("scroll-text", 16, "var(--text-secondary)") }) + emptyState("scroll-text", "Nothing to summarise", "Summaries are built from your Learn pages and decks.");
    const opt = (key, icon, label) => `<button class="src-opt${key === src ? " on" : ""}" data-a="summary-src:${key}">${ic(icon, 14)}<span>${esc(label)}</span></button>`;
    const words = s.points.join(" ").split(/\s+/).length;
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:wiki/tutor">AI Tutor</span> <span class="crumb-sep">›</span> Summary`, { lead: ic("scroll-text", 16, "var(--text-secondary)") }) +
      `<div class="split"><div class="list-pane src-pane"><div class="scroll">
        <div class="label-mono" style="padding:14px 12px 6px">Pages</div>${D.pages.map(p => opt("page:" + p.id, p.icon, p.title)).join("")}
        <div class="label-mono" style="padding:14px 12px 6px">Decks</div>${D.decks.map(k => opt("deck:" + k.id, "gallery-vertical-end", k.name)).join("")}
      </div></div><div class="detail"><div class="doc">
        <div class="label-mono" style="margin-bottom:8px">${s.kind} summary · ${s.points.length} key points · ~${Math.max(1, Math.round(words / 200))} min read</div>
        <h1 style="font:var(--type-title);font-size:24px">${esc(s.title)}</h1>
        <ul class="sum-points">${s.points.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px">
          <button class="btn primary" data-a="summary-note">${ic("save", 14)}Save as note</button>
          <button class="btn" data-a="tutor-ask:Explain ${esc(s.title)}">${ic("messages-square", 14)}Discuss with tutor</button>
          ${s.kind === "Deck" ? `<button class="btn" data-a="study:${s.id}">${ic("gallery-vertical-end", 14)}Study deck</button>` : ""}
        </div></div></div></div>`;
  }
  function viewTutor() {
    const sug = ["Explain the design system", "How does our team process work?", "Quiz me"];
    const inner = D.tutorLog.length ? D.tutorLog.map(m => `<div class="bubble ${m.me ? "me" : "ai"}">${m.me ? esc(m.text) : m.text}</div>`).join("")
      : `<div class="empty" style="padding-top:12vh">${ic("graduation-cap", 40)}<h3>Your AI tutor</h3><p>Ask for an explanation of any Learn page, or let the tutor quiz you on your flashcards.</p><div class="suggest">${sug.map(x => `<button class="chip" data-a="tutor-ask:${x}">${esc(x)}</button>`).join("")}</div></div>`;
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:wiki/tutor">AI Tutor</span> <span class="crumb-sep">›</span> Conversation mode`, { lead: ic("messages-square", 16, "var(--text-secondary)"), actions: D.tutorLog.length ? `<button class="btn sm ghost" data-a="tutor-clear">${ic("eraser", 13)}Clear</button>` : "" }) +
      `<div class="chat"><div class="log" id="chatlog"><div class="inner">${inner}</div></div>
      <div class="composer"><div class="box"><textarea id="tutor-prompt" rows="1" placeholder="Ask your tutor…"></textarea><button class="ib round" data-a="tutor-send" title="Send  ⏎" style="background:var(--accent);color:var(--on-accent)">${ic("arrow-up")}</button></div></div></div>`;
  }
  function tutorAsk(text) { if (!text.trim()) return; if (S.route !== "wiki/tutor/chat") go("wiki/tutor/chat"); D.tutorLog.push({ me: true, text }, { me: false, text: tutorAnswer(text) }); render(); setTimeout(() => { const p = document.getElementById("tutor-prompt"); p && p.focus(); }); }
  function viewWiki(parts) {
    if (parts[1] === "flashcards") return viewFlashcards(parts[2]);
    if (parts[1] === "practice") return parts[2] === "test" ? viewPractice() : parts[2] === "braindump" ? viewBrainDump() : viewPracticeHome();
    if (parts[1] === "tutor") return parts[2] === "chat" ? viewTutor() : parts[2] === "summary" ? viewSummary() : viewTutorHome();
    if (parts[1] === "progress") return viewProgress();
    const p = D.pages.find(x => x.id === parts[1]) || D.pages[0];
    if (!p) return header("Learn") + emptyState("book-open", "No pages yet", "Learn pages hold what you study.");
    return header(`<span style="color:var(--text-secondary);font-weight:500">Learn</span> <span class="crumb-sep">›</span> ${esc(p.title)}`, { actions: `${folderChip("page", p)}<button class="ib" data-a="star:page|${p.id}" title="${p.starred ? "Unstar" : "Star"}">${ic("star", 16, p.starred ? "var(--warning)" : "")}</button><button class="ib" data-a="imenu:page|${p.id}" title="More">${ic("ellipsis")}</button>` }) +
      `<div class="scroll"><div class="doc"><div style="margin-bottom:10px">${ic(p.icon, 28, "var(--text-tertiary)")}</div>
        <h1 class="editable" contenteditable="true" data-edit="page-title:${p.id}" data-ph="Untitled">${esc(p.title)}</h1>
        <div class="label-mono" style="margin:6px 0 18px">Edited by ${esc(D.me)} · 2h</div>
        ${p.body.map((t, n) => `<p class="editable" contenteditable="true" data-edit="page-body:${p.id}:${n}" data-ph="Write something…">${esc(t)}</p>`).join("")}
      </div></div>`;
  }
  function viewAI(parts) {
    const chat = D.chats.find(c => c.id === parts[1]);
    const log = chat ? chat.log : [];
    const sug = ["Summarise this week", "What is overdue?", "Draft release notes", "What is open per folder?"];
    const inner = log.length ? log.map(m => `<div class="bubble ${m.me ? "me" : "ai"}">${m.me ? esc(m.text) : m.text}</div>`).join("")
      : `<div class="empty" style="padding-top:12vh">${ic("sparkles", 40)}<h3>Ask about your workspace</h3><p>AI reads your work items, projects and wiki pages. Answers stay inside ${esc(D.workspace.name)}.</p><div class="suggest">${sug.map(s => `<button class="chip" data-a="ask:${s}">${esc(s)}</button>`).join("")}</div></div>`;
    return header(chat ? esc(chat.title) : "New chat", { lead: ic("sparkles", 16, "var(--text-secondary)"), actions: chat ? `${folderChip("chat", chat)}<button class="ib" data-a="imenu:chat|${chat.id}" title="More">${ic("ellipsis")}</button>` : "" }) +
      `<div class="chat"><div class="log" id="chatlog"><div class="inner">${inner}</div></div>
      <div class="composer"><div class="box"><textarea id="prompt" rows="1" placeholder="Ask anything…"></textarea><button class="ib round" data-a="send" title="Send  ⏎" style="background:var(--accent);color:var(--on-accent)">${ic("arrow-up")}</button></div></div></div>`;
  }
  const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const parseRange = d => { const [day, mon] = d.split(" "), m = MONTHS.indexOf(mon); return new Date(m < 6 ? 2027 : 2026, m, +day); };
  const WEEKDAYS = "Mon Tue Wed Thu Fri Sat Sun".split(" ");
  const TODAY_IDX = (TODAY.getDay() + 6) % 7; // weekday column of "today" in the time sheet
  const fmtH = h => (Math.round(h * 10) / 10).toString().replace(/\.0$/, "");
  const fmtClock = ms => { const s = Math.floor(ms / 1000); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":"); };
  function viewPlan(parts) {
    const page = { roadmap: "timelines" }[parts[1]] || parts[1] || "timelines";
    if (page === "timelines") {
      // grouped by folder (tree order): project milestones, then any number of the folder's own timelines;
      // a folder needs neither "Project" nor a target date to hold timelines, project folders always get a group
      const bars = f => (f && f.project && f.project.milestones || []).map(m => ({ ms: m, f, a: parseRange(m.start), b: parseRange(m.end) }))
        .concat(D.timelines.filter(x => (x.folder || null) === (f ? f.id : null)).map(x => ({ x, a: fromIso(x.start), b: addD(fromIso(x.end), 1) })));
      const order = [], walk = pid => kids(pid).forEach(f => { order.push(f); walk(f.id); }); walk(null);
      const groups = order.concat(null).map(f => ({ f, rows: bars(f) })).filter(g => g.rows.length || (g.f && g.f.project));
      // whole months around today and every bar, between 6 and 24 of them
      const all = groups.flatMap(g => g.rows), lo = new Date(Math.min(TODAY, ...all.map(r => r.a))), hi = new Date(Math.max(TODAY, ...all.map(r => r.b - 1)));
      const t0 = new Date(lo.getFullYear(), lo.getMonth(), 1), n = Math.min(24, Math.max(6, (hi.getFullYear() - t0.getFullYear()) * 12 + hi.getMonth() - t0.getMonth() + 1));
      const t1 = new Date(t0.getFullYear(), t0.getMonth() + n, 1), pct = d => Math.max(0, Math.min(100, (d - t0) / (t1 - t0) * 100));
      const months = Array.from({ length: n }, (_, i) => `<span>${MONTHS[(t0.getMonth() + i) % 12]}</span>`).join("");
      const today = `<span class="tl-today" style="left:${pct(TODAY)}%"></span>`;
      const row = r => { const a = pct(r.a), w = Math.max(pct(r.b) - a, .6), end = a > 75 ? " tl-end" : ""; // near the right edge the label sits left of the bar
        return r.ms ? `<div class="tl-row" data-a="openfolder:${r.f.id}"><span class="tl-name">${ic("flag", 13, "var(--text-tertiary)")}<span>${esc(r.ms.name)}</span></span><span class="tl-track"><span class="tl-bar${end}" style="left:${a}%;width:${w}%"><span class="tl-fill" style="width:${projProgress(r.f)}%"></span><span class="tl-lbl">${esc(r.ms.name)} · ${r.ms.end}</span></span>${today}</span></div>`
          : `<div class="tl-row" data-a="open:timeline|${r.x.id}" data-drag="timeline:${r.x.id}" draggable="true"><span class="tl-name">${ic("chart-gantt", 13, "var(--text-tertiary)")}<span>${esc(r.x.name)}</span></span><span class="tl-track"><span class="tl-bar${end}" style="left:${a}%;width:${w}%"><span class="tl-lbl">${esc(r.x.name)} · ${fmtShort(r.x.end)}</span></span>${today}</span></div>`; };
      const group = ({ f, rows }) => `<div class="tl-row tl-group"${f ? ` data-a="openfolder:${f.id}" data-drop="${f.id}"` : ""}><span class="tl-name">${f ? folderIcon(f, 14) : ic("folder-x", 14, "var(--text-tertiary)")}<span>${f ? esc(fpath(f.id).map(p => p.name).join(" / ")) : "No folder"}</span>${f && f.project ? `<span class="tl-tag">${ic("folder-kanban", 11)}Project${f.project.target ? " · " + esc(f.project.target) : ""}</span>` : ""}</span>
          <span class="tl-gact"><span class="mono">${rows.length || ""}</span><button class="btn sm ghost" data-a="newtimeline:${f ? f.id : ""}" title="Add a timeline to ${f ? esc(f.name) : "no folder"}">${ic("plus", 13)}Timeline</button></span></div>`
        + (rows.length ? rows.map(row).join("") : `<div class="tl-row tl-none"><span class="tl-name">No timelines yet</span><span class="tl-track">${today}</span></div>`);
      const acts = `<button class="btn sm" data-a="newtimeline">${ic("plus", 13)}New timeline</button><button class="btn sm primary" data-a="newproject">${ic("plus", 13)}New project</button>`;
      return header("Timelines", { lead: ic("chart-gantt", 16, "var(--text-secondary)"), actions: acts }) +
        (groups.length ? `<div class="scroll"><div class="tl"><div class="tl-row tl-head"><span class="tl-name label-mono">Folder</span><span class="tl-track tl-months" style="grid-template-columns:repeat(${n},1fr)">${months}</span></div>${groups.map(group).join("")}</div></div>`
          : emptyState("chart-gantt", "No timelines yet", "Add timelines to any folder — as many as you like. Project folders show their milestones here too.", `<button class="btn" data-a="newtimeline">New timeline</button><button class="btn primary" data-a="newproject">New project</button>`));
    }
    if (page === "horizons") {
      // one horizon page: its name, column names and subtitles are edited in place; columns scroll sideways once they no longer fit
      const pg = hzPage(parts[2]), n = pg.cols.length;
      const conf = { on: ["circle-check", "var(--success)", "On track"], risk: ["circle-alert", "var(--warning)", "At risk"], idea: ["circle-dashed", "var(--text-tertiary)", "Idea"] };
      const col = h => {
        const items = D.horizons.filter(x => x.page === pg.id && x.h === h.id);
        return `<div class="hz-col"><div class="hz-head"><span class="label-mono editable hz-name" contenteditable="true" data-edit="hz-col:${pg.id}:${h.id}" data-ph="Untitled" spellcheck="false">${esc(h.name)}</span><span class="mono" style="color:var(--text-tertiary)">${items.length}</span><button class="ib sm" data-a="hz-col-menu:${pg.id}|${h.id}" title="Column options">${ic("ellipsis", 14)}</button></div>
          <div class="hz-sub editable" contenteditable="true" data-edit="hz-sub:${pg.id}:${h.id}" data-ph="Add a subtitle…">${esc(h.sub || "")}</div>
          ${items.map(x => { const c = conf[x.conf] || conf.idea; return `<div class="hz-card" data-a="open:goal|${x.id}" data-drag="goal:${x.id}" draggable="true"><div class="hz-t">${esc(x.title)}</div>${x.desc ? `<div class="hz-d">${esc(x.desc)}</div>` : ""}<div class="hz-meta">${folderChip("goal", x)}<span class="chip">${ic(c[0], 13, c[1])}${c[2]}</span></div></div>`; }).join("")}
          <button class="hz-add" data-a="newgoal:${pg.id}|${h.id}">${ic("plus", 14)}Add goal</button></div>`;
      };
      const acts = `<button class="btn sm" data-a="hz-col-add:${pg.id}">${ic("plus", 13)}Column</button><button class="btn sm primary" data-a="newgoal:${pg.id}|">${ic("plus", 13)}New goal</button><button class="ib" data-a="hz-page-menu:${pg.id}" title="Page options">${ic("ellipsis")}</button>`;
      return header(`<span class="editable hz-title" contenteditable="true" data-edit="hz-page:${pg.id}" data-ph="Untitled">${esc(pg.name)}</span>`, { lead: ic("telescope", 16, "var(--text-secondary)"), actions: acts }) +
        `<div class="scroll"><div class="hz" style="grid-template-columns:repeat(${n},minmax(248px,1fr)) 180px;min-width:${n * 260 + 212}px">${pg.cols.map(col).join("")}
          <button class="hz-add hz-newcol" data-a="hz-col-add:${pg.id}">${ic("plus", 14)}Add column</button></div></div>`;
    }
    if (page === "time") {
      const t = S.timer, total = D.timeEntries.reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0);
      const dayTotals = WEEKDAYS.map((_, d) => D.timeEntries.reduce((s, e) => s + e.hours[d], 0));
      const head = `<div class="ts-row ts-head"><span>ToDo</span>${WEEKDAYS.map((w, d) => `<span class="${d === TODAY_IDX ? "today" : ""}">${w}</span>`).join("")}<span>Total</span></div>`;
      const rows = D.timeEntries.map(e => { const x = todo(e.todo); return `<div class="ts-row"><span class="ts-name" data-a="go:pin/todos"><span class="mono" style="color:var(--text-tertiary)">${esc((x && folderName(x.folder) || "–").slice(0, 14))}</span>${esc(x ? x.text : "Deleted ToDo")}</span>${e.hours.map((h, d) => `<span class="ts-h${d === TODAY_IDX ? " today" : ""}${h ? "" : " zero"}">${h ? fmtH(h) : "–"}</span>`).join("")}<span class="ts-h total">${fmtH(e.hours.reduce((a, b) => a + b, 0))}</span></div>`; }).join("");
      const foot = `<div class="ts-row ts-foot"><span>Total</span>${dayTotals.map((h, d) => `<span class="ts-h${d === TODAY_IDX ? " today" : ""}">${h ? fmtH(h) : "–"}</span>`).join("")}<span class="ts-h total">${fmtH(total)}</span></div>`;
      const timerBtn = t.running
        ? `<button class="btn sm" data-a="timer">${ic("square", 12, "var(--danger)")}Stop <span class="mono" id="timer-clock">${fmtClock(Date.now() - t.start)}</span></button>`
        : `<button class="btn sm primary" data-a="timer">${ic("play", 12)}Start timer</button>`;
      const cur = todo(t.todo);
      return header("Time tracking", { lead: ic("timer", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">Week of 12 Oct · ${fmtH(total)}h logged</span>`,
        actions: `<button class="chip" data-a="timer-todo">${ic("circle", 13)}${esc(cur ? cur.text.slice(0, 28) : "Pick a ToDo")}</button>${timerBtn}` }) +
        `<div class="scroll"><div class="ts">${head}${rows}${foot}</div></div>`;
    }
    if (page === "analytics") {
      // single-series bars (one hue = magnitude); values as direct labels in text ink, tooltip per bar
      const open = D.todos.filter(t => !t.done), tops = kids(null);
      const hoursIn = f => { const ids = new Set(subtreeIds(f.id)); return D.timeEntries.filter(e => { const x = todo(e.todo); return x && ids.has(x.folder); }).reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0); };
      const bars = (rows, unit) => { const max = Math.max(1, ...rows.map(r => r.v)); return `<div class="an-bars">${rows.map(r => `<div class="an-row" title="${esc(r.name)}: ${fmtH(r.v)}${unit}"><span class="an-lbl">${r.lead || ""}${esc(r.name)}</span><span class="an-track"><span class="an-bar" style="width:${r.v / max * 100}%"></span></span><span class="an-v">${fmtH(r.v)}${unit}</span></div>`).join("")}</div>`; };
      const totalH = D.timeEntries.reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0);
      return header("Analytics", { lead: ic("chart-column", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="home">
        <div class="stats">${stat(open.length, "Open ToDos", "circle")}${stat(D.todos.length - open.length, "Completed", "circle-check")}${stat(fmtH(totalH) + "h", "Logged this week", "timer")}${stat(open.filter(t => t.prio === 1).length, "Urgent and open", "circle-alert")}</div>
        <div class="an-grid">
          <div class="card"><div class="an-title">Open ToDos by folder</div>${bars(tops.map(f => ({ name: f.name, lead: folderIcon(f, 13), v: deepItems(f.id, ["todo"]).filter(i => !i.x.done).length })), "")}</div>
          <div class="card"><div class="an-title">Open ToDos by priority</div>${bars(D.priorities.slice(1).concat(D.priorities[0]).map(p => ({ name: p.name, lead: ic(p.icon, 13, p.color), v: open.filter(t => (t.prio || 0) === p.id).length })), "")}</div>
          <div class="card"><div class="an-title">Hours logged this week</div>${bars(tops.map(f => ({ name: f.name, lead: folderIcon(f, 13), v: hoursIn(f) })), "h")}</div>
        </div></div></div>`;
    }
    if (page === "calendar") return viewCalendar();
    return viewPlan(["plan", "timelines"]);
  }
  function viewFiles(parts) {
    if (parts[1] === "file") { // single file: preview placeholder + details (also for a file in the trash)
      const id = parts[2], live = find("file", id), tr = !live && D.trash.find(e => e.type === "file" && e.item.id === id), f = live || (tr && tr.item);
      if (!f) return header("Not found") + emptyState("file", "File not found", "It may have been moved or deleted.");
      const path = fpath(f.folder);
      const row = (k, v) => `<div class="box-row"><div class="l"><span>${k}</span></div><span style="color:var(--text-secondary)">${v}</span></div>`;
      return header(path.map(p => `<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="openfolder:${p.id}">${esc(p.name)}</span> <span class="crumb-sep">›</span> `).join("") + esc(f.name), { lead: ic(f.icon, 16, "var(--text-secondary)"),
        actions: tr ? `<button class="btn sm" data-a="trash-restore:${D.trash.indexOf(tr)}">${ic("rotate-ccw", 13)}Restore</button>`
          : `${folderChip("file", f)}<button class="ib" data-a="star:file|${f.id}" title="${f.starred ? "Unstar" : "Star"}">${ic("star", 16, f.starred ? "var(--warning)" : "")}</button><button class="ib" data-a="trash:file|${f.id}" title="Move to trash">${ic("trash-2")}</button><button class="btn sm" data-a="toast:Download started">${ic("download", 13)}Download</button>` }) +
        `<div class="scroll"><div class="set">${tr ? `<div class="trash-banner">${ic("trash-2", 15)}This file is in the trash. Restore it to use it again.</div>` : ""}<div class="file-preview">${ic(f.icon, 56, "var(--text-tertiary)")}<span>${esc(f.name)}</span></div>
          <div class="box">${row("Owner", `<span style="display:inline-flex;gap:6px;align-items:center">${av(f.owner, 18)}${esc(f.owner)}</span>`)}${row("Folder", path.length ? path.map(p => esc(p.name)).join(" / ") : "–")}${row("Modified", f.modified + " ago")}${row("Size", f.size)}${row("Sharing", f.shared ? "Shared with workspace" : "Only you")}</div></div></div>`;
    }
    if (!parts[1] || parts[1] === "folders") return viewAllFolders();
    const page = parts[1];
    if (page === "folder") return viewFolder(parts[2]);
    if (page === "trash") return viewTrash();
    if (page === "kb") return viewKnowledge(parts[2]);
    if (page === "starred") return viewStarred();
    const list = page === "recent" ? liveFiles().slice().sort((a, b) => ageMin(a.modified) - ageMin(b.modified)).slice(0, 6) : liveFiles();
    const title = { all: "All files", recent: "Recent" }[page] || "All files";
    const rows = list.map(f => `<div class="prow frow" data-a="go:files/file/${f.id}" data-drag="file:${f.id}" draggable="true"><span class="fname">${ic(f.icon, 16, "var(--text-secondary)")}<span>${esc(f.name)}</span>${f.starred ? ic("star", 12, "var(--warning)") : ""}</span><span style="display:flex;gap:6px;align-items:center;color:var(--text-secondary)">${av(f.owner, 18)}${esc(f.owner)}</span><span class="mono" style="color:var(--text-tertiary)">${f.modified}</span><span class="mono" style="color:var(--text-tertiary);text-align:right">${f.size}</span><button class="ib sm frow-x" data-a="trash:file|${f.id}" title="Move to trash">${ic("trash-2", 13)}</button></div>`).join("");
    return header(esc(title), { lead: ic(page === "recent" ? "clock" : "files", 16, "var(--text-secondary)"), count: list.length, actions: `<button class="btn sm primary" data-a="upload">${ic("upload", 13)}Upload</button>` }) +
      (list.length ? `<div class="scroll"><div class="prow frow head"><span>Name</span><span>Owner</span><span>Modified</span><span style="text-align:right">Size</span><span></span></div>${rows}</div>` : emptyState("files", "Nothing here", "Files you upload show up here."));
  }
  // starred: every element type, grouped by type
  function viewStarred() {
    const items = allItems().filter(i => i.x.starred);
    return header("Starred", { lead: ic("star", 16, "var(--text-secondary)"), count: items.length }) + `<div class="scroll"><div class="coll">
      <div class="coll-head"><span class="coll-icon">${ic("star", 24)}</span><h1>Starred</h1></div>
      <p class="coll-desc">Everything you starred — ToDos, notes, decks, files and more.</p>
      ${items.length ? `<div class="coll-table">${itemGroups(items, { folderCol: true })}</div>` : emptyState("star", "Nothing starred yet", "Star anything from its “…” menu to keep it close.")}
    </div></div>`;
  }
  // sizes like "820 KB" / "4.2 MB" → bytes; ages like "12m" / "2h" / "1d" / "1w" → minutes (for "newest")
  const toBytes = s => { const [n, u] = s.split(" "); return +n * ({ KB: 1e3, MB: 1e6, GB: 1e9 }[u] || 1); };
  const fmtBytes = b => b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : b >= 1e6 ? (b / 1e6).toFixed(1).replace(/\.0$/, "") + " MB" : Math.round(b / 1e3) + " KB";
  const ageMin = a => a === "now" ? 0 : parseFloat(a) * ({ m: 1, h: 60, d: 1440, w: 10080 }[a.slice(-1)] || 1);
  // My Drive: the top of the global folder tree, with what each folder holds (plan and content counted apart)
  function viewAllFolders() {
    const rows = kids(null).map(f => {
      const files = deepItems(f.id, ["file"]).map(i => i.x);
      return `<div class="coll-row c5" data-a="openfolder:${f.id}" data-drag="folder:${f.id}" data-drop="${f.id}" draggable="true">
        <span class="coll-name">${folderIcon(f)}<span>${esc(f.name)}</span>${kbState(f).on ? ic("library-big", 12, "var(--text-tertiary)") : ""}</span>
        <span class="mono">${deepItems(f.id, famTypes("plan")).length}</span><span class="mono">${deepItems(f.id, famTypes("content")).length}</span>
        <span style="color:var(--text-secondary)">${files.length ? fmtBytes(files.reduce((s, x) => s + toBytes(x.size), 0)) : "–"}</span>
        <button class="ib sm" data-a="fmenu:${f.id}" title="More">${ic("ellipsis", 14)}</button></div>`;
    }).join("");
    const loose = allItems().filter(i => !folder(i.x.folder));
    return header("All folders", { lead: ic("folders", 16, "var(--text-secondary)"), actions: `<button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button>` }) +
      `<div class="scroll"><div class="coll">
        <div class="coll-head"><span class="coll-icon">${ic("folders", 24)}</span><h1>All folders</h1><span class="spacer"></span>
          <button class="btn" data-a="upload">${ic("upload", 14)}Upload</button><button class="btn primary" data-a="newfolder">New folder</button></div>
        <p class="coll-desc">${D.folders.length} folders · ${allItems().length} elements · ${fmtBytes(liveFiles().reduce((s, x) => s + toBytes(x.size), 0))} of files in total.</p>
        ${kids(null).length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Folder name</span><span>Plan</span><span>Content</span><span>Files</span><span></span></div>${rows}</div>`
          : emptyState("folders", "No folders yet", "Folders keep everything that belongs together — ToDos, notes, decks and files.", `<button class="btn primary" data-a="newfolder">New folder</button>`)}
        ${loose.length ? `<div class="due-head fd-head"><h2>Not in a folder</h2><span class="label-mono">${loose.length}</span></div><div class="coll-table fd-area">${itemGroups(loose)}</div>` : ""}
      </div></div>`;
  }
  // knowledge base: home table of collections, or one collection's files
  function viewKnowledge(id) {
    const kbIcon = `<span class="coll-icon">${ic("library-big", 24)}</span>`;
    const k = id && D.knowledge.find(x => x.id === id);
    if (k) {
      const files = kbTree(k).items;
      const rows = files.map(f => `<div class="prow frow" data-a="go:files/file/${f.id}"><span class="fname">${ic(f.icon, 16, "var(--text-secondary)")}<span>${esc(f.name)}</span></span><span style="display:flex;gap:6px;align-items:center;color:var(--text-secondary)">${av(f.owner, 18)}${esc(f.owner)}</span><span class="mono" style="color:var(--text-tertiary)">${f.modified}</span><span class="mono" style="color:var(--text-tertiary);text-align:right">${f.size}</span><button class="ib sm frow-x" data-a="kb-remove:${k.id}|${esc(f.name)}" title="Remove from collection">${ic("x", 13)}</button></div>`).join("");
      return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:files/kb">Knowledge base</span> <span class="crumb-sep">›</span> ${esc(k.name)}`, { lead: ic("book-marked", 16, "var(--text-secondary)"), count: files.length }) +
        (files.length ? `<div class="scroll"><div class="prow frow head"><span>Name</span><span>Owner</span><span>Modified</span><span style="text-align:right">Size</span><span></span></div>${rows}</div>`
          : emptyState("book-marked", "Empty collection", "Collections point to files you want to keep as reference — they are not copies."));
    }
    const rows = D.knowledge.map(x => { const files = kbTree(x).items, newest = files.slice().sort((a, b) => ageMin(a.modified) - ageMin(b.modified))[0];
      return `<div class="coll-row c5" data-a="go:files/kb/${x.id}">
        <span class="coll-name">${ic("book-marked", 16, "var(--text-secondary)")}<span>${esc(x.name)}</span></span>
        <span class="mono">${files.length}</span><span class="mono">${files.length ? fmtBytes(files.reduce((s, f) => s + toBytes(f.size), 0)) : "–"}</span>
        <span style="color:var(--text-secondary)">${newest ? newest.modified + " ago" : "–"}</span>
        <button class="ib sm" data-a="kb-menu:${x.id}" title="More">${ic("ellipsis", 14)}</button></div>`; }).join("");
    const refs = new Set(D.knowledge.flatMap(x => kbTree(x).items));
    return header("Knowledge base", { lead: ic("library-big", 16, "var(--text-secondary)"), actions: `<button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button>` }) +
      `<div class="scroll"><div class="coll">
        <div class="coll-head">${kbIcon}<h1>Knowledge base</h1><span class="chip" style="cursor:default">${ic("users", 12)}Workspace</span><span class="spacer"></span>
          <button class="btn primary" data-a="newcollection">New collection</button></div>
        <p class="coll-desc">Curated reference material for your team and the AI assistant · ${D.knowledge.length} collections · ${refs.size} files.</p>
        ${D.knowledge.length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Collection</span><span>Files</span><span>Size</span><span>Last updated</span><span></span></div>${rows}</div>`
          : emptyState("library-big", "No collections yet", "Group the files your team keeps coming back to.", `<button class="btn primary" data-a="newcollection">New collection</button>`)}
      </div></div>`;
  }
  // one trash for every element type
  function viewTrash() {
    const rows = D.trash.map((e, n) => { const T = TYPES[e.type], x = e.item;
      return `<div class="coll-row c-trash"${e.type === "file" ? ` data-a="go:files/file/${x.id}"` : ""}>
        <span class="coll-name">${ic(T.icon(x), 16, "var(--text-tertiary)")}<span>${esc(T.name(x))}</span></span>
        <span style="color:var(--text-secondary)">${T.label}${folder(x.folder) ? " · " + esc(folderName(x.folder)) : ""}</span>
        <span style="color:var(--text-secondary)">${ago(e.at)}</span>
        <span class="mono" style="color:var(--text-tertiary)">${e.type === "file" ? x.size : ""}</span>
        <span class="trash-acts"><button class="ib sm" data-a="trash-restore:${n}" title="Restore">${ic("rotate-ccw", 14)}</button><button class="ib sm danger" data-a="trash-purge:${n}" title="Delete forever">${ic("x", 14)}</button></span></div>`; }).join("");
    return header("Trash", { lead: ic("trash-2", 16, "var(--text-secondary)"), count: D.trash.length }) + `<div class="scroll"><div class="coll">
      <div class="coll-head"><span class="coll-icon">${ic("trash-2", 24)}</span><h1>Trash</h1><span class="spacer"></span>
        ${D.trash.length ? `<button class="btn danger-btn" data-a="trash-empty">${ic("trash-2", 14)}Empty trash</button>` : ""}</div>
      <p class="coll-desc">Everything you delete — ToDos, notes, decks, files and more — lands here first. Restored items go back to their folder.</p>
      ${D.trash.length ? `<div class="coll-table"><div class="coll-row c-trash head"><span>Name</span><span>Type · folder</span><span>Deleted</span><span>Size</span><span></span></div>${rows}</div>`
        : emptyState("trash-2", "Trash is empty", "Things you delete land here first, so you can still restore them.")}
    </div></div>`;
  }
  function viewTodos() {
    const open = D.todos.filter(t => !t.done), done = D.todos.filter(t => t.done);
    const row = t => { const pr = prio(t.prio); return `<div class="todo${t.done ? " done" : ""}" data-drag="todo:${t.id}" draggable="true"><button class="todo-ck" data-a="todo:${t.id}" role="checkbox" aria-checked="${!!t.done}" title="${t.done ? "Mark as open" : "Mark as done"}">${t.done ? ic("check", 12) : ""}</button><span class="todo-t" data-a="todo-edit:${t.id}" title="Edit">${esc(t.text)}</span>${pr.id ? `<span title="${pr.name}">${ic(pr.icon, 13, pr.color)}</span>` : ""}${folderChip("todo", t)}${t.dur ? `<span class="mono" style="color:var(--text-tertiary)" title="Duration">${fmtDur(t.dur)}</span>` : ""}${t.due ? `<span class="mono" style="color:${!t.done && dayDiff(t.due) < 0 ? "var(--danger)" : "var(--text-tertiary)"}">${t.due}</span>` : ""}<button class="ib sm todo-x" data-a="imenu:todo|${t.id}" title="More">${ic("ellipsis", 13)}</button></div>`; };
    return header("ToDos", { lead: ic("list-checks", 16, "var(--text-secondary)"), count: open.length, actions: `<button class="btn sm primary" data-a="newtodo">${ic("plus", 13)}New ToDo</button>` }) +
      `<div class="scroll"><div class="todos">
        <div class="todo add">${ic("plus", 14, "var(--text-tertiary)")}<input id="todo-new" placeholder="Add a to-do…" autocomplete="off"></div>
        ${open.map(row).join("") || `<div class="todo"><span class="todo-t" style="color:var(--text-tertiary)">Nothing left to do</span></div>`}
        ${done.length ? `<div class="label-mono" style="padding:18px 0 6px">Done · ${done.length}</div>${done.map(row).join("")}` : ""}
      </div></div>`;
  }
  function viewPinned(parts) {
    if (parts[1] === "calendar") return viewPlan(["plan", "calendar"]);
    if (parts[1] === "todos") return viewTodos();
    return viewInbox();
  }
  function viewSettings(parts) {
    const page = parts[1] || "general";
    const sw = k => `<button class="switch${S.prefs[k] ? " on" : ""}" data-a="pref:${k}" role="switch" aria-checked="${S.prefs[k]}"></button>`;
    const row = (t, d, ctl) => `<div class="box-row"><div class="l"><b>${t}</b><span>${d}</span></div>${ctl}</div>`;
    let body;
    if (page === "general") body = `<h1>General</h1><p class="desc">Workspace name, address and defaults.</p>
      <div class="box">${row("Workspace name", "Shown in the switcher and emails.", `<input class="input" id="wsname" value="${esc(D.workspace.name)}">`)}
      ${row("URL", "Members reach the workspace here.", `<span class="mono" style="color:var(--text-secondary)">chameleon.app/${esc(D.workspace.name.toLowerCase())}</span>`)}
      ${row("Auto-assign", "Assign new work items to their creator.", sw("autoAssign"))}
      ${row("Public links", "Allow sharing read-only links outside the workspace.", sw("publicLinks"))}
      ${row("Demo data", "Everything is saved in this browser. Start over with the original sample data.", `<button class="btn sm danger-btn" data-a="reset-data">${ic("rotate-ccw", 13)}Reset</button>`)}</div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end"><button class="btn primary" data-a="savews">Save changes</button></div>`;
    else if (page === "members") body = `<h1>Members</h1><p class="desc">${Object.keys(D.people).length} people have access to this workspace.</p><div class="box">${Object.keys(D.people).map((n, k) => row(`<span style="display:flex;gap:8px;align-items:center">${av(n, 20)}${esc(n)}</span>`, n.toLowerCase().replace(" ", ".") + "@chameleon.app", `<span class="chip">${k === 0 ? "Owner" : "Member"}${ic("chevron-down", 12)}</span>`)).join("")}</div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end"><button class="btn primary" data-a="toast:Invite link copied">${ic("plus", 14)}Invite people</button></div>`;
    else if (page === "preferences" || page === "profile") body = `<h1>${page === "profile" ? "Profile" : "Preferences"}</h1><p class="desc">Settings that only apply to you.</p>
      <div class="box">${page === "profile" ? row("Name", "Shown on work items and comments.", `<input class="input" value="${esc(D.me)}">`) : ""}
      ${row("Theme", "Kestrel is dark-first; a light variant is available.", `<div class="seg"><button class="${S.theme === "dark" ? "on" : ""}" data-a="settheme:dark">Dark</button><button class="${S.theme === "light" ? "on" : ""}" data-a="settheme:light">Light</button></div>`)}
      ${row("Notifications", "Send desktop notifications for mentions.", sw("notifications"))}
      ${row("Weekly digest", "Email a summary every Monday.", sw("digest"))}</div>`;
    else if (page === "billing") body = `<h1>Billing and plans</h1><p class="desc">You are on the ${D.workspace.plan.toLowerCase()} — 14 days left.</p><div class="box">${row("Business", "Unlimited projects, SSO, audit log.", `<span class="badge">Current</span>`)}${row("Seats", Object.keys(D.people).length + " of 10 used", `<button class="btn sm">Manage</button>`)}</div>`;
    else body = emptyState("settings", page[0].toUpperCase() + page.slice(1), "Nothing to configure here yet.");
    return header("Settings", { lead: ic("settings", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="set">${body}</div></div>`;
  }

  /* ---------- calendar: day / week / 4 days / month / year / schedule, recurring events, drag to create, move and resize ---------- */
  const CAL_COLORS = { blue: "var(--blue-500)", violet: "var(--violet-500)", green: "var(--green-500)", amber: "var(--amber-500)", red: "var(--red-500)", ice: "var(--ice-300)", copper: "var(--copper-300)", graphite: "var(--kestrel-600)" };
  const CAL_COLOR_NAMES = { blue: "Peacock", violet: "Lavender", green: "Sage", amber: "Tangerine", red: "Tomato", ice: "Ice", copper: "Copper", graphite: "Graphite" };
  const CAL_VIEWS = [["day", "Day", "D", "calendar-1"], ["week", "Week", "W", "calendar-range"], ["month", "Month", "M", "calendar-days"], ["year", "Year", "Y", "layout-grid"], ["schedule", "Schedule", "S", "list"], ["4day", "4 days", "X", "columns-3"]];
  const DAYS_LONG = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" ");
  const MONTHS_LONG = "January February March April May June July August September October November December".split(" ");
  const REM_OPTS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];
  const HOUR = 48; // px per hour in the day / week grid
  // older saves may miss the calendar or newer preferences; the holiday calendar is always there (its events are computed)
  D.events = D.events || []; D.calendars = D.calendars && D.calendars.length ? D.calendars : [{ id: "cal-me", name: D.me, color: "blue" }];
  D.calPrefs = Object.assign({ weekStart: 1, weekends: true, weekNums: false, h12: false, duration: 60, dimPast: true, declined: true, doneTasks: true, tasksHidden: false, workStart: 480, workEnd: 1080, reminder: 10 }, D.calPrefs);
  if (!D.calendars.some(c => c.id === "cal-hol")) D.calendars.push({ id: "cal-hol", name: "Holidays in Germany", color: "red", readonly: true, other: true });
  const CP = () => D.calPrefs;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addIso = (s, n) => iso(addD(fromIso(s), n));
  const isoDiff = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 864e5);
  const TODAY_ISO = iso(TODAY);
  S.cal = { view: store.get("calView", "week"), date: TODAY_ISO, mini: null, q: "", ghost: null, scroll: true, ed: null, custom: false, cdraft: null, scopeCb: null };
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const fmtT = m => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0"); return CP().h12 ? `${h % 12 || 12}${m % 60 ? ":" + mm : ""}${h < 12 ? "am" : "pm"}` : `${String(h).padStart(2, "0")}:${mm}`; };
  const fmtLong = s => { const d = fromIso(s); return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}${d.getFullYear() !== TODAY.getFullYear() ? " " + d.getFullYear() : ""}`; };
  const fmtShort = s => { const d = fromIso(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const minToInput = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const inputToMin = v => { const [h, m] = (v || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const tzLabel = () => { const o = -new Date().getTimezoneOffset(), a = Math.abs(o); return (o < 0 ? "-" : "+") + String(Math.floor(a / 60)).padStart(2, "0") + (a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""); };
  const dueIso = t => t.due ? iso(parseDue(t.due)) : null;
  const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day); return Math.ceil(((x - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
  const remText = m => m === 0 ? "At start" : m % 10080 === 0 ? `${m / 10080} week${m > 10080 ? "s" : ""} before` : m % 1440 === 0 ? `${m / 1440} day${m > 1440 ? "s" : ""} before` : m % 60 === 0 ? `${m / 60} hour${m > 60 ? "s" : ""} before` : `${m} minutes before`;
  const calOf = id => D.calendars.find(c => c.id === id);
  const calCol = c => CAL_COLORS[(c || {}).color] || CAL_COLORS.graphite;
  const evColor = ev => CAL_COLORS[ev.color] || calCol(calOf(ev.cal));
  const evLocked = ev => !!(calOf(ev.cal) || {}).readonly;
  const evIcon = ev => ev.todo ? ((todo(ev.todo) || {}).done ? "circle-check" : "circle") : ev.type === "focus" ? "headphones" : "";
  const evTitle = ev => esc(ev.title || "(No title)");
  const isBar = o => o.ev.allDay || o.end !== o.date; // all-day and multi-day events sit in the all-day row
  const weekStartOf = d => addD(d, -((d.getDay() - CP().weekStart + 7) % 7));
  const showDay = d => CP().weekends || d.getDay() % 6 !== 0;
  const defCal = () => (D.calendars.find(c => !c.readonly && !c.hidden) || D.calendars.find(c => !c.readonly) || {}).id;

  // public holidays in Germany, computed per year (Easter after the anonymous Gregorian algorithm)
  const holCache = {};
  function holidays(y) {
    if (holCache[y]) return holCache[y];
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easter = new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1), ea = n => iso(addD(easter, n));
    return holCache[y] = [[`${y}-01-01`, "New Year's Day"], [ea(-2), "Good Friday"], [ea(1), "Easter Monday"], [`${y}-05-01`, "Labour Day"], [ea(39), "Ascension Day"], [ea(50), "Whit Monday"], [`${y}-10-03`, "German Unity Day"], [`${y}-12-25`, "Christmas Day"], [`${y}-12-26`, "Boxing Day"]]
      .map(([date, title]) => ({ id: "hol-" + date, title, cal: "cal-hol", date, allDay: true }));
  }
  const eventsFor = (from, to) => { const out = D.events.slice(); for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) out.push(...holidays(y)); return out; };

  // start days of an event's occurrences that overlap [from, to] (ISO, inclusive)
  function occurs(ev, from, to) {
    const span = ev.endDate ? isoDiff(ev.date, ev.endDate) : 0, r = ev.rrule, out = [];
    const hit = s => s <= to && addIso(s, span) >= from;
    if (!r) return hit(ev.date) ? [ev.date] : out;
    const start = fromIso(ev.date), lim = fromIso(to), ex = new Set(ev.exdates || []), iv = Math.max(1, r.interval || 1);
    let n = 0;
    const push = d => { const s = iso(d); if ((r.until && s > r.until) || (r.count && n >= r.count)) return false; n++; if (!ex.has(s) && hit(s)) out.push(s); return true; };
    if (r.freq === "daily") { for (let d = start; d <= lim; d = addD(d, iv)) if (!push(d)) break; }
    else if (r.freq === "weekly") {
      const days = (r.days && r.days.length ? r.days : [start.getDay()]).slice().sort();
      outer: for (let w = addD(start, -start.getDay()); w <= lim; w = addD(w, 7 * iv)) for (const k of days) { const d = addD(w, k); if (d < start) continue; if (d > lim || !push(d)) break outer; }
    } else { // monthly / yearly on the same day of the month; months without that day are skipped
      const step = r.freq === "yearly" ? 12 * iv : iv;
      for (let k = 0; ; k += step) { const d = new Date(start.getFullYear(), start.getMonth() + k, start.getDate()); if (d > lim) break; if (d.getDate() !== start.getDate()) continue; if (!push(d)) break; }
    }
    return out;
  }
  // visible occurrences in [from, to], sorted: bars first, then by start time
  function calOccs(from, to) {
    const P = CP(), out = [];
    eventsFor(from, to).forEach(ev => {
      const c = calOf(ev.cal); if (!c || c.hidden || (ev.rsvp === "no" && !P.declined)) return;
      const span = ev.endDate ? isoDiff(ev.date, ev.endDate) : 0;
      occurs(ev, from, to).forEach(date => out.push({ ev, date, end: addIso(date, span), key: ev.id + "@" + date }));
    });
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (isBar(b) - isBar(a)) || ((a.ev.start || 0) - (b.ev.start || 0)));
  }
  const calTasks = (from, to) => CP().tasksHidden ? [] : D.todos.filter(t => t.due && (CP().doneTasks || !t.done) && !planned(t)).map(t => ({ t, date: dueIso(t) })).filter(x => x.date >= from && x.date <= to);
  function occFind(key) {
    const [id, date] = key.split("@"), ev = id.startsWith("hol-") ? holidays(+id.slice(4, 8)).find(h => h.id === id) : D.events.find(e => e.id === id);
    return ev ? { ev, date, end: addIso(date, ev.endDate ? isoDiff(ev.date, ev.endDate) : 0), key } : null;
  }
  const isPast = o => o.end < TODAY_ISO || (o.end === TODAY_ISO && !o.ev.allDay && (o.ev.end || 0) <= nowMin());
  const dimCls = o => (isPast(o) && CP().dimPast ? " past" : "") + (o.ev.rsvp === "no" ? " declined" : o.ev.rsvp === "maybe" ? " maybe" : "");
  function repText(r, date) {
    if (!r) return "Does not repeat";
    const d = fromIso(date), iv = r.interval || 1, days = (r.days && r.days.length ? r.days : [d.getDay()]).slice().sort();
    let s = iv === 1 ? { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Annually" }[r.freq] : `Every ${iv} ${{ daily: "days", weekly: "weeks", monthly: "months", yearly: "years" }[r.freq]}`;
    if (r.freq === "weekly") s += days.join() === "1,2,3,4,5" ? " on weekdays" : " on " + days.map(k => DAYS_LONG[k]).join(", ");
    if (r.freq === "monthly") s += " on day " + d.getDate();
    if (r.freq === "yearly") s += ` on ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
    return s + (r.count ? `, ${r.count} times` : r.until ? ", until " + fmtShort(r.until) + " " + r.until.slice(0, 4) : "");
  }
  function occWhen(o) {
    const ev = o.ev;
    if (ev.allDay) return o.end === o.date ? fmtLong(o.date) : `${fmtLong(o.date)} – ${fmtLong(o.end)}`;
    if (o.end !== o.date) return `${fmtLong(o.date)}, ${fmtT(ev.start)} – ${fmtLong(o.end)}, ${fmtT(ev.end)}`;
    return `${fmtLong(o.date)} · ${fmtT(ev.start)} – ${fmtT(ev.end)}`;
  }
  // timed events of mine that overlap the draft (shown in the editor); guests are busy if they are on such an event
  const overlaps = (d, pred = () => true) => d.allDay || (d.endDate && d.endDate !== d.date) ? []
    : calOccs(d.date, d.date).filter(o => o.ev.id !== d.id && !isBar(o) && o.ev.start < d.end && o.ev.end > d.start && o.ev.rsvp !== "no" && o.ev.busy !== "free" && pred(o));

  /* the days shown as columns, the header label and paging */
  function calCols() {
    const a = fromIso(S.cal.date), v = S.cal.view;
    if (v === "day") return [a];
    if (v === "4day") return [0, 1, 2, 3].map(n => addD(a, n));
    const f = weekStartOf(a); return [0, 1, 2, 3, 4, 5, 6].map(n => addD(f, n)).filter(showDay);
  }
  function calLabel() {
    const a = fromIso(S.cal.date), v = S.cal.view;
    if (S.cal.q.trim()) return "Search";
    if (v === "year") return String(a.getFullYear());
    if (v === "month") return `${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`;
    if (v === "day") return `${DAYS_LONG[a.getDay()]}, ${a.getDate()} ${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`;
    if (v === "schedule") return `From ${fmtShort(S.cal.date)} ${a.getFullYear()}`;
    const cols = calCols(), f = cols[0], l = cols[cols.length - 1];
    return f.getMonth() === l.getMonth() ? `${f.getDate()} – ${l.getDate()} ${MONTHS[l.getMonth()]} ${l.getFullYear()}` : `${f.getDate()} ${MONTHS[f.getMonth()]}${f.getFullYear() !== l.getFullYear() ? " " + f.getFullYear() : ""} – ${l.getDate()} ${MONTHS[l.getMonth()]} ${l.getFullYear()}`;
  }
  function calStep(dir) {
    const a = fromIso(S.cal.date), v = S.cal.view;
    if (v === "month") S.cal.date = iso(new Date(a.getFullYear(), a.getMonth() + dir, 1));
    else if (v === "year") S.cal.date = iso(new Date(a.getFullYear() + dir, 0, 1));
    else S.cal.date = iso(addD(a, dir * { day: 1, "4day": 4, week: 7, schedule: 7 }[v]));
    S.cal.mini = null; closeCalPop(true); render();
  }
  function setView(v) { S.cal.view = v; S.cal.q = ""; S.cal.scroll = true; store.set("calView", v); closeCalPop(true); render(); }
  function calGoto(s, view) { S.cal.date = s; S.cal.mini = null; S.cal.q = ""; if (view) { S.cal.view = view; store.set("calView", view); S.cal.scroll = true; } closeCalPop(true); render(); }

  /* event pieces */
  function occBlock(x) {
    const o = x.o, ev = o.ev, short = x.e - x.s < 45, icon = evIcon(ev);
    return `<div class="cal-ev${short ? " short" : ""}${dimCls(o)}" data-occ="${o.key}" style="${evPos(x)};--c:${evColor(ev)}" title="${evTitle(ev)}"><b>${icon ? ic(icon, 11) : ""}${evTitle(ev)}</b><span>${fmtT(ev.start)} – ${fmtT(ev.end)}${ev.loc && !short ? ", " + esc(ev.loc) : ""}</span>${evLocked(ev) ? "" : '<i class="cal-rs"></i>'}</div>`;
  }
  function occChip(o, style = "", bar = false) {
    const ev = o.ev, timed = !ev.allDay && o.end === o.date, icon = evIcon(ev);
    return `<div class="cal-chip ${bar || !timed ? "cal-bar" : "dot"}${dimCls(o)}" data-occ="${o.key}" style="${style};--c:${evColor(ev)}" title="${evTitle(ev)}">${timed ? `<i class="cal-dot"></i><span class="cal-tm">${fmtT(ev.start)}</span>` : icon ? ic(icon, 11) : ""}<span class="cal-tt">${evTitle(ev)}</span></div>`;
  }
  const taskChip = (t, style = "") => `<div class="cal-chip task${t.done ? " done" : ""}" data-task="${t.id}" style="${style}" title="${esc(t.text)}">${ic(t.done ? "circle-check" : "circle", 12)}<span class="cal-tt">${esc(t.text)}</span></div>`;
  const evPos = x => `top:${x.s / 60 * HOUR}px;height:${(x.e - x.s) / 60 * HOUR - 2}px;left:calc(${x.col / x.ncol * 100}% + 1px);width:calc(${100 / x.ncol}% - 4px)`;
  // overlapping events in one day column share its width side by side
  function layoutDay(list) {
    list.sort((a, b) => a.s - b.s || b.e - a.e);
    let group = [], end = -1;
    const flush = () => { const cols = []; group.forEach(o => { let c = cols.findIndex(e => e <= o.s); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = o.e; o.col = c; }); group.forEach(o => o.ncol = cols.length); group = []; };
    list.forEach(o => { if (o.s >= end) { flush(); end = -1; } group.push(o); end = Math.max(end, o.e); });
    flush();
  }

  /* views */
  function calWeekView() {
    const P = CP(), cols = calCols(), n = cols.length, from = iso(cols[0]), to = iso(cols[n - 1]), g = S.cal.ghost;
    const occs = calOccs(from, to), tasks = calTasks(from, to), colIdx = {}; cols.forEach((d, i) => colIdx[iso(d)] = i);
    const idxFrom = s => { for (let i = 0; i < n; i++) if (iso(cols[i]) >= s) return i; return n; };
    const idxTo = s => { for (let i = n - 1; i >= 0; i--) if (iso(cols[i]) <= s) return i; return -1; };
    // all-day row: bars packed into lanes
    const bars = occs.filter(isBar).map(o => ({ o, a: idxFrom(o.date), b: idxTo(o.end) })).filter(x => x.a <= x.b);
    tasks.forEach(x => { const i = colIdx[x.date]; if (i != null) bars.push({ task: x.t, a: i, b: i }); });
    if (g && g.allDay) { const a = idxFrom(g.date), b = idxTo(g.end || g.date); if (a <= b) bars.push({ ghost: true, a, b }); }
    bars.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
    const lanes = []; bars.forEach(x => { let l = lanes.findIndex(e => e < x.a); if (l < 0) { l = lanes.length; lanes.push(-1); } lanes[l] = x.b; x.lane = l; });
    const bar = x => { const st = `grid-column:${x.a + 1}/${x.b + 2};grid-row:${x.lane + 1}`; return x.ghost ? `<div class="cal-chip cal-bar ghost" style="${st}">${esc(g.title || "(No title)")}</div>` : x.task ? taskChip(x.task, st) : occChip(x.o, st, true); };
    const head = cols.map(d => { const s = iso(d); return `<button class="cal-dh${s === TODAY_ISO ? " today" : ""}" data-a="cal-open:${s}" title="Open day"><span class="dow label-mono">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="dn">${d.getDate()}</span></button>`; }).join("");
    const hours = Array.from({ length: 23 }, (_, h) => `<div class="cal-hr" style="top:${(h + 1) * HOUR}px">${fmtT((h + 1) * 60)}</div>`).join("");
    const body = cols.map(d => {
      const s = iso(d), list = occs.filter(o => !isBar(o) && o.date === s).map(o => ({ o, s: o.ev.start, e: Math.max(o.ev.end, o.ev.start + 20) }));
      if (g && !g.allDay && g.date === s) list.push({ ghost: true, s: g.start, e: Math.max(g.end, g.start + 20) });
      layoutDay(list);
      const evs = list.map(x => x.ghost ? `<div class="cal-ev ghost" style="${evPos(x)}"><b>${esc(g.title || "(No title)")}</b><span>${fmtT(g.start)} – ${fmtT(g.end)}</span></div>` : occBlock(x)).join("");
      const off = `<div class="cal-off" style="top:0;height:${P.workStart / 60 * HOUR}px"></div><div class="cal-off" style="top:${P.workEnd / 60 * HOUR}px;bottom:0"></div>`;
      return `<div class="cal-col${s === TODAY_ISO ? " today" : ""}" data-day="${s}">${off}${evs}${s === TODAY_ISO ? `<div class="cal-now" style="top:${nowMin() / 60 * HOUR}px"></div>` : ""}</div>`;
    }).join("");
    return `<div class="cal-wk" style="--n:${n}">
      <div class="cal-wk-head"><div class="cal-gut mono" title="Your time zone">GMT${tzLabel()}</div><div class="cal-days">${head}</div></div>
      <div class="cal-ad"><div class="cal-gut label-mono">All day</div><div class="cal-ad-grid">${cols.map((d, i) => `<div class="cal-ad-bg" style="grid-column:${i + 1};grid-row:1/${lanes.length + 2}" data-day="${iso(d)}"></div>`).join("")}${bars.map(bar).join("")}</div></div>
      <div class="scroll cal-tg" id="cal-tg"><div class="cal-tg-in" style="height:${24 * HOUR}px"><div class="cal-gut cal-hours">${hours}</div><div class="cal-cols">${body}</div></div></div>
    </div>`;
  }
  function calMonthView() {
    const P = CP(), a = fromIso(S.cal.date), first = new Date(a.getFullYear(), a.getMonth(), 1), start = weekStartOf(first), g = S.cal.ghost, MAXC = 4;
    const weeks = Math.ceil((isoDiff(iso(start), iso(first)) + new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()) / 7);
    const days = Array.from({ length: weeks * 7 }, (_, k) => addD(start, k)), vis = days.filter(showDay), per = vis.length / weeks;
    const from = iso(days[0]), to = iso(days[days.length - 1]), occs = calOccs(from, to), tasks = calTasks(from, to);
    const cells = vis.map((d, k) => {
      const s = iso(d), items = occs.filter(o => o.date <= s && o.end >= s).map(o => occChip(o, "", isBar(o))).concat(tasks.filter(x => x.date === s).map(x => taskChip(x.t)));
      if (g && g.date <= s && (g.end || g.date) >= s) items.unshift(`<div class="cal-chip cal-bar ghost">${esc(g.title || "(No title)")}</div>`);
      const shown = items.length > MAXC ? items.slice(0, MAXC - 1) : items;
      return `<div class="cal-mc${d.getMonth() !== a.getMonth() ? " out" : ""}${s === TODAY_ISO ? " today" : ""}" data-day="${s}">${P.weekNums && k % per === 0 ? `<span class="cal-wn mono">W${isoWeek(d)}</span>` : ""}<button class="cal-mn" data-a="cal-open:${s}" title="Open day">${d.getDate() === 1 ? MONTHS[d.getMonth()] + " " : ""}${d.getDate()}</button>${shown.join("")}${items.length > MAXC ? `<button class="cal-more" data-a="cal-daypop:${s}">${items.length - MAXC + 1} more</button>` : ""}</div>`;
    }).join("");
    return `<div class="cal-month" style="--n:${per};--w:${weeks}"><div class="cal-mhead">${vis.slice(0, per).map(d => `<div class="cal-mh label-mono">${WEEKDAYS[(d.getDay() + 6) % 7]}</div>`).join("")}</div><div class="cal-mgrid">${cells}</div></div>`;
  }
  // one month of small day buttons (sidebar mini calendar and year view)
  function miniGrid(m, o = {}) {
    const P = CP(), start = weekStartOf(m), last = new Date(m.getFullYear(), m.getMonth() + 1, 0), sel = o.sel || new Set();
    let html = (P.weekNums ? '<span class="wn"></span>' : "") + [0, 1, 2, 3, 4, 5, 6].map(k => `<span class="wd">${WEEKDAYS[(addD(start, k).getDay() + 6) % 7][0]}</span>`).join("");
    for (let w = 0; w < 6; w++) {
      const ws = addD(start, w * 7); if (ws > last) break;
      if (P.weekNums) html += `<span class="wn">${isoWeek(ws)}</span>`;
      for (let k = 0; k < 7; k++) { const d = addD(ws, k), s = iso(d), out = d.getMonth() !== m.getMonth();
        html += `<button class="md${out ? " out" : ""}${s === TODAY_ISO ? " today" : ""}${sel.has(s) ? " sel" : ""}${o.busy && !out && o.busy.has(s) ? " busy" : ""}" data-a="${o.act || "cal-goto"}:${s}">${d.getDate()}</button>`; }
    }
    return `<div class="cal-mini-g${P.weekNums ? " wk" : ""}">${html}</div>`;
  }
  function calYearView() {
    const y = fromIso(S.cal.date).getFullYear(), from = `${y}-01-01`, to = `${y}-12-31`, busy = new Set();
    calOccs(from, to).forEach(o => { for (let s = o.date; s <= o.end; s = addIso(s, 1)) busy.add(s); });
    calTasks(from, to).forEach(x => busy.add(x.date));
    return `<div class="scroll"><div class="cal-year">${MONTHS_LONG.map((name, m) => `<div class="cal-ym"><button class="cal-ym-t" data-a="cal-month:${y}-${String(m + 1).padStart(2, "0")}-01">${name}</button>${miniGrid(new Date(y, m, 1), { busy, act: "cal-open" })}</div>`).join("")}</div></div>`;
  }
  // schedule: the next 90 days as a list; with a search query, matching events of the past and next year
  function calScheduleView(q) {
    const s = q.toLowerCase(), from = q ? addIso(TODAY_ISO, -365) : S.cal.date, to = q ? addIso(TODAY_ISO, 365) : addIso(S.cal.date, 90);
    let occs = calOccs(from, to), tasks = calTasks(from, to);
    if (q) { occs = occs.filter(o => [o.ev.title, o.ev.desc, o.ev.loc].some(v => v && v.toLowerCase().includes(s))); tasks = tasks.filter(x => x.t.text.toLowerCase().includes(s)); }
    const byDay = {};
    occs.forEach(o => { const d = o.date < from ? from : o.date; (byDay[d] = byDay[d] || []).push(o); });
    tasks.forEach(x => (byDay[x.date] = byDay[x.date] || []).push(x));
    const when = o => o.ev.allDay ? "All day" : o.end !== o.date ? fmtT(o.ev.start) + " →" : `${fmtT(o.ev.start)} – ${fmtT(o.ev.end)}`;
    const row = it => it.t ? `<div class="cal-srow" data-task="${it.t.id}"><span class="cal-stime">ToDo</span>${ic(it.t.done ? "circle-check" : "circle", 13, "var(--text-tertiary)")}<span class="cal-stt${it.t.done ? " done" : ""}">${esc(it.t.text)}</span></div>`
      : `<div class="cal-srow${dimCls(it)}" data-occ="${it.key}" style="--c:${evColor(it.ev)}"><span class="cal-stime">${when(it)}</span><i class="cal-dot"></i><span class="cal-stt">${evIcon(it.ev) ? ic(evIcon(it.ev), 12) + " " : ""}${evTitle(it.ev)}</span>${it.ev.loc ? `<span class="cal-sloc">${esc(it.ev.loc)}</span>` : ""}</div>`;
    const body = Object.keys(byDay).sort().map(k => { const d = fromIso(k); return `<div class="cal-sday${k === TODAY_ISO ? " today" : ""}"><button class="cal-sdate" data-a="cal-open:${k}"><span class="dn">${d.getDate()}</span><span class="label-mono">${MONTHS[d.getMonth()]}, ${WEEKDAYS[(d.getDay() + 6) % 7]}${d.getFullYear() !== TODAY.getFullYear() ? " " + d.getFullYear() : ""}</span></button><div class="cal-sitems">${byDay[k].map(row).join("")}</div></div>`; }).join("");
    return `<div class="scroll"><div class="cal-sched">${q ? `<div class="cal-sres label-mono">${occs.length + tasks.length} ${occs.length + tasks.length === 1 ? "result" : "results"} for “${esc(q)}”</div>` : ""}${body || emptyState(q ? "calendar-search" : "calendar", q ? "No matching events" : "Nothing planned", q ? "Titles, places and descriptions are searched." : "Nothing in the next 90 days. Press C to create an event.")}</div></div>`;
  }
  function calInsights() {
    const f = weekStartOf(fromIso(S.cal.date)), from = iso(f), to = iso(addD(f, 6));
    const occs = calOccs(from, to).filter(o => !isBar(o) && !evLocked(o.ev) && o.ev.rsvp !== "no");
    const h = list => list.reduce((s, o) => s + (o.ev.end - o.ev.start) / 60, 0), total = h(occs), meet = h(occs.filter(o => (o.ev.guests && o.ev.guests.length) || o.ev.org));
    const rows = D.calendars.filter(c => !c.other && !c.hidden).map(c => ({ c, v: h(occs.filter(o => o.ev.cal === c.id)) })), max = Math.max(1, ...rows.map(r => r.v));
    return `<div class="cal-sec"><div class="cal-sec-h label-mono">Time insights</div>
      <div class="cal-ins-big">${fmtH(total)}h<small>in events · ${fmtShort(from)} – ${fmtShort(to)}</small></div>
      <div class="cal-ins-sub">${fmtH(meet)}h with guests · ${fmtH(total - meet)}h on your own</div>
      ${rows.map(r => `<div class="cal-ins-row"><i class="cal-dot" style="--c:${calCol(r.c)}"></i><span class="lbl">${esc(r.c.name)}</span><span class="cal-ins-track"><span style="width:${r.v / max * 100}%;background:${calCol(r.c)}"></span></span><span class="mono">${fmtH(r.v)}h</span></div>`).join("")}</div>`;
  }
  // ToDos to plan: open ToDos without a time block; drag one into the calendar to give it one
  const planned = t => D.events.some(e => e.todo === t.id);
  const fmtDur = m => m < 60 ? m + "m" : fmtH(m / 60) + "h";
  const DUR_OPTS = [15, 30, 45, 60, 90, 120, 180, 240];
  function calTodoList() {
    const open = store.get("calTodos", true), list = D.todos.filter(t => !t.done && !planned(t));
    const row = t => `<div class="cal-todo" data-sched="${t.id}" data-a="cal-tdmenu:${t.id}" title="Drag into the calendar · click to set the duration">${ic("circle", 13, "var(--text-tertiary)")}<span class="lbl">${esc(t.text)}</span>${t.dur ? `<span class="mono">${fmtDur(t.dur)}</span>` : ""}</div>`;
    return `<div class="cal-sec"><button class="cal-sec-h label-mono cal-fold${open ? " open" : ""}" data-a="cal-todos-fold" aria-expanded="${open}"><span>ToDos to plan${list.length ? " · " + list.length : ""}</span>${ic("chevron-down", 13)}</button>
      ${open ? list.map(row).join("") || `<div class="cal-tdempty">Every open ToDo has a time in the calendar.</div>` : ""}</div>`;
  }
  // first free slot of that length on a day, from the start of the working day
  function firstFree(date, dur) {
    const busy = calOccs(date, date).filter(o => !isBar(o) && o.ev.rsvp !== "no" && o.ev.busy !== "free");
    for (let s = CP().workStart; s + dur <= 1440; s += 15) if (!busy.some(o => o.ev.start < s + dur && o.ev.end > s)) return s;
    return CP().workStart;
  }
  function scheduleTodo(id, date, start, dur) {
    const t = todo(id); if (!t) return;
    const snap = calSnap(), s = start == null ? firstFree(date, dur) : start;
    t.dur = t.dur || dur;
    D.events.push({ id: uid("e"), title: t.text, todo: t.id, cal: defCal(), date, start: s, end: Math.min(1440, s + dur), reminders: CP().reminder ? [CP().reminder] : [], guests: [], exdates: [] });
    closeCalPop(true); render(); undoToast(`Planned ${fmtShort(date)}, ${fmtT(s)} – ${fmtT(Math.min(1440, s + dur))}`, snap);
  }
  // dropped without a duration: ask how long it takes (presets or hours typed in)
  function askDuration(id, date, start) {
    const t = todo(id); if (!t) return;
    S.cal.pend = { id, date, start };
    if (calPop) { calPop.remove(); calPop = null; }
    S.cal.ghost = start == null ? { date, end: date, allDay: true, title: t.text } : { date, start, end: Math.min(1440, start + 60), title: t.text };
    render();
    const el = document.querySelector(".cal-main .ghost") || document.querySelector(".cal-main");
    openCalPop(el, `<div class="cp-acts"><span class="cp-dayt">How long will it take?</span><button class="ib" data-a="cal-popx" title="Close  Esc">${ic("x", 15)}</button></div>
      <div class="cp-sub cd-what">${esc(t.text)} · ${fmtLong(date)}${start == null ? "" : ", " + fmtT(start)}</div>
      <div class="cd-opts">${DUR_OPTS.map(m => `<button class="btn sm" data-a="cal-tdur:${m}">${fmtDur(m)}</button>`).join("")}</div>
      <div class="cd-custom"><input class="input ce-num" id="cd-h" inputmode="decimal" placeholder="1.5" autocomplete="off"><span>hours</span><span style="flex:1"></span><button class="btn sm primary" data-a="cal-tdur:custom">Plan</button></div>`, "dur");
    calPop.querySelector("#cd-h").focus();
  }
  function calSide() {
    const m = fromIso(S.cal.mini || S.cal.date); m.setDate(1);
    const sel = new Set(["day", "week", "4day"].includes(S.cal.view) ? calCols().map(iso) : [S.cal.date]);
    const row = c => `<div class="cal-crow"><button class="cal-ck${c.hidden ? "" : " on"}" data-a="cal-vis:${c.id}" style="--c:${calCol(c)}" role="checkbox" aria-checked="${!c.hidden}" title="${c.hidden ? "Show" : "Hide"}">${ic("check", 11)}</button><span class="lbl" data-a="cal-vis:${c.id}">${esc(c.name)}</span><button class="ib sm" data-a="cal-cmenu:${c.id}" title="Options for ${esc(c.name)}">${ic("ellipsis", 14)}</button></div>`;
    return `<aside class="cal-side">
      <button class="btn cal-create" data-a="cal-create">${ic("plus", 16)}Create${ic("chevron-down", 13, "var(--text-tertiary)")}</button>
      <div class="cal-mini"><div class="cal-mini-h"><span>${MONTHS_LONG[m.getMonth()]} ${m.getFullYear()}</span><button class="ib sm" data-a="cal-mini:-1" title="Previous month">${ic("chevron-left", 14)}</button><button class="ib sm" data-a="cal-mini:1" title="Next month">${ic("chevron-right", 14)}</button></div>${miniGrid(m, { sel })}</div>
      <div class="cal-sec"><div class="cal-sec-h label-mono">My calendars<button class="ib sm" data-a="cal-add" title="Create new calendar">${ic("plus", 14)}</button></div>
        ${D.calendars.filter(c => !c.other).map(row).join("")}
        <div class="cal-crow"><button class="cal-ck${CP().tasksHidden ? "" : " on"}" data-a="cal-tasks" style="--c:var(--text-secondary)" role="checkbox" aria-checked="${!CP().tasksHidden}">${ic("check", 11)}</button><span class="lbl" data-a="cal-tasks">ToDos</span></div></div>
      <div class="cal-sec"><div class="cal-sec-h label-mono">Other calendars</div>${D.calendars.filter(c => c.other).map(row).join("")}</div>
      ${calInsights()}
      ${calTodoList()}
    </aside>`;
  }
  function viewCalendar() {
    const v = S.cal.view, q = S.cal.q.trim();
    const main = q ? calScheduleView(q) : v === "month" ? calMonthView() : v === "year" ? calYearView() : v === "schedule" ? calScheduleView("") : calWeekView();
    return header("Calendar", { lead: ic("calendar", 16, "var(--text-secondary)"),
      mid: `<button class="ib cal-side-btn${S.cal.side ? " on" : ""}" data-a="cal-side" title="Mini calendar and calendars">${ic("calendar-days")}</button><button class="btn sm cal-today" data-a="cal-today" title="Today  T">Today</button><button class="ib" data-a="cal-step:-1" title="Previous  K">${ic("chevron-left")}</button><button class="ib" data-a="cal-step:1" title="Next  J">${ic("chevron-right")}</button><span class="cal-range">${calLabel()}</span>`,
      actions: `<label class="cal-search">${ic("search", 14)}<input id="cal-q" placeholder="Search events" value="${esc(S.cal.q)}" autocomplete="off">${S.cal.q ? `<button class="ib sm" data-a="cal-q-clear" title="Clear search">${ic("x", 13)}</button>` : ""}</label>
        <button class="btn sm" data-a="cal-viewmenu">${CAL_VIEWS.find(x => x[0] === v)[1]}${ic("chevron-down", 13, "var(--text-tertiary)")}</button>
        <button class="ib" data-a="cal-settings" title="Calendar settings">${ic("settings")}</button>
        <button class="ib" data-a="cal-more" title="More">${ic("ellipsis")}</button>` }) +
      `<div class="cal-page${S.cal.side ? " side-on" : ""}"><div class="cal-main" data-view="${v}">${main}</div>${calSide()}</div>`;
  }
  // after a render: scroll the time grid to the start of the working day when the view or range was just opened
  function calAfterRender() {
    const tg = document.getElementById("cal-tg");
    if (tg && S.cal.scroll) tg.scrollTop = Math.max(0, CP().workStart / 60 - .5) * HOUR;
    if (S.route === "pin/calendar") S.cal.scroll = false;
  }

  /* popovers: event details, ToDo details, quick create, "more" list of a day */
  let calPop = null;
  function closeCalPop(silent) {
    if (calPop) { calPop.remove(); calPop = null; }
    if (S.cal.ghost) { S.cal.ghost = null; if (!silent) render(); }
  }
  function openCalPop(anchor, html, cls = "") {
    if (calPop) calPop.remove();
    calPop = document.createElement("div"); calPop.className = "cal-pop " + cls; calPop.innerHTML = html;
    document.body.appendChild(calPop);
    const r = anchor.getBoundingClientRect(), w = calPop.offsetWidth, h = calPop.offsetHeight;
    let x = r.right + 10, y = Math.min(Math.max(8, r.top), innerHeight - h - 8);
    if (x + w > innerWidth - 8) x = r.left - w - 10;
    if (x < 8) { x = Math.max(8, Math.min(r.left, innerWidth - w - 8)); y = r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6; }
    calPop.style.left = x + "px"; calPop.style.top = y + "px";
  }
  function occPopHtml(o) {
    const ev = o.ev, c = calOf(ev.cal), locked = evLocked(ev), org = ev.org || D.me;
    const row = (icon, body) => `<div class="cp-row">${ic(icon, 15, "var(--text-tertiary)")}<div>${body}</div></div>`;
    const people = (ev.guests && ev.guests.length) || ev.org ? [{ name: org, org: true, rsvp: "yes" }].concat(ev.org ? [{ name: D.me, rsvp: ev.rsvp }] : [], (ev.guests || []).filter(g => g.name !== org && g.name !== D.me)) : [];
    const count = ["yes", "maybe", "no"].map(k => [people.filter(p => p.rsvp === k).length, k]).filter(x => x[0]).map(([n, k]) => n + " " + k).concat(people.some(p => !p.rsvp) ? [people.filter(p => !p.rsvp).length + " awaiting"] : []).join(", ");
    const rsvpIc = r => r === "yes" ? ic("check", 12, "var(--success)") : r === "no" ? ic("x", 12, "var(--danger)") : ic("circle-help", 12, "var(--text-tertiary)");
    return `<div class="cp-acts">${locked ? "" : `<button class="ib" data-a="cal-edit:${o.key}" title="Edit event  E">${ic("pencil", 15)}</button><button class="ib" data-a="cal-del:${o.key}" title="Delete event  Del">${ic("trash-2", 15)}</button><button class="ib" data-a="cal-omenu:${o.key}" title="Options">${ic("ellipsis", 15)}</button>`}<button class="ib" data-a="cal-popx" title="Close  Esc">${ic("x", 15)}</button></div>
      <div class="cp-head"><span class="cp-sw" style="background:${evColor(ev)}"></span><div><div class="cp-t">${evIcon(ev) ? ic(evIcon(ev), 16) : ""}${evTitle(ev)}</div><div class="cp-sub">${occWhen(o)}</div>${ev.rrule ? `<div class="cp-sub">${ic("repeat", 11)} ${repText(ev.rrule, ev.date)}</div>` : ""}</div></div>
      ${ev.todo && todo(ev.todo) ? row(todo(ev.todo).done ? "circle-check" : "circle", `<div>Time for a ToDo${todo(ev.todo).done ? " · done" : ""}</div><div class="cp-foot cp-left"><button class="btn sm" data-a="cal-task-done:${ev.todo}">${todo(ev.todo).done ? "Mark as open" : "Mark ToDo complete"}</button><button class="btn sm ghost" data-a="go:pin/todos">Open ToDos</button></div>`) : ""}
      ${ev.meet ? row("video", `<button class="btn sm primary" data-a="cal-join:${esc(ev.meet)}">Join with Chameleon Meet</button><div class="cp-sub mono">${esc(ev.meet)}</div>`) : ""}
      ${ev.loc ? row("map-pin", esc(ev.loc)) : ""}
      ${people.length ? row("users", `<div>${people.length} guests</div><div class="cp-sub">${count}</div><div class="cp-guests">${people.map(p => `<div class="cp-g">${av(p.name, 20)}<span class="cp-gn">${esc(p.name)}${p.org ? ' <span class="cp-sub">· Organizer</span>' : ""}</span>${rsvpIc(p.rsvp)}</div>`).join("")}</div>`) : ""}
      ${ev.desc ? row("align-left", `<div class="cp-desc">${esc(ev.desc)}</div>`) : ""}
      ${ev.reminders && ev.reminders.length ? row("bell", ev.reminders.map(remText).join(", ")) : ""}
      ${row(ev.type === "focus" ? "headphones" : "calendar", `${esc(c ? c.name : "")}${ev.type === "focus" ? " · Focus time" : ""}${ev.busy === "free" ? " · Free" : ""}${ev.vis === "private" ? " · Private" : ev.vis === "public" ? " · Public" : ""}`)}
      ${ev.org && !locked ? `<div class="cp-rsvp"><span>Going?</span>${[["yes", "Yes"], ["no", "No"], ["maybe", "Maybe"]].map(([k, l]) => `<button class="${ev.rsvp === k ? "on" : ""}" data-a="cal-rsvp:${o.key}|${k}">${l}</button>`).join("")}</div>` : ""}`;
  }
  function taskPopHtml(t) {
    const f = folder(t.folder), pr = prio(t.prio);
    return `<div class="cp-acts"><button class="ib" data-a="cal-task-del:${t.id}" title="Move to trash">${ic("trash-2", 15)}</button><button class="ib" data-a="cal-popx" title="Close  Esc">${ic("x", 15)}</button></div>
      <div class="cp-head"><span class="cp-sw task">${ic(t.done ? "circle-check" : "circle", 15)}</span><div><div class="cp-t${t.done ? " done" : ""}">${esc(t.text)}</div><div class="cp-sub">${fmtLong(dueIso(t))} · ToDo</div></div></div>
      ${f ? `<div class="cp-row">${folderIcon(f, 15)}<div>${esc(fpath(f.id).map(p => p.name).join(" / "))}</div></div>` : ""}
      ${pr.id ? `<div class="cp-row">${ic(pr.icon, 15, pr.color)}<div>${pr.name}</div></div>` : ""}
      <div class="cp-foot"><button class="btn sm" data-a="go:pin/todos">Open ToDos</button><button class="btn sm primary" data-a="cal-task-done:${t.id}">${t.done ? "Mark as open" : "Mark complete"}</button></div>`;
  }
  const openOccPop = (el, key) => { const o = occFind(key); if (!o) return; openCalPop(el, occPopHtml(o)); calPop.dataset.key = key; };
  const openTaskPop = (el, id) => { const t = todo(id); if (t) openCalPop(el, taskPopHtml(t)); };
  const CQ_TYPES = [["event", "Event"], ["focus", "Focus time"], ["task", "Task"]];
  function quickHtml() {
    const g = S.cal.ghost, c = calOf(g.cal) || {};
    const when = g.allDay ? (g.end && g.end !== g.date ? `${fmtLong(g.date)} – ${fmtLong(g.end)}` : fmtLong(g.date)) : `${fmtLong(g.date)} · ${fmtT(g.start)} – ${fmtT(g.end)}`;
    return `<div class="cp-acts"><button class="ib" data-a="cal-popx" title="Close  Esc">${ic("x", 15)}</button></div>
      <input id="cq-title" class="cq-title" placeholder="${g.type === "task" ? "Add a ToDo" : "Add title"}" autocomplete="off" value="${esc(g.title || "")}">
      <div class="seg cq-types">${CQ_TYPES.map(([k, l]) => `<button class="${g.type === k ? "on" : ""}" data-a="cq-type:${k}">${l}</button>`).join("")}</div>
      <div class="cp-row">${ic("clock", 15, "var(--text-tertiary)")}<div>${when}</div></div>
      ${g.type === "task" ? "" : `<div class="cp-row">${ic("calendar", 15, "var(--text-tertiary)")}<div><button class="chip" data-a="cq-cal"><i class="cal-dot" style="--c:${calCol(c)}"></i>${esc(c.name || "Calendar")}${ic("chevron-down", 12)}</button></div></div>`}
      <div class="cp-foot">${g.type === "task" ? "" : `<button class="btn sm ghost" data-a="cq-more">More options</button>`}<button class="btn sm primary" data-a="cq-save">Save</button></div>`;
  }
  function startQuick(g) {
    if (calPop) { calPop.remove(); calPop = null; }
    S.cal.ghost = Object.assign({ cal: defCal(), type: "event" }, g, g.allDay ? { end: g.end || g.date } : {});
    render();
    const el = document.querySelector(".cal-main .ghost"); if (!el) return;
    openCalPop(el, quickHtml(), "qc"); calPop.querySelector("#cq-title").focus();
  }
  function redrawQuick() {
    const t = calPop && calPop.querySelector("#cq-title"); if (!t) return;
    S.cal.ghost.title = t.value; calPop.innerHTML = quickHtml();
    const n = calPop.querySelector("#cq-title"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
  }
  const newEvent = (g, title = "") => ({ id: uid("e"), title: title || (g.type === "focus" ? "Focus time" : ""), type: g.type !== "event" ? g.type : undefined, cal: g.cal || defCal(), date: g.date,
    endDate: g.end && g.allDay && g.end !== g.date ? g.end : undefined, allDay: !!g.allDay, start: g.allDay ? undefined : g.start, end: g.allDay ? undefined : g.end,
    reminders: !g.allDay && CP().reminder ? [CP().reminder] : [], guests: [], exdates: [], busy: g.type === "focus" ? "busy" : undefined });
  function saveQuick() {
    const g = S.cal.ghost; if (!g) return;
    const title = calPop.querySelector("#cq-title").value.trim(), snap = calSnap();
    if (g.type === "task") D.todos.unshift({ id: uid("t"), text: title || "Untitled ToDo", due: fmtDay(fromIso(g.date)), prio: 0, folder: null });
    else D.events.push(newEvent(g, title));
    closeCalPop(true); render(); undoToast(g.type === "task" ? "ToDo created" : "Event saved", snap);
  }
  function openNew(type = "event") {
    if (type === "task") return openTodoDialog({ due: fmtDay(fromIso(S.cal.date)) });
    const s = S.cal.date === TODAY_ISO ? Math.min(1380, Math.ceil((nowMin() + 1) / 60) * 60) : 540;
    openEditor(null, newEvent({ type, date: S.cal.date, start: s, end: Math.min(1440, s + CP().duration), allDay: false }));
  }

  /* undo: a snapshot of events and ToDos taken before each change */
  let calUndo = null;
  const calSnap = () => JSON.stringify({ events: D.events, todos: D.todos });
  function undoToast(text, snap) {
    calUndo = snap; document.querySelectorAll(".toast").forEach(t => t.remove());
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = ic("check", 14, "var(--success)") + esc(text) + `<button class="btn sm ghost" data-a="cal-undo">Undo</button>`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 6000);
  }

  /* event editor (full dialog) */
  const MEET = () => "meet.chameleon.app/" + [3, 4, 3].map(n => Array.from({ length: n }, () => "abcdefghijkmnpqrstuvwxyz"[Math.floor(Math.random() * 24)]).join("")).join("-");
  function repKey(r, date) {
    if (!r) return "none";
    if ((r.interval || 1) > 1 || r.count || r.until) return "custom";
    if (r.freq !== "weekly") return r.freq;
    const days = (r.days && r.days.length ? r.days : [fromIso(date).getDay()]).slice().sort();
    return days.join() === "1,2,3,4,5" ? "weekdays" : days.length === 1 && days[0] === fromIso(date).getDay() ? "weekly" : "custom";
  }
  function setRep(v) {
    const d = S.cal.ed.d, dow = fromIso(d.date).getDay();
    S.cal.custom = v === "custom";
    d.rrule = { none: undefined, daily: { freq: "daily", interval: 1 }, weekly: { freq: "weekly", interval: 1, days: [dow] }, weekdays: { freq: "weekly", interval: 1, days: [1, 2, 3, 4, 5] }, monthly: { freq: "monthly", interval: 1 }, yearly: { freq: "yearly", interval: 1 }, custom: d.rrule || { freq: "weekly", interval: 1, days: [dow] } }[v];
  }
  function editorHtml() {
    const d = S.cal.ed.d, isNew = !D.events.some(e => e.id === d.id), c = calOf(d.cal) || {}, day = fromIso(d.date), r = d.rrule;
    const repVal = S.cal.custom && r ? "custom" : repKey(r, d.date);
    const repOpts = [["none", "Does not repeat"], ["daily", "Daily"], ["weekly", "Weekly on " + DAYS_LONG[day.getDay()]], ["weekdays", "Every weekday (Monday to Friday)"], ["monthly", "Monthly on day " + day.getDate()], ["yearly", `Annually on ${day.getDate()} ${MONTHS_LONG[day.getMonth()]}`], ["custom", "Custom…"]];
    const ends = !r ? "never" : r.until ? "on" : r.count ? "after" : "never";
    const custom = repVal === "custom" ? `<div class="ce-custom"><span>Repeat every</span><input class="input ce-num" id="ce-iv" type="number" min="1" value="${r.interval || 1}">
        <select class="input ce-sel" id="ce-freq">${[["daily", "days"], ["weekly", "weeks"], ["monthly", "months"], ["yearly", "years"]].map(([f, l]) => `<option value="${f}"${r.freq === f ? " selected" : ""}>${l}</option>`).join("")}</select>
        ${r.freq === "weekly" ? `<div class="ce-wds">${[1, 2, 3, 4, 5, 6, 0].map(k => `<button class="${(r.days || [day.getDay()]).includes(k) ? "on" : ""}" data-a="ce-wd:${k}" title="${DAYS_LONG[k]}">${DAYS_LONG[k][0]}</button>`).join("")}</div>` : ""}
        <div class="ce-ends"><span>Ends</span><div class="seg">${[["never", "Never"], ["on", "On"], ["after", "After"]].map(([k, l]) => `<button class="${ends === k ? "on" : ""}" data-a="ce-ends:${k}">${l}</button>`).join("")}</div>
        ${ends === "on" ? `<input class="input ce-date" id="ce-until" type="date" value="${r.until}">` : ends === "after" ? `<input class="input ce-num" id="ce-count" type="number" min="1" value="${r.count}"><span>occurrences</span>` : ""}</div></div>` : "";
    const clash = overlaps(d), busyGuest = name => overlaps(d, o => o.ev.org === name || (o.ev.guests || []).some(g => g.name === name)).length > 0;
    const guests = d.guests.map(g => `<span class="chip ce-guest"${busyGuest(g.name) ? ' title="Busy at this time"' : ""}>${av(g.name, 16)}${esc(g.name)}${busyGuest(g.name) ? '<i class="ce-busy"></i>' : ""}<span class="ce-x" data-a="ce-guest-x:${esc(g.name)}" title="Remove">${ic("x", 11)}</span></span>`).join("");
    const rems = (d.reminders || []).map((m, i) => `<div class="ce-rem"><select class="input ce-sel" data-rem="${i}">${REM_OPTS.concat(REM_OPTS.includes(m) ? [] : [m]).map(v => `<option value="${v}"${v === m ? " selected" : ""}>${remText(v)}</option>`).join("")}</select><button class="ib sm" data-a="ce-rem-x:${i}" title="Remove notification">${ic("x", 13)}</button></div>`).join("");
    const field = (icon, body) => `<div class="ce-f">${ic(icon, 16, "var(--text-tertiary)")}<div class="ce-fb">${body}</div></div>`;
    const seg = (act, cur, opts) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? "on" : ""}" data-a="${act}:${k}">${l}</button>`).join("")}</div>`;
    return `<div class="dialog cal-ed" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb">${ic("calendar", 13)}Calendar</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">${isNew ? "New event" : "Edit event"}</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db">
        <input class="big" id="ce-title" placeholder="Add title" value="${esc(d.title || "")}" autocomplete="off">
        <div class="ce-types">${seg("ce-type", d.type || "event", CQ_TYPES)}</div>
        ${field("clock", `<div class="ce-when"><input class="input ce-date" id="ce-date" type="date" value="${d.date}">${d.allDay ? "" : `<input class="input ce-time" id="ce-start" type="time" step="900" value="${minToInput(d.start)}"><span>–</span>${d.endDate ? `<input class="input ce-date" id="ce-enddate" type="date" value="${d.endDate}">` : ""}<input class="input ce-time" id="ce-end" type="time" step="900" value="${minToInput(d.end)}">`}${d.allDay ? `<span>–</span><input class="input ce-date" id="ce-enddate" type="date" value="${d.endDate || d.date}">` : ""}</div>
          <div class="ce-when"><label class="ce-check"><button class="switch${d.allDay ? " on" : ""}" data-a="ce-allday" role="switch" aria-checked="${!!d.allDay}"></button>All day</label>${d.allDay ? "" : `<label class="ce-check"><button class="switch${d.endDate ? " on" : ""}" data-a="ce-multi" role="switch" aria-checked="${!!d.endDate}"></button>Ends another day</label>`}<span class="mono ce-tz">GMT${tzLabel()}</span></div>
          ${clash.length ? `<div class="ce-hint">${ic("circle-alert", 13)}Overlaps with ${clash.map(o => `${evTitle(o.ev)} (${fmtT(o.ev.start)})`).join(", ")}</div>` : ""}
          <select class="input ce-sel" id="ce-rep">${repOpts.map(([k, l]) => `<option value="${k}"${repVal === k ? " selected" : ""}>${l}</option>`).join("")}</select>${custom}`)}
        ${field("users", `<div class="ce-guests">${guests}<input class="input ce-gin" id="ce-guest" placeholder="Add guests — name or email, then Enter" autocomplete="off"></div>`)}
        ${field("video", d.meet ? `<span class="chip">${ic("video", 13)}<span class="mono">${esc(d.meet)}</span><span class="ce-x" data-a="ce-meet-x" title="Remove">${ic("x", 11)}</span></span>` : `<button class="btn sm" data-a="ce-meet">${ic("video", 13)}Add Chameleon Meet video conferencing</button>`)}
        ${field("map-pin", `<input class="input ce-wide" id="ce-loc" placeholder="Add location" value="${esc(d.loc || "")}" autocomplete="off">`)}
        ${field("bell", `${rems}<button class="btn sm ghost" data-a="ce-rem-add">${ic("plus", 13)}Add notification</button>`)}
        ${field("calendar", `<div class="ce-row"><button class="chip" data-a="ce-cal"><i class="cal-dot" style="--c:${calCol(c)}"></i>${esc(c.name || "Calendar")}${ic("chevron-down", 12)}</button>
          <div class="ce-colors"><button class="fd-color${!d.color ? " on" : ""}" data-a="ce-color:none" title="Calendar colour" style="background:${calCol(c)}"></button><span class="ce-csep"></span>${Object.keys(CAL_COLORS).map(k => `<button class="fd-color${d.color === k ? " on" : ""}" data-a="ce-color:${k}" title="${CAL_COLOR_NAMES[k]}" style="background:${CAL_COLORS[k]}"></button>`).join("")}</div></div>`)}
        ${field("folder", folderField(d.folder, "ce-folder"))}
        ${field("briefcase", `<div class="ce-row">${seg("ce-busy", d.busy || "busy", [["busy", "Busy"], ["free", "Free"]])}<select class="input ce-sel" id="ce-vis">${[["default", "Default visibility"], ["public", "Public"], ["private", "Private"]].map(([k, l]) => `<option value="${k}"${(d.vis || "default") === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>`)}
        ${field("align-left", `<textarea id="ce-desc" class="ce-desc" placeholder="Add description">${esc(d.desc || "")}</textarea>`)}
      </div>
      <div class="df">${isNew ? "" : `<button class="btn danger-btn" data-a="ce-del">${ic("trash-2", 14)}Delete</button>`}<span style="flex:1"></span><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="ce-save">Save ${kbd([MOD, "⏎"])}</button></div></div>`;
  }
  function openEditor(occKey, draft) {
    closeCalPop(true);
    const o = occKey && occFind(occKey); if (!o && !draft) return;
    const d = draft || JSON.parse(JSON.stringify(o.ev));
    if (o && !draft) { const span = d.endDate ? isoDiff(d.date, d.endDate) : 0; d.date = o.date; if (span) d.endDate = addIso(o.date, span); } // edit the clicked occurrence's dates
    if (!d.allDay && d.start == null) { d.start = 540; d.end = 600; }
    d.reminders = d.reminders || []; d.guests = d.guests || [];
    S.cal.ed = { d, occ: o ? occKey : null }; S.cal.custom = false;
    openLayer(editorHtml(), l => l.querySelector("#ce-title").focus());
    render();
  }
  // keep what was typed, then redraw the dialog in place
  function syncEd() {
    if (!layer || !S.cal.ed || !layer.querySelector(".cal-ed")) return;
    const d = S.cal.ed.d, v = id => { const el = layer.querySelector("#" + id); return el ? el.value : null; };
    d.title = v("ce-title") ?? d.title;
    if (v("ce-date")) d.date = v("ce-date");
    if (v("ce-start") != null) { d.start = inputToMin(v("ce-start")); d.end = inputToMin(v("ce-end")) || 1440; }
    if (v("ce-enddate")) d.endDate = v("ce-enddate");
    if (d.endDate && d.endDate < d.date) d.endDate = d.date;
    d.loc = v("ce-loc") ?? d.loc; d.desc = v("ce-desc") ?? d.desc; d.vis = v("ce-vis") || d.vis;
    layer.querySelectorAll("[data-rem]").forEach(s => d.reminders[+s.dataset.rem] = +s.value);
    const r = d.rrule;
    if (r && v("ce-iv")) { r.interval = Math.max(1, +v("ce-iv") || 1); r.freq = v("ce-freq") || r.freq; if (v("ce-until")) r.until = v("ce-until"); if (v("ce-count")) r.count = Math.max(1, +v("ce-count") || 1); }
  }
  function redrawEd() {
    syncEd(); if (!layer || !layer.querySelector(".cal-ed")) return;
    const st = layer.querySelector(".db").scrollTop; layer.innerHTML = editorHtml(); layer.firstElementChild.style.animation = "none"; layer.querySelector(".db").scrollTop = st;
  }
  function addGuest(name) {
    const d = S.cal.ed.d; name = name.trim(); if (!name || name === D.me || d.guests.some(g => g.name.toLowerCase() === name.toLowerCase())) return;
    d.guests.push({ name }); if (!D.people[name]) D.people[name] = "var(--gray-6)"; redrawEd(); const i = layer.querySelector("#ce-guest"); i && i.focus();
  }
  function saveEd() {
    syncEd(); const { d, occ } = S.cal.ed;
    if (d.type === "task") { closeLayer(); openTodoDialog({ due: fmtDay(fromIso(d.date)) }); const t = layer.querySelector("#dtitle"); t.value = d.title || ""; return; }
    if (d.allDay) { delete d.start; delete d.end; if (d.endDate === d.date) delete d.endDate; }
    else { if (d.endDate === d.date) delete d.endDate; if (!d.endDate && d.end <= d.start) d.end = Math.min(1440, d.start + CP().duration); }
    d.title = (d.title || "").trim(); ["loc", "desc", "folder"].forEach(k => { if (!(d[k] || "").trim()) delete d[k]; });
    if (d.folder) revealFolder(d.folder);
    if (d.vis === "default") delete d.vis; if (d.type === "event") delete d.type; if (d.busy === "busy") delete d.busy;
    if (d.rrule && d.rrule.freq !== "weekly") delete d.rrule.days;
    const orig = D.events.find(e => e.id === d.id);
    if (!orig) { const snap = calSnap(); D.events.push(d); return finishEd("Event saved", snap); }
    if (orig.rrule && occ) return askScope("Edit recurring event", scope => applyEdit(orig, occ.split("@")[1], d, scope));
    const snap = calSnap(); Object.keys(orig).forEach(k => delete orig[k]); Object.assign(orig, d); finishEd("Event saved", snap);
  }
  function finishEd(text, snap) { S.cal.ed = null; closeLayer(); render(); undoToast(text, snap); }
  // apply a changed occurrence `d` of the series `ev` to this occurrence, this and the following ones, or the whole series
  function applyEdit(ev, occDate, d, scope) {
    const snap = calSnap();
    if (scope === "all" || (scope === "following" && occDate === ev.date)) {
      const shift = isoDiff(occDate, d.date), span = d.endDate ? isoDiff(d.date, d.endDate) : 0, start = addIso(ev.date, shift);
      if (shift && d.rrule && d.rrule.freq === "weekly" && d.rrule.days && d.rrule.days.length === 1) d.rrule.days = [fromIso(d.date).getDay()];
      Object.keys(ev).forEach(k => delete ev[k]); Object.assign(ev, d, { date: start, endDate: span ? addIso(start, span) : undefined, exdates: shift ? [] : (d.exdates || []) });
    } else if (scope === "following") {
      ev.rrule = Object.assign({}, ev.rrule, { until: addIso(occDate, -1) });
      const next = Object.assign({}, d, { id: uid("e"), exdates: [] }); if (next.rrule) { next.rrule = Object.assign({}, next.rrule); delete next.rrule.count; }
      D.events.push(next);
    } else { // this event only: it leaves the series as a single event
      ev.exdates = (ev.exdates || []).concat(occDate);
      const one = Object.assign({}, d, { id: uid("e"), of: ev.id }); delete one.rrule; delete one.exdates; D.events.push(one);
    }
    finishEd("Event saved", snap);
  }
  function askScope(title, cb) {
    S.cal.scopeCb = cb;
    openLayer(`<div class="dialog" style="width:min(380px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">${esc(title)}</span></div>
      <div class="db cal-scope">${[["this", "This event"], ["following", "This and following events"], ["all", "All events"]].map(([k, l], i) => `<label><input type="radio" name="scope" value="${k}"${i ? "" : " checked"}>${l}</label>`).join("")}</div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="cal-scope">OK</button></div></div>`, l => l.querySelector(".btn.primary").focus());
  }
  function delOcc(key) {
    const o = occFind(key); if (!o || evLocked(o.ev)) return;
    closeCalPop(true);
    const ev = o.ev, drop = () => { D.events = D.events.filter(e => e !== ev && e.of !== ev.id); };
    if (!ev.rrule) { const snap = calSnap(); drop(); S.cal.ed = null; closeLayer(); render(); return undoToast("Event deleted", snap); }
    askScope("Delete recurring event", scope => {
      const snap = calSnap();
      if (scope === "all" || (scope === "following" && o.date === ev.date)) drop();
      else if (scope === "following") ev.rrule = Object.assign({}, ev.rrule, { until: addIso(o.date, -1) });
      else ev.exdates = (ev.exdates || []).concat(o.date);
      S.cal.ed = null; render(); undoToast("Event deleted", snap);
    });
  }
  // move / resize from dragging: shift in days and/or new start and end minutes
  function patchOcc(o, p) {
    const ev = o.ev, shift = p.shift != null ? p.shift : isoDiff(o.date, p.day);
    if (!shift && (p.s == null || (p.s === ev.start && p.e === ev.end))) return render();
    const change = d => { d.date = addIso(o.date, shift); if (ev.endDate) d.endDate = addIso(o.end, shift); if (p.s != null) { d.start = p.s; d.end = p.e; } };
    if (!ev.rrule) { const snap = calSnap(); change(ev); render(); return undoToast("Event updated", snap); }
    const d = JSON.parse(JSON.stringify(ev)); change(d);
    render(); askScope("Change recurring event", scope => applyEdit(ev, o.date, d, scope));
  }
  function moveTask(id, day) { const t = todo(id); if (!t) return; const snap = calSnap(); t.due = fmtDay(fromIso(day)); render(); undoToast("ToDo moved to " + fmtShort(day), snap); }
  // the same menu from the "…" in the details popover and from a right-click on an event
  function occMenu(el, key) {
    const o = occFind(key); if (!o || evLocked(o.ev)) return;
    const ev = o.ev, set = (k, v) => { const snap = calSnap(); if (v == null) delete ev[k]; else ev[k] = v; closeCalPop(true); render(); undoToast("Event updated", snap); };
    openMenu(el, [
      { icon: "pencil", label: "Edit", kbd: ["E"], run: () => openEditor(key) },
      { icon: "copy", label: "Duplicate", run: () => { const d = JSON.parse(JSON.stringify(ev)); Object.assign(d, { id: uid("e"), date: o.date, endDate: ev.endDate ? o.end : undefined, exdates: [], title: ev.title }); delete d.of; openEditor(null, d); } },
      { icon: "trash-2", color: "var(--danger)", label: "Delete", kbd: ["Del"], run: () => delOcc(key) },
      { head: "Calendar" }, ...D.calendars.filter(c => !c.readonly).map(c => ({ lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${calCol(c)}"></i></span>`, label: c.name, check: ev.cal === c.id, run: () => set("cal", c.id) })),
      { head: "Colour" }, { lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${calCol(calOf(ev.cal))}"></i></span>`, label: "Calendar colour", check: !ev.color, run: () => set("color", null) },
      ...Object.keys(CAL_COLORS).map(k => ({ lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${CAL_COLORS[k]}"></i></span>`, label: CAL_COLOR_NAMES[k], check: ev.color === k, run: () => set("color", k) })),
    ]);
  }

  /* calendars: create, rename, colour, delete */
  function calDialogHtml() {
    const d = S.cal.cdraft;
    return `<div class="dialog" style="width:min(420px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">${d.id ? "Calendar settings" : "Create new calendar"}</span><span style="flex:1"></span><button class="ib" data-a="close">${ic("x")}</button></div>
      <div class="db"><input class="big" id="cc-name" placeholder="Calendar name" value="${esc(d.name)}" autocomplete="off"${d.readonly ? " disabled" : ""}>
        <div class="label-mono" style="margin:12px 0 8px">Colour</div><div class="fd-colors">${Object.keys(CAL_COLORS).map(k => `<button class="fd-color${d.color === k ? " on" : ""}" data-a="cc-color:${k}" title="${CAL_COLOR_NAMES[k]}" style="background:${CAL_COLORS[k]}"></button>`).join("")}</div></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="cc-save">${d.id ? "Save" : "Create calendar"}</button></div></div>`;
  }
  function openCalDialog(id) {
    const c = id ? calOf(id) : { name: "", color: "amber" };
    S.cal.cdraft = { id: id || null, name: c.name, color: c.color, readonly: !!c.readonly };
    openLayer(calDialogHtml(), l => { const n = l.querySelector("#cc-name"); n.focus(); n.select(); });
  }
  function saveCalDialog() {
    const d = S.cal.cdraft, inp = layer.querySelector("#cc-name"), name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    if (d.id) { const c = calOf(d.id); if (!c.readonly) c.name = name; c.color = d.color; toast("Calendar saved"); }
    else { D.calendars.splice(D.calendars.filter(c => !c.other).length, 0, { id: uid("cal"), name, color: d.color }); toast("Calendar created"); }
    S.cal.cdraft = null; closeLayer(); render();
  }

  /* settings dialog */
  function calSettingsHtml() {
    const P = CP(), sw = k => `<button class="switch${P[k] ? " on" : ""}" data-a="calp:${k}" role="switch" aria-checked="${!!P[k]}"></button>`;
    const row = (t, d, ctl) => `<div class="box-row"><div class="l"><b>${t}</b>${d ? `<span>${d}</span>` : ""}</div>${ctl}</div>`;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${P[key] === v ? "on" : ""}" data-a="calp-set:${key}|${v}">${l}</button>`).join("")}</div>`;
    const sel = (id, opts, cur) => `<select class="input ce-sel" id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${l}</option>`).join("")}</select>`;
    return `<div class="dialog cal-set" role="dialog" aria-modal="true"><div class="dh"><span style="font:var(--type-heading)">Calendar settings</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div><div class="db">
      <div class="label-mono cal-set-h">View options</div><div class="box">
        ${row("Start of week", "First column in week and month views.", seg("weekStart", [[6, "Sat"], [0, "Sun"], [1, "Mon"]]))}
        ${row("Time format", "", seg("h12", [[false, "13:00"], [true, "1pm"]]))}
        ${row("Show weekends", "Week and month views.", sw("weekends"))}
        ${row("Show week numbers", "Month view and mini calendar.", sw("weekNums"))}
        ${row("Dim past events", "", sw("dimPast"))}
        ${row("Show declined events", "", sw("declined"))}
        ${row("Show completed ToDos", "", sw("doneTasks"))}</div>
      <div class="label-mono cal-set-h">Event settings</div><div class="box">
        ${row("Default duration", "Used when you click a time slot or press C.", sel("calp-dur", [15, 30, 45, 60, 90, 120].map(m => [m, m + " minutes"]), P.duration))}
        ${row("Default notification", "Added to new timed events.", sel("calp-rem", [[0, "None"], [5, "5 minutes before"], [10, "10 minutes before"], [30, "30 minutes before"], [60, "1 hour before"]], P.reminder))}
        ${row("Working hours", "Hours outside are shaded in day and week views.", `<span class="ce-when"><input class="input ce-time" id="calp-ws" type="time" step="1800" value="${minToInput(P.workStart)}"><span>–</span><input class="input ce-time" id="calp-we" type="time" step="1800" value="${minToInput(P.workEnd)}"></span>`)}</div>
      <div class="label-mono cal-set-h">Import and export</div><div class="box">
        ${row("Import", "Add events from an .ics file — Google Calendar, Outlook or Apple Calendar.", `<button class="btn sm" data-a="cal-import">${ic("upload", 13)}Choose file</button>`)}
        ${row("Export", "Download your events as an .ics file.", `<button class="btn sm" data-a="cal-export">${ic("download", 13)}Export</button>`)}</div>
    </div></div>`;
  }
  function redrawSettings() { if (!layer || !layer.querySelector(".cal-set")) return; const st = layer.querySelector(".db").scrollTop; layer.innerHTML = calSettingsHtml(); layer.firstElementChild.style.animation = "none"; layer.querySelector(".db").scrollTop = st; render(); }
  function goToDate() {
    openLayer(`<div class="dialog" style="width:min(340px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">Go to date</span></div>
      <div class="db"><input class="input" id="gd-date" type="date" value="${S.cal.date}" style="width:100%"></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="cal-gd">Go</button></div></div>`, l => l.querySelector("#gd-date").focus());
  }

  /* .ics import and export */
  const ICS_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const icsD = s => s.replace(/-/g, "");
  const icsDT = (s, m) => m >= 1440 ? icsDT(addIso(s, 1), m - 1440) : `${icsD(s)}T${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
  function calExport() {
    const evs = D.events.filter(ev => !evLocked(ev)), L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Chameleon//Calendar//EN", "CALSCALE:GREGORIAN"];
    evs.forEach(ev => {
      const end = ev.endDate || ev.date, r = ev.rrule;
      L.push("BEGIN:VEVENT", `UID:${ev.id}@chameleon.app`, "SUMMARY:" + icsEsc(ev.title || ""));
      if (ev.allDay) L.push("DTSTART;VALUE=DATE:" + icsD(ev.date), "DTEND;VALUE=DATE:" + icsD(addIso(end, 1)));
      else L.push("DTSTART:" + icsDT(ev.date, ev.start), "DTEND:" + icsDT(end, ev.end));
      if (r) L.push("RRULE:" + [`FREQ=${r.freq.toUpperCase()}`, r.interval > 1 ? "INTERVAL=" + r.interval : "", r.freq === "weekly" && r.days ? "BYDAY=" + r.days.map(k => ICS_DAYS[k]).join(",") : "", r.count ? "COUNT=" + r.count : "", r.until ? `UNTIL=${icsD(r.until)}T235959` : ""].filter(Boolean).join(";"));
      (ev.exdates || []).forEach(x => L.push(ev.allDay ? "EXDATE;VALUE=DATE:" + icsD(x) : "EXDATE:" + icsDT(x, ev.start)));
      if (ev.loc) L.push("LOCATION:" + icsEsc(ev.loc));
      if (ev.desc) L.push("DESCRIPTION:" + icsEsc(ev.desc));
      (ev.reminders || []).forEach(m => L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Reminder", `TRIGGER:-PT${m}M`, "END:VALARM"));
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([L.join("\r\n")], { type: "text/calendar" })); a.download = "chameleon-calendar.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast(`Exported ${evs.length} ${evs.length === 1 ? "event" : "events"}`);
  }
  function calImport() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".ics,text/calendar";
    inp.onchange = () => { const f = inp.files[0]; if (f) f.text().then(importIcs); };
    inp.click();
  }
  function importIcs(txt) {
    const un = s => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1"), snap = calSnap(), cal = defCal();
    const dt = v => { const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{0,2}(Z)?)?/); if (!m) return null; if (!m[4]) return { date: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
      if (m[6]) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])); return { date: iso(d), min: d.getHours() * 60 + d.getMinutes() }; }
      return { date: `${m[1]}-${m[2]}-${m[3]}`, min: +m[4] * 60 + +m[5] }; };
    let cur = null, alarm = false, n = 0;
    txt.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).forEach(line => {
      const i = line.indexOf(":"); if (i < 0) return;
      const key = line.slice(0, i).split(";")[0].toUpperCase(), val = line.slice(i + 1);
      if (key === "BEGIN" && val === "VEVENT") { cur = { id: uid("e"), title: "", cal, reminders: [], exdates: [] }; return; }
      if (!cur) return;
      if (key === "BEGIN" && val === "VALARM") alarm = true;
      else if (key === "END" && val === "VALARM") alarm = false;
      else if (key === "END" && val === "VEVENT") {
        const e = cur._end; delete cur._end;
        if (cur.date) {
          if (cur.allDay) { if (e && e.allDay && addIso(e.date, -1) > cur.date) cur.endDate = addIso(e.date, -1); }
          else if (e && !e.allDay) { cur.end = e.min; if (e.date !== cur.date) { if (e.min === 0 && isoDiff(cur.date, e.date) === 1) cur.end = 1440; else cur.endDate = e.date; } }
          else cur.end = Math.min(1440, cur.start + 60);
          if (!cur.reminders.length) delete cur.reminders;
          D.events.push(cur); n++;
        }
        cur = null;
      } else if (alarm) { const m = key === "TRIGGER" && val.match(/-P(?:(\d+)W)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/); if (m) cur.reminders.push((+m[1] || 0) * 10080 + (+m[2] || 0) * 1440 + (+m[3] || 0) * 60 + (+m[4] || 0)); }
      else if (key === "SUMMARY") cur.title = un(val);
      else if (key === "LOCATION") cur.loc = un(val);
      else if (key === "DESCRIPTION") cur.desc = un(val);
      else if (key === "DTSTART") { const d = dt(val); if (d) { cur.date = d.date; if (d.allDay) cur.allDay = true; else cur.start = d.min; } }
      else if (key === "DTEND") cur._end = dt(val);
      else if (key === "EXDATE") val.split(",").forEach(x => { const d = dt(x); if (d) cur.exdates.push(d.date); });
      else if (key === "RRULE") {
        const p = {}; val.split(";").forEach(kv => { const [k, v] = kv.split("="); p[k] = v; });
        const fr = (p.FREQ || "").toLowerCase();
        if (["daily", "weekly", "monthly", "yearly"].includes(fr)) cur.rrule = { freq: fr, interval: +p.INTERVAL || 1, days: fr === "weekly" && p.BYDAY ? p.BYDAY.split(",").map(x => ICS_DAYS.indexOf(x.slice(-2))).filter(x => x >= 0) : undefined, count: +p.COUNT || undefined, until: p.UNTIL ? (dt(p.UNTIL) || {}).date : undefined };
      }
    });
    closeLayer(); render();
    n ? undoToast(`Imported ${n} ${n === 1 ? "event" : "events"}`, snap) : toast("No events found in that file");
  }

  /* reminders: a notification lands in the inbox when an event of today is about to start */
  function calReminderTick() {
    const now = nowMin(), fired = D.calFired = D.calFired || []; let hit = false;
    calOccs(TODAY_ISO, TODAY_ISO).forEach(o => {
      const ev = o.ev; if (ev.allDay || o.date !== TODAY_ISO || ev.rsvp === "no") return;
      (ev.reminders || []).forEach(r => {
        const k = o.key + "|" + r; if (fired.includes(k) || now < ev.start - r || now >= ev.start + 1) return;
        fired.push(k); hit = true;
        D.inbox.unshift({ id: Date.now() + fired.length, kind: "reminder", title: ev.title || "(No title)", body: `Starts at ${fmtT(ev.start)}${ev.loc ? " · " + ev.loc : ""}`, time: "now", unread: true, link: "pin/calendar" });
        toast(`${ev.title || "(No title)"} starts at ${fmtT(ev.start)}`);
      });
    });
    if (!hit) return;
    const a = document.activeElement; if (!layer && !calPop && !(a && /INPUT|TEXTAREA/.test(a.tagName))) render(); else save();
  }
  setInterval(calReminderTick, 30000); setTimeout(calReminderTick, 1500);
  setInterval(() => document.querySelectorAll(".cal-now").forEach(n => n.style.top = nowMin() / 60 * HOUR + "px"), 60000);

  // keyboard shortcuts on the calendar page (Google Calendar's keys); returns true when handled
  function calKey(e) {
    const k = e.key, pk = calPop && calPop.dataset.key, views = { d: "day", w: "week", m: "month", y: "year", s: "schedule", x: "4day" };
    const act = { t: () => calGoto(TODAY_ISO), j: () => calStep(1), n: () => calStep(1), ArrowRight: () => calStep(1), k: () => calStep(-1), p: () => calStep(-1), ArrowLeft: () => calStep(-1), c: () => openNew(), g: goToDate, "/": () => { const q = document.getElementById("cal-q"); q && q.focus(); } };
    if (pk && k === "e") openEditor(pk);
    else if (pk && (k === "Delete" || k === "Backspace")) delOcc(pk);
    else if (views[k]) setView(views[k]);
    else if (act[k]) act[k]();
    else return false;
    e.preventDefault(); return true;
  }

  // pointer interactions: drag on empty time to create, drag events to move (also across days), drag the bottom edge to resize;
  // in month view and the all-day row, drag across days to create a multi-day event or drag a chip to another day
  let cdrag = null, calSwallow = 0;
  const snap15 = m => Math.round(m / 15) * 15;
  const yToMin = (col, y) => Math.max(0, Math.min(1440, (y - col.getBoundingClientRect().top) / HOUR * 60));
  const colAt = x => [...document.querySelectorAll(".cal-main .cal-col")].find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; });
  const dayAt = (x, y) => [...document.querySelectorAll(".cal-main [data-day]:not(.cal-col)")].find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right && y >= r.top && y < r.bottom; });
  document.addEventListener("pointerdown", e => {
    if (e.button !== 0 || S.route !== "pin/calendar") return;
    const st = e.target.closest(".cal-todo[data-sched]");
    if (st) { e.preventDefault(); cdrag = { mode: "todo", id: st.dataset.sched, x0: e.clientX, y0: e.clientY }; return; }
    const main = e.target.closest(".cal-main"), inPop = e.target.closest(".cal-pop"), item = e.target.closest("[data-occ],[data-task]");
    if (item && (main || inPop)) {
      const o = item.dataset.occ && occFind(item.dataset.occ), drag = main && !inPop && /cal-(ev|chip)/.test(item.className) && (item.dataset.task || (o && !evLocked(o.ev)));
      cdrag = { mode: !drag ? "tap" : e.target.classList.contains("cal-rs") ? "resize" : item.classList.contains("cal-ev") ? "move" : "dmove", el: item, o, task: item.dataset.task, x0: e.clientX, y0: e.clientY };
      if (drag) e.preventDefault();
      return;
    }
    if (!main || menuEl || e.target.closest("button,a,input,select")) return;
    if (calPop) { closeCalPop(); calSwallow = Date.now(); return; } // a click next to an open popover only closes it
    const col = e.target.closest(".cal-col"), cell = !col && e.target.closest("[data-day]");
    if (col) { e.preventDefault(); cdrag = { mode: "create", col, day: col.dataset.day, m0: Math.floor(yToMin(col, e.clientY) / 15) * 15, x0: e.clientX, y0: e.clientY }; }
    else if (cell) { e.preventDefault(); cdrag = { mode: "dcreate", day: cell.dataset.day, end: cell.dataset.day, x0: e.clientX, y0: e.clientY }; }
  });
  document.addEventListener("pointermove", e => {
    const d = cdrag; if (!d || d.mode === "tap") return;
    if (!d.moved) { if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 5) return; d.moved = true; document.body.classList.add("cal-dragging"); }
    if (d.mode === "todo") { // a ToDo from the side panel: a time slot in day / week, or a whole day (month, all-day row)
      const t = todo(d.id); if (!t) return;
      if (!d.float) { d.float = document.createElement("div"); d.float.className = "cal-float"; d.float.innerHTML = ic("circle", 12) + esc(t.text); document.body.appendChild(d.float); if (S.cal.side) { S.cal.side = false; document.querySelector(".cal-page").classList.remove("side-on"); } }
      d.float.style.left = e.clientX + 12 + "px"; d.float.style.top = e.clientY + 10 + "px";
      document.querySelectorAll(".cal-main .drop-hi,.cal-main .cal-ev.ghost").forEach(x => x.classList.contains("ghost") ? x.remove() : x.classList.remove("drop-hi"));
      const tg = document.getElementById("cal-tg"), r = tg && tg.getBoundingClientRect(), col = r && e.clientY >= r.top && e.clientY < r.bottom && colAt(e.clientX);
      d.col = col || null; d.cell = null;
      if (col) {
        const dur = t.dur || 60; d.s = Math.min(1440 - 15, Math.floor(yToMin(col, e.clientY) / 15) * 15);
        const g = document.createElement("div"); g.className = "cal-ev ghost";
        Object.assign(g.style, { top: d.s / 60 * HOUR + "px", height: Math.min(dur, 1440 - d.s) / 60 * HOUR - 2 + "px", left: "1px", width: "calc(100% - 4px)" });
        g.innerHTML = `<b>${esc(t.text)}</b><span>${fmtT(d.s)}${t.dur ? " – " + fmtT(Math.min(1440, d.s + dur)) : ""}</span>`; col.appendChild(g);
      } else { const cell = dayAt(e.clientX, e.clientY); if (cell) { d.cell = cell.dataset.day; cell.classList.add("drop-hi"); } }
      return;
    }
    if (d.mode === "move" || d.mode === "resize") {
      const ev = d.o.ev, dm = snap15((e.clientY - d.y0) / HOUR * 60), dur = ev.end - ev.start;
      if (d.mode === "resize") { d.s = ev.start; d.e = Math.max(ev.start + 15, Math.min(1440, ev.end + dm)); d.day = d.o.date; }
      else { d.s = Math.max(0, Math.min(1440 - dur, ev.start + dm)); d.e = d.s + dur; const col = colAt(e.clientX); d.day = col ? col.dataset.day : d.o.date; if (col && d.el.parentNode !== col) col.appendChild(d.el); }
      Object.assign(d.el.style, { top: d.s / 60 * HOUR + "px", height: Math.max(d.e - d.s, 20) / 60 * HOUR - 2 + "px", left: "1px", width: "calc(100% - 4px)" });
      d.el.classList.add("dragging"); const t = d.el.querySelector("span"); if (t) t.textContent = `${fmtT(d.s)} – ${fmtT(d.e)}`;
    } else if (d.mode === "create") {
      const m = yToMin(d.col, e.clientY); d.s = Math.min(d.m0, Math.floor(m / 15) * 15); d.e = Math.max(d.m0 + 15, Math.ceil(m / 15) * 15);
      let g = d.col.querySelector(".cal-ev.ghost"); if (!g) { g = document.createElement("div"); g.className = "cal-ev ghost"; d.col.appendChild(g); }
      Object.assign(g.style, { top: d.s / 60 * HOUR + "px", height: (d.e - d.s) / 60 * HOUR - 2 + "px", left: "1px", width: "calc(100% - 4px)" });
      g.innerHTML = `<b>(No title)</b><span>${fmtT(d.s)} – ${fmtT(d.e)}</span>`;
    } else {
      const cell = dayAt(e.clientX, e.clientY); if (!cell) return;
      if (d.mode === "dmove") { d.target = cell.dataset.day; d.el.classList.add("drag-src"); }
      else d.end = cell.dataset.day;
      const [a, b] = d.mode === "dmove" ? [d.target, d.target] : [d.day, d.end].sort();
      document.querySelectorAll(".cal-main [data-day]:not(.cal-col)").forEach(x => x.classList.toggle("drop-hi", x.dataset.day >= a && x.dataset.day <= b));
    }
  });
  document.addEventListener("pointerup", () => {
    const d = cdrag; if (!d) return;
    cdrag = null; document.body.classList.remove("cal-dragging"); calSwallow = Date.now();
    if (d.mode === "todo") {
      if (d.float) d.float.remove();
      if (!d.moved) { calSwallow = 0; return; } // a plain click opens the duration menu
      document.querySelectorAll(".cal-main .drop-hi,.cal-main .cal-ev.ghost").forEach(x => x.classList.contains("ghost") ? x.remove() : x.classList.remove("drop-hi"));
      const t = todo(d.id), day = d.col ? d.col.dataset.day : d.cell, start = d.col ? d.s : null;
      if (!t || !day) return;
      return t.dur ? scheduleTodo(d.id, day, start, t.dur) : askDuration(d.id, day, start);
    }
    if (!d.moved) {
      if (d.mode === "create") { const s = Math.floor(d.m0 / 30) * 30; return startQuick({ date: d.day, start: s, end: Math.min(1440, s + CP().duration) }); }
      if (d.mode === "dcreate") return startQuick({ date: d.day, allDay: true });
      if (d.task) return openTaskPop(d.el, d.task);
      if (d.o) return openOccPop(d.el, d.o.key);
      return;
    }
    if (d.mode === "create") return startQuick({ date: d.day, start: d.s, end: d.e });
    if (d.mode === "dcreate") { const [a, b] = [d.day, d.end].sort(); return startQuick({ date: a, end: b, allDay: true }); }
    if (d.mode === "dmove") return !d.target ? render() : d.task ? moveTask(d.task, d.target) : patchOcc(d.o, { shift: isoDiff(d.o.date, d.target) });
    patchOcc(d.o, { day: d.day, s: d.s, e: d.e });
  });
  // the click that ends a press on the calendar was already handled on pointerup
  document.addEventListener("click", e => { if (Date.now() - calSwallow < 400 && e.target.closest(".cal-page,.cal-pop")) { calSwallow = 0; e.stopPropagation(); } }, true);
  document.addEventListener("contextmenu", e => {
    const el = e.target.closest(".cal-main [data-occ]"); if (!el) return;
    e.preventDefault(); occMenu({ getBoundingClientRect: () => ({ left: e.clientX, top: e.clientY, bottom: e.clientY }) }, el.dataset.occ);
  });
  document.addEventListener("input", e => {
    if (e.target.id !== "cal-q") return;
    const pos = e.target.selectionStart; S.cal.q = e.target.value; render();
    const q = document.getElementById("cal-q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
  });
  document.addEventListener("change", e => {
    const id = e.target.id, ed = S.cal.ed && S.cal.ed.d;
    if (ed && id === "ce-rep") { syncEd(); setRep(e.target.value); redrawEd(); }
    else if (ed && id === "ce-freq") { syncEd(); if (ed.rrule.freq === "weekly" && !ed.rrule.days) ed.rrule.days = [fromIso(ed.date).getDay()]; redrawEd(); }
    else if (ed && id === "ce-start") { const dur = ed.end - ed.start; syncEd(); ed.end = Math.min(1440, ed.start + dur); redrawEd(); }
    else if (ed && id === "ce-date") { const span = ed.endDate ? isoDiff(ed.date, ed.endDate) : 0; syncEd(); if (span) ed.endDate = addIso(ed.date, span); if (ed.rrule && repKey(ed.rrule, ed.date) === "custom" && !S.cal.custom && ed.rrule.days && ed.rrule.days.length === 1) ed.rrule.days = [fromIso(ed.date).getDay()]; redrawEd(); }
    else if (ed && (id === "ce-end" || id === "ce-enddate")) redrawEd();
    else if (id === "calp-dur" || id === "calp-rem") { CP()[id === "calp-dur" ? "duration" : "reminder"] = +e.target.value; save(); }
    else if (id === "calp-ws" || id === "calp-we") { CP()[id === "calp-ws" ? "workStart" : "workEnd"] = inputToMin(e.target.value); render(); }
  });

  const CAL_A = {
    "cal-today": () => calGoto(TODAY_ISO),
    "cal-step": (v) => calStep(+v),
    "cal-open": (v) => calGoto(v, "day"),
    "cal-goto": (v) => calGoto(v),
    "cal-month": (v) => calGoto(v, "month"),
    "cal-mini": (v) => { const m = fromIso(S.cal.mini || S.cal.date); S.cal.mini = iso(new Date(m.getFullYear(), m.getMonth() + +v, 1)); render(); },
    "cal-q-clear": () => { S.cal.q = ""; render(); },
    "cal-side": () => { S.cal.side = !S.cal.side; render(); },
    "cal-todos-fold": () => { store.set("calTodos", !store.get("calTodos", true)); render(); },
    "cal-tdmenu": (v, el) => { const t = todo(v); if (!t) return;
      openMenu(el, [{ head: "Duration" }, ...DUR_OPTS.map(m => ({ icon: "timer", label: fmtDur(m), check: t.dur === m, run: () => { t.dur = m; render(); } })), "-", { icon: "timer-off", label: "No duration", check: !t.dur, run: () => { delete t.dur; render(); } }]); },
    "cal-tdur": (v) => { const p = S.cal.pend; if (!p) return;
      const m = v === "custom" ? Math.round((parseFloat((calPop.querySelector("#cd-h").value || "").replace(",", ".")) || 0) * 4) * 15 : +v;
      if (!m) { calPop.querySelector("#cd-h").focus(); return; }
      S.cal.pend = null; scheduleTodo(p.id, p.date, p.start, Math.min(m, 1440)); },
    "cal-viewmenu": (v, el) => { const P = CP(), tog = k => () => { P[k] = !P[k]; render(); };
      openMenu(el, CAL_VIEWS.map(([k, l, key, icon]) => ({ icon, label: l, check: S.cal.view === k && !S.cal.q, kbd: [key], run: () => setView(k) }))
        .concat(["-", { icon: "calendar-days", label: "Show weekends", check: P.weekends, run: tog("weekends") }, { icon: "calendar-off", label: "Show declined events", check: P.declined, run: tog("declined") }, { icon: "circle-check", label: "Show completed ToDos", check: P.doneTasks, run: tog("doneTasks") }])); },
    "cal-more": (v, el) => openMenu(el, [
      { icon: "calendar-search", label: "Go to date", kbd: ["G"], run: goToDate },
      { icon: "settings", label: "Settings", run: () => A["cal-settings"]() }, "-",
      { icon: "upload", label: "Import .ics", run: calImport },
      { icon: "download", label: "Export .ics", run: calExport }, "-",
      { icon: "keyboard", label: "Keyboard shortcuts", run: openShortcuts }]),
    "cal-settings": () => openLayer(calSettingsHtml()),
    "calp": (k) => { CP()[k] = !CP()[k]; redrawSettings(); },
    "calp-set": (v) => { const [k, x] = v.split("|"); CP()[k] = x === "true" ? true : x === "false" ? false : +x; redrawSettings(); },
    "cal-import": () => calImport(),
    "cal-export": () => calExport(),
    "cal-gd": () => { const v = layer.querySelector("#gd-date").value; closeLayer(); if (v) { S.cal.scroll = true; calGoto(v); } },
    "cal-create": (v, el) => openMenu(el, [{ icon: "calendar-plus", label: "Event", kbd: ["C"], run: () => openNew() }, { icon: "headphones", label: "Focus time", run: () => openNew("focus") }, { icon: "circle", label: "Task (ToDo)", run: () => openNew("task") }]),
    "cal-vis": (v) => { const c = calOf(v); c.hidden = !c.hidden; render(); },
    "cal-tasks": () => { CP().tasksHidden = !CP().tasksHidden; render(); },
    "cal-add": () => openCalDialog(null),
    "cal-cmenu": (v, el) => { const c = calOf(v), own = D.calendars.filter(x => !x.other);
      openMenu(el, [
        { icon: "eye", label: "Display this only", run: () => { D.calendars.forEach(x => x.hidden = x.id !== v); CP().tasksHidden = true; render(); } },
        { icon: c.hidden ? "eye" : "eye-off", label: c.hidden ? "Show" : "Hide", run: () => A["cal-vis"](v) },
        { icon: "settings-2", label: "Settings…", run: () => openCalDialog(v) },
        { head: "Colour" }, ...Object.keys(CAL_COLORS).map(k => ({ lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${CAL_COLORS[k]}"></i></span>`, label: CAL_COLOR_NAMES[k], check: c.color === k, run: () => { c.color = k; render(); } })),
        ...(c.readonly ? [] : ["-", { icon: "trash-2", color: "var(--danger)", label: "Delete calendar…", run: () => {
          if (own.length < 2) return toast("Keep at least one calendar");
          const n = D.events.filter(e => e.cal === v).length;
          confirmDelete("Delete calendar?", `“${c.name}”${n ? ` and its ${n} ${n === 1 ? "event" : "events"}` : ""} will be removed. This can’t be undone.`, () => { D.calendars = D.calendars.filter(x => x.id !== v); D.events = D.events.filter(e => e.cal !== v); render(); toast("Calendar deleted"); });
        } }])]); },
    "cc-color": (v) => { S.cal.cdraft.name = layer.querySelector("#cc-name").value; S.cal.cdraft.color = v; layer.innerHTML = calDialogHtml(); layer.firstElementChild.style.animation = "none"; },
    "cc-save": () => saveCalDialog(),
    "cal-daypop": (v, el) => { const occs = calOccs(v, v), tasks = calTasks(v, v);
      openCalPop(el, `<div class="cp-acts"><span class="cp-dayt">${fmtLong(v)}</span><button class="ib" data-a="cal-open:${v}" title="Open day">${ic("calendar-1", 15)}</button><button class="ib" data-a="cal-popx" title="Close  Esc">${ic("x", 15)}</button></div><div class="cp-day">${occs.map(o => occChip(o, "", isBar(o))).join("")}${tasks.map(x => taskChip(x.t)).join("")}</div>`, "day"); },
    "cal-popx": () => closeCalPop(),
    "cal-edit": (v) => openEditor(v),
    "cal-del": (v) => delOcc(v),
    "cal-omenu": (v, el) => occMenu(el, v),
    "cal-join": (v) => toast("Opening " + v + " (prototype)"),
    "cal-rsvp": (v) => { const [key, k] = v.split("|"), o = occFind(key); if (!o) return; o.ev.rsvp = k; render(); if (calPop) calPop.innerHTML = occPopHtml(o); toast({ yes: "You're going", no: "Declined", maybe: "Maybe" }[k]); },
    "cal-task-done": (v) => { const t = todo(v); if (!t) return; t.done = !t.done; closeCalPop(true); render(); toast(t.done ? "ToDo completed" : "ToDo reopened"); },
    "cal-task-del": (v) => { closeCalPop(true); trashItem("todo", v); render(); },
    "cal-undo": (v, el) => { if (!calUndo) return; const s = JSON.parse(calUndo); D.events = s.events; D.todos = s.todos; calUndo = null; el.closest(".toast").remove(); closeCalPop(true); render(); toast("Undone"); },
    "cal-scope": () => { const v = layer.querySelector("input[name=scope]:checked").value, cb = S.cal.scopeCb; S.cal.scopeCb = null; closeLayer(); if (cb) cb(v); },
    "cq-type": (v) => { S.cal.ghost.type = v; redrawQuick(); },
    "cq-cal": (v, el) => openMenu(el, D.calendars.filter(c => !c.readonly).map(c => ({ lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${calCol(c)}"></i></span>`, label: c.name, check: S.cal.ghost.cal === c.id, run: () => { S.cal.ghost.cal = c.id; redrawQuick(); } }))),
    "cq-save": () => saveQuick(),
    "cq-more": () => { const g = S.cal.ghost, title = calPop.querySelector("#cq-title").value.trim(); openEditor(null, newEvent(g, title)); },
    "ce-save": () => saveEd(),
    "ce-del": () => { const { d, occ } = S.cal.ed; delOcc(occ || d.id + "@" + d.date); },
    "ce-type": (v) => { syncEd(); const d = S.cal.ed.d; d.type = v; if (v === "focus" && !d.title) d.title = "Focus time"; if (v === "task") return saveEd(); redrawEd(); },
    "ce-allday": () => { syncEd(); const d = S.cal.ed.d; d.allDay = !d.allDay; delete d.endDate; if (!d.allDay && d.start == null) { d.start = 540; d.end = 540 + CP().duration; } redrawEd(); },
    "ce-multi": () => { syncEd(); const d = S.cal.ed.d; if (d.endDate) delete d.endDate; else d.endDate = addIso(d.date, 1); redrawEd(); },
    "ce-wd": (v) => { syncEd(); const r = S.cal.ed.d.rrule, k = +v; r.days = r.days || [fromIso(S.cal.ed.d.date).getDay()]; r.days = r.days.includes(k) ? (r.days.length > 1 ? r.days.filter(x => x !== k) : r.days) : r.days.concat(k); redrawEd(); },
    "ce-ends": (v) => { syncEd(); const r = S.cal.ed.d.rrule; delete r.until; delete r.count; if (v === "on") r.until = addIso(S.cal.ed.d.date, 90); if (v === "after") r.count = 10; redrawEd(); },
    "ce-guest-x": (v) => { syncEd(); S.cal.ed.d.guests = S.cal.ed.d.guests.filter(g => g.name !== v); redrawEd(); },
    "ce-meet": () => { syncEd(); S.cal.ed.d.meet = MEET(); redrawEd(); },
    "ce-meet-x": () => { syncEd(); delete S.cal.ed.d.meet; redrawEd(); },
    "ce-rem-add": () => { syncEd(); const d = S.cal.ed.d; d.reminders.push(d.allDay ? 1440 : CP().reminder || 10); redrawEd(); },
    "ce-rem-x": (v) => { syncEd(); S.cal.ed.d.reminders.splice(+v, 1); redrawEd(); },
    "ce-cal": (v, el) => { syncEd(); openMenu(el, D.calendars.filter(c => !c.readonly).map(c => ({ lead: `<span style="width:15px;display:grid;place-items:center"><i class="cal-dot" style="--c:${calCol(c)}"></i></span>`, label: c.name, check: S.cal.ed.d.cal === c.id, run: () => { S.cal.ed.d.cal = c.id; redrawEd(); } }))); },
    "ce-color": (v) => { syncEd(); if (v === "none") delete S.cal.ed.d.color; else S.cal.ed.d.color = v; redrawEd(); },
    "ce-busy": (v) => { syncEd(); S.cal.ed.d.busy = v; redrawEd(); },
    "ce-folder": (v, el) => { syncEd(); folderPicker(el, S.cal.ed.d.folder || null, fid => { S.cal.ed.d.folder = fid; redrawEd(); }); },
  };

  /* ---------- render ---------- */
  function render() {
    document.documentElement.setAttribute("data-theme", S.theme);
    const parts = S.route.split("/"), prod = /^(pin|folder)$/.test(parts[0]) ? S.curProd : parts[0];
    const sb = { plan: sidebarPlan, work: sidebarWork, wiki: sidebarWiki, files: sidebarFiles, ai: sidebarAI, settings: sidebarSettings }[prod] || sidebarWork;
    const view = { pin: viewPinned, folder: p => viewFolder(p[1]), plan: viewPlan, work: viewWork, wiki: viewWiki, files: viewFiles, ai: viewAI, settings: viewSettings }[parts[0]] || viewWork;
    const scrollEl = root.querySelector(".content .scroll"), keep = scrollEl ? scrollEl.scrollTop : 0, sameRoute = root.dataset.route === S.route;
    const oldSb = root.querySelector(".sidebar"), sbKeep = oldSb && oldSb.dataset.prod === prod ? oldSb.scrollTop : 0;
    const folds = {}; root.querySelectorAll("[data-fold]").forEach(el => folds[el.dataset.fold] = el.classList.contains("open") || el.classList.contains("closed"));
    root.innerHTML = `<div class="app${S.asst.open ? " with-asst" : ""}">${topbar()}${rail()}<div class="frame"><aside class="sidebar${S.collapsed ? " collapsed" : ""}" data-prod="${prod}">${sb()}</aside><main class="content">${view(parts)}</main></div>${S.asst.open ? assistant() : ""}</div>`;
    root.dataset.route = S.route;
    root.querySelectorAll("[data-fold]").forEach(el => {
      const cls = el.classList.contains("tree") ? "open" : "closed", now = el.classList.contains(cls), was = folds[el.dataset.fold];
      if (was === undefined || was === now) return;
      el.classList.add("no-anim"); el.classList.toggle(cls, was); void el.offsetHeight; // start from the old state…
      el.classList.remove("no-anim"); el.classList.toggle(cls, now); // …and animate to the new one
    });
    if (sbKeep) root.querySelector(".sidebar").scrollTop = sbKeep;
    if (sameRoute) { const s = root.querySelector(".content .scroll"); if (s) s.scrollTop = keep; }
    calAfterRender();
    const log = document.getElementById("chatlog"); if (log) log.scrollTop = log.scrollHeight;
    const selSticky = root.querySelector(".sticky-card.sel"); if (selSticky && !sameRoute) selSticky.scrollIntoView({ block: "nearest" });
    const alog = document.getElementById("asstlog"); if (alog) alog.scrollTop = alog.scrollHeight;
    store.set("route", S.route); store.set("theme", S.theme); store.set("prod", S.curProd); store.set("openFolders", [...S.openFolders]);
    save();
  }
  function go(route) {
    if (!route) return;
    if (route === "plan/horizons") route += "/" + D.hzPages[0].id; // the Horizons row opens the first page
    const p = route.split("/")[0];
    if (p !== "pin" && p !== "folder") { S.curProd = p; S.lastRoute[p] = route; }
    if (p === "folder") { revealFolder(route.split("/")[1]); if (route !== S.route) S.ftab = "plan"; }
    // leaving Notes / Canvas collapses their sidebar branch (caret or a click on the row reopens it)
    const branches = { "x-notes": "work/notes", "x-canvas": "work/canvas", "x-practice": "wiki/practice", "x-tutor": "wiki/tutor", "x-hz": "plan/horizons" };
    let closed = false;
    for (const id in branches) if (S.openFolders.has(id) && !(route + "/").startsWith(branches[id] + "/")) { S.openFolders.delete(id); closed = true; }
    if (closed) store.set("openFolders", [...S.openFolders]);
    if (route === "pin/calendar" && S.route !== route) S.cal.scroll = true;
    S.route = route; closeMenu(); closeCalPop(true); render();
    if (route === "ai/new") setTimeout(() => { const p = document.getElementById("prompt"); p && p.focus(); });
  }

  /* ---------- menus ---------- */
  let menuEl = null, menuItems = [];
  function openMenu(anchor, items) {
    closeMenu();
    menuItems = items;
    menuEl = document.createElement("div");
    menuEl.className = "menu";
    menuEl.innerHTML = items.map((it, n) => it === "-" ? '<div class="msep"></div>' : it.head ? `<div class="mh label-mono">${esc(it.head)}</div>` : `<div class="mi" data-mi="${n}">${it.lead || (it.icon ? ic(it.icon, 15, it.color) : "")}<span>${esc(it.label)}</span>${it.check ? `<span class="ck">${ic("check", 14)}</span>` : it.kbd ? `<span style="margin-left:auto;display:flex;gap:3px">${kbd(it.kbd)}</span>` : ""}</div>`).join("");
    document.body.appendChild(menuEl);
    const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(r.left, innerWidth - mw - 8)) + "px";
    menuEl.style.top = (r.bottom + 4 + mh > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + "px";
  }
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } document.querySelectorAll(".asst-mode.on").forEach(b => b.classList.remove("on")); }

  function toast(text) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = ic("check", 14, "var(--success)") + esc(text);
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  /* ---------- dialogs ---------- */
  let layer = null;
  function closeLayer() { if (layer) { layer.remove(); layer = null; } }
  function openLayer(html, onMount) {
    closeLayer(); closeMenu(); closeCalPop(true);
    layer = document.createElement("div"); layer.className = "scrim"; layer.innerHTML = html;
    layer.addEventListener("mousedown", e => { if (e.target === layer) closeLayer(); });
    document.body.appendChild(layer); onMount && onMount(layer);
  }

  /* new ToDo dialog: title, due date, priority and folder */
  const fmtDay = d => String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()];
  const plusDays = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return fmtDay(d); };
  function draftChips() {
    const d = S.draft, pr = prio(d.prio), f = folder(d.folder);
    return `<span class="chip${d.due ? "" : " is-empty"}" data-a="d-due">${ic("calendar", 13)}${d.due || "Due date"}</span>
      <span class="chip${d.dur ? "" : " is-empty"}" data-a="d-dur">${ic("timer", 13)}${d.dur ? fmtDur(d.dur) : "Duration"}</span>
      <span class="chip${pr.id ? "" : " is-empty"}" data-a="d-prio">${ic(pr.icon, 13, pr.color)}${pr.id ? pr.name : "Priority"}</span>
      <span class="chip${f ? "" : " is-empty"}" data-a="d-folder">${f ? folderIcon(f, 13) : ic("folder-plus", 13)}${f ? esc(f.name) : "No folder"}</span>`;
  }
  function refreshDraftChips() {
    const c = layer && layer.querySelector("#dchips"); if (c) c.innerHTML = draftChips();
    const pc = layer && layer.querySelector("#dcrumb"); if (pc) pc.innerHTML = draftCrumb();
  }
  const draftCrumb = () => { const f = folder(S.draft.folder); return f ? folderIcon(f, 13) + esc(f.name) : ic("list-checks", 13) + "ToDos"; };
  // new ToDo, or (with editId) the same dialog filled with an existing ToDo to change any of its fields
  function openTodoDialog(preset = {}, editId) {
    const t = editId && todo(editId); if (editId && !t) return;
    S.draft = t ? { id: t.id, text: t.text, due: t.due || null, dur: t.dur || null, prio: t.prio || 0, folder: t.folder || null, more: false } : Object.assign({ due: null, dur: null, prio: 0, folder: null, more: false }, preset);
    openLayer(`<div class="dialog" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb" id="dcrumb">${draftCrumb()}</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">${t ? "Edit ToDo" : "New ToDo"}</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db"><input class="big" id="dtitle" placeholder="What needs to be done?" autocomplete="off" value="${t ? esc(t.text) : ""}">
        <div id="dchips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${draftChips()}</div></div>
      <div class="df">${t ? `<button class="btn" data-a="todo-done:${t.id}">${ic(t.done ? "circle" : "circle-check", 14)}${t.done ? "Mark as open" : "Mark as done"}</button>` : `<span style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font:var(--type-small)"><button class="switch" data-a="d-more" role="switch"></button>Create more</span>`}<span style="flex:1"></span>
        ${t ? `<button class="btn" data-a="close">Cancel</button>` : ""}<button class="btn primary" data-a="create">${t ? "Save" : "Create ToDo"} ${kbd([MOD, "⏎"])}</button></div></div>`,
      l => { const i = l.querySelector("#dtitle"); i.focus(); if (t) i.setSelectionRange(i.value.length, i.value.length); });
  }
  function submitCreate() {
    const d = S.draft, input = layer.querySelector("#dtitle"), text = input.value.trim();
    if (!text) { input.focus(); return; }
    if (d.id) { // editing: every field from the dialog; calendar blocks of this ToDo keep its title
      const t = todo(d.id); if (!t) { closeLayer(); return; }
      Object.assign(t, { text, due: d.due || undefined, dur: d.dur || undefined, prio: d.prio, folder: d.folder });
      D.events.forEach(e => { if (e.todo === t.id) e.title = text; });
      if (d.folder) revealFolder(d.folder);
      closeLayer(); render(); toast("ToDo saved"); return;
    }
    D.todos.unshift({ id: uid("t"), text, due: d.due, dur: d.dur || undefined, prio: d.prio, folder: d.folder });
    if (d.folder) revealFolder(d.folder);
    toast("ToDo created" + (d.folder ? " in " + folderName(d.folder) : ""));
    if (d.more) { input.value = ""; input.focus(); render(); }
    else { closeLayer(); render(); }
  }

  /* folder picker: the whole tree, indented; disabled ids (a folder itself and its children) are left out */
  function folderPicker(el, cur, onPick, exclude = []) {
    const skip = new Set(exclude), rows = [];
    const walk = (pid, depth) => kids(pid).forEach(f => { if (skip.has(f.id)) return; rows.push({ lead: `<span style="display:inline-flex;align-items:center;margin-left:${Math.min(depth, 6) * 14}px">${folderIcon(f, 15)}</span>`, label: f.name, check: cur === f.id, run: () => onPick(f.id) }); walk(f.id, depth + 1); });
    walk(null, 0);
    openMenu(el, [{ icon: "folder-x", label: "No folder", check: !cur, run: () => onPick(null) }, "-"].concat(rows.length ? rows : [{ icon: "folder", label: "No folders yet" }]));
  }
  // move any element into a folder (or out of all folders)
  function moveItem(t, id, fid) {
    const x = find(t, id); if (!x || (x.folder || null) === fid) return;
    x.folder = fid; if ("updated" in x) x.updated = "now";
    if (fid) revealFolder(fid);
    render(); toast(fid ? "Moved to " + folderName(fid) : "Removed from folder");
  }
  // move a folder under another one (never into itself or its own subfolders)
  function moveFolder(id, pid) {
    const f = folder(id); if (!f || id === pid || subtreeIds(id).includes(pid) || (f.parent || null) === pid) return false;
    f.parent = pid; if (pid) revealFolder(pid);
    render(); toast(pid ? "Moved into " + folderName(pid) : "Moved to the top level"); return true;
  }
  // trash: elements leave their list and wait in D.trash until restored or purged
  function trashItem(t, id) {
    const list = TYPES[t].list(), n = list.findIndex(x => x.id === id); if (n < 0) return;
    const [x] = list.splice(n, 1);
    D.trash.unshift({ type: t, item: x, at: "now" });
    if (t === "chat" && S.asst.chatId === id) S.asst.chatId = null;
    toast(TYPES[t].label + " moved to trash");
  }
  function restoreTrash(n) {
    const e = D.trash[n]; if (!e) return;
    D.trash.splice(n, 1);
    if (e.item.folder && !folder(e.item.folder)) e.item.folder = null;
    if (e.type === "goal") { const p = hzPage(e.item.page); e.item.page = p.id; e.item.h = hzCol(e.item).id; } // its page or column may be gone
    TYPES[e.type].list().unshift(e.item);
    toast(TYPES[e.type].name(e.item) + " restored");
  }
  // the same "…" / right-click menu for every element
  function itemMenu(el, t, id) {
    const x = find(t, id); if (!x) return;
    const T = TYPES[t];
    openMenu(el, [
      ...(t === "todo" ? todoMenuItems(el, x) : [{ icon: T.icon(x), label: "Open", run: () => openItem(t, id) }]),
      { icon: "folder-input", label: "Move to folder…", run: () => folderPicker(el, x.folder || null, fid => moveItem(t, id, fid)) },
      { icon: "star", color: x.starred ? "var(--warning)" : "", label: x.starred ? "Unstar" : "Star", run: () => { x.starred = !x.starred; render(); } },
      ...(t === "todo" ? [{ icon: x.done ? "circle" : "circle-check", label: x.done ? "Mark as open" : "Mark as done", run: () => { x.done = !x.done; render(); } }] : []),
      "-",
      { icon: "trash-2", color: "var(--danger)", label: "Move to trash", run: () => { const here = S.route === T.route(x) && T.fam === "content"; trashItem(t, id); here ? go(t === "note" ? "work/notes" : t === "canvas" ? "work/canvas" : t === "chat" ? "ai/new" : t === "file" ? "files/trash" : S.lastRoute[S.curProd]) : render(); } },
    ]);
  }
  // ToDo menu: the dialog for everything, plus each field on its own
  function todoMenuItems(el, x) {
    const set = (k, v) => { if (v == null) delete x[k]; else x[k] = v; render(); };
    return [
      { icon: "pencil", label: "Edit…", run: () => openTodoDialog({}, x.id) },
      { icon: "calendar", label: "Due date" + (x.due ? "  ·  " + x.due : "") + "…", run: () => openMenu(el, [["Today", 0], ["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, n]) => ({ icon: "calendar", label: l + "  ·  " + plusDays(n), check: x.due === plusDays(n), run: () => set("due", plusDays(n)) })).concat(["-", { icon: "calendar-x", label: "No date", check: !x.due, run: () => set("due", null) }])) },
      { icon: "timer", label: "Duration" + (x.dur ? "  ·  " + fmtDur(x.dur) : "") + "…", run: () => openMenu(el, DUR_OPTS.map(m => ({ icon: "timer", label: fmtDur(m), check: x.dur === m, run: () => set("dur", m) })).concat(["-", { icon: "timer-off", label: "No duration", check: !x.dur, run: () => set("dur", null) }])) },
      { icon: prio(x.prio).icon, color: prio(x.prio).color, label: "Priority" + (prio(x.prio).id ? "  ·  " + prio(x.prio).name : "") + "…", run: () => openMenu(el, D.priorities.map(p => ({ icon: p.icon, color: p.color, label: p.name, check: (x.prio || 0) === p.id, run: () => set("prio", p.id) }))) },
    ];
  }
  function openItem(t, id) {
    if (t === "deck") return A.study(id);
    const x = find(t, id); if (!x) return;
    if (t === "event") return openEditor(null, JSON.parse(JSON.stringify(x)));
    if (t === "timeline" || t === "goal") return openPlanDialog(t, {}, id);
    go(TYPES[t].route(x));
  }

  /* timeline and goal dialog: new, or (with editId) the same dialog filled with an existing element */
  const PD_CRUMB = { timeline: ["chart-gantt", "Timelines"], goal: ["telescope", "Horizons"] };
  const PD_SEGS = { conf: [["on", "On track"], ["risk", "At risk"], ["idea", "Idea"]] };
  function openPlanDialog(t, preset = {}, editId) {
    const x = editId && find(t, editId); if (editId && !x) return;
    S.pdraft = t === "goal"
      ? Object.assign({ t, name: "", desc: "", page: curHzPage().id, h: null, conf: "on", folder: null }, preset, x ? { id: x.id, name: x.title, desc: x.desc || "", page: x.page, h: x.h, conf: x.conf, folder: x.folder || null } : {})
      : Object.assign({ t, name: "", start: TODAY_ISO, end: addIso(TODAY_ISO, 27), folder: null }, preset, x ? { id: x.id, name: x.name, start: x.start, end: x.end, folder: x.folder || null } : {});
    if (t === "goal") { const d = S.pdraft; d.page = hzPage(d.page).id; d.h = hzCol(d).id; }
    openLayer(planDialogHtml(), l => { const n = l.querySelector("#pd-name"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
  }
  function planDialogHtml() {
    const d = S.pdraft, f = folder(d.folder), T = TYPES[d.t], isNew = !d.id;
    const field = (icon, body) => `<div class="ce-f">${ic(icon, 16, "var(--text-tertiary)")}<div class="ce-fb">${body}</div></div>`;
    const seg = k => `<div class="seg">${PD_SEGS[k].map(([v, l]) => `<button class="${d[k] === v ? "on" : ""}" data-a="pd-set:${k}|${v}">${l}</button>`).join("")}</div>`;
    // goals: page (only once there is more than one) and that page's own columns
    const pg = d.t === "goal" && hzPage(d.page);
    const body = d.t === "goal" ? (D.hzPages.length > 1 ? field("columns-3", `<span class="chip" data-a="pd-page" title="Horizon page">${ic("telescope", 13)}${esc(pg.name || "Untitled")}${ic("chevron-down", 12)}</span>`) : "")
        + field("telescope", `<div class="seg hz-seg">${pg.cols.map(c => `<button class="${d.h === c.id ? "on" : ""}" data-a="pd-set:h|${c.id}">${esc(c.name || "Untitled")}</button>`).join("")}</div>`) + field("activity", seg("conf"))
      : field("calendar-range", `<div class="ce-when"><input class="input ce-date" id="pd-start" type="date" value="${d.start}"><span>–</span><input class="input ce-date" id="pd-end" type="date" value="${d.end}"></div>`);
    return `<div class="dialog" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb">${f ? folderIcon(f, 13) + esc(f.name) : ic(PD_CRUMB[d.t][0], 13) + (d.t === "goal" ? esc(pg.name || "Untitled") : PD_CRUMB[d.t][1])}</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">${isNew ? "New" : "Edit"} ${T.label.toLowerCase()}</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db"><input class="big" id="pd-name" placeholder="${d.t === "goal" ? "What do you want to reach?" : "Timeline name"}" value="${esc(d.name)}" autocomplete="off">
        ${d.t === "goal" ? `<textarea id="pd-desc" class="fd-desc" placeholder="Add a description…">${esc(d.desc || "")}</textarea>` : ""}
        ${body}${field("folder", folderField(d.folder, "pd-folder"))}</div>
      <div class="df">${isNew ? "" : `<button class="btn danger-btn" data-a="pd-trash">${ic("trash-2", 14)}Move to trash</button>`}<span style="flex:1"></span><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="pd-save">${isNew ? "Create " + T.label.toLowerCase() : "Save"} ${kbd([MOD, "⏎"])}</button></div></div>`;
  }
  function syncPlanDraft() {
    const d = S.pdraft, v = id => { const el = layer && layer.querySelector("#" + id); return el ? el.value : null; };
    d.name = v("pd-name") ?? d.name; d.desc = v("pd-desc") ?? d.desc; d.start = v("pd-start") || d.start; d.end = v("pd-end") || d.end;
  }
  function redrawPlanDialog() { syncPlanDraft(); if (!layer) return; layer.innerHTML = planDialogHtml(); layer.firstElementChild.style.animation = "none"; }
  function savePlanDialog() {
    syncPlanDraft();
    const d = S.pdraft, name = d.name.trim();
    if (!name) { const n = layer.querySelector("#pd-name"); n && n.focus(); return; }
    const fields = d.t === "goal" ? { title: name, desc: (d.desc || "").trim(), page: d.page, h: d.h, conf: d.conf, folder: d.folder } : { name, start: d.start, end: d.end < d.start ? d.start : d.end, folder: d.folder };
    const x = d.id && find(d.t, d.id);
    if (x) Object.assign(x, fields); else TYPES[d.t].list().push(Object.assign({ id: uid(d.t === "goal" ? "g" : "tl") }, fields));
    if (d.folder) revealFolder(d.folder);
    S.pdraft = null; closeLayer(); render();
    toast(x ? TYPES[d.t].label + " saved" : TYPES[d.t].label + " created" + (d.folder ? " in " + folderName(d.folder) : ""));
  }

  /* horizon pages and their columns */
  const HZ_TEMPLATE = () => [["Now", "This quarter"], ["Next", "Next quarter"], ["Later", "6–12 months"]].map(([name, sub]) => ({ id: uid("c"), name, sub }));
  function addHzPage(cols, name = "New horizon") {
    const p = { id: uid("hz"), name, cols };
    D.hzPages.push(p); S.openFolders.add("x-hz");
    go("plan/horizons/" + p.id); focusEdit(`[data-edit="hz-page:${p.id}"]`);
  }
  function addHzCol(pid, at) {
    const p = hzPage(pid), c = { id: uid("c"), name: "New column", sub: "" };
    p.cols.splice(at == null ? p.cols.length : at, 0, c); render();
    focusEdit(`[data-edit="hz-col:${p.id}:${c.id}"]`);
  }
  // a column's goals move to its neighbour, so deleting a column never loses anything
  function deleteHzCol(pid, cid) {
    const p = hzPage(pid), i = p.cols.findIndex(c => c.id === cid);
    if (p.cols.length < 2) return toast("A page needs at least one column");
    const [c] = p.cols.splice(i, 1), to = p.cols[Math.max(0, i - 1)], moved = D.horizons.filter(x => x.page === p.id && x.h === c.id);
    moved.forEach(x => x.h = to.id); render();
    toast("Column deleted" + (moved.length ? ` · ${moved.length} ${moved.length === 1 ? "goal" : "goals"} moved to ${to.name || "Untitled"}` : ""));
  }
  function deleteHzPageDialog(pid) {
    const p = hzPage(pid), n = D.horizons.filter(x => x.page === p.id).length;
    if (D.hzPages.length < 2) return toast("Keep at least one horizon page");
    openLayer(`<div class="dialog" style="width:min(440px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">Delete “${esc(p.name || "Untitled")}”?</span></div>
      <div class="db"><p style="margin:0;color:var(--text-secondary)">${n ? `Its ${n} ${n === 1 ? "goal moves" : "goals move"} to the trash. Restored goals land on the first horizon page.` : "This page has no goals."}</p></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn danger-btn" data-a="hz-page-del:${p.id}">Delete page</button></div></div>`);
  }
  // folder "…" / right-click menu
  function folderMenu(el, id) {
    const f = folder(id); if (!f) return;
    openMenu(el, [
      { icon: "folder-open", label: "Open", run: () => go("folder/" + id) },
      { icon: "folder-plus", label: "New subfolder", run: () => openFolderSettings(null, { parent: id }) },
      { icon: "settings-2", label: "Settings…", run: () => openFolderSettings(id) },
      { icon: "folder-input", label: "Move to…", run: () => folderPicker(el, f.parent || null, pid => moveFolder(id, pid), subtreeIds(id)) },
      "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete folder…", run: () => deleteFolderDialog(id) },
    ]);
  }

  /* folder settings dialog (also creates folders) */
  function folderDialogHtml() {
    const d = S.fdraft, isNew = !d.id, parent = folder(d.parent);
    const inherited = (() => { for (let x = parent; x; x = folder(x.parent)) if (x.kb != null) return { on: x.kb, from: x }; return { on: false, from: null }; })();
    const kbOn = d.kb != null ? d.kb : inherited.on;
    const kbDesc = d.kb == null
      ? (inherited.from ? `Inherited from <b>${esc(inherited.from.name)}</b>.` : "Adds this folder and all its subfolders to the raw part of the Knowledge Base.")
      : `Set on this folder · applies to all subfolders.${inherited.from ? ` <span class="link" data-a="fd-kb-inherit">Use inherited (${inherited.on ? "on" : "off"})</span>` : ""}`;
    const sw = (on, a) => `<button class="switch${on ? " on" : ""}" data-a="${a}" role="switch" aria-checked="${on}"></button>`;
    const row = (t, desc, ctl) => `<div class="box-row"><div class="l"><b>${t}</b><span>${desc}</span></div>${ctl}</div>`;
    const icons = FOLDER_ICONS.map(n => `<button class="ib${!d.emoji && (d.icon || "folder") === n ? " on" : ""}" data-a="fd-icon:${n}" title="${n}">${ic(n, 16, FOLDER_COLORS[d.color || ""] || "")}</button>`).join("");
    const colors = Object.keys(FOLDER_COLORS).map(c => `<button class="fd-color${(d.color || "") === c ? " on" : ""}" data-a="fd-color:${c || "none"}" title="${c || "Default"}" style="background:${FOLDER_COLORS[c] || "var(--text-secondary)"}"></button>`).join("");
    return `<div class="dialog fd-dialog" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb" data-a="fd-parent" title="Location" style="cursor:pointer">${parent ? folderIcon(parent, 13) + esc(fpath(parent.id).map(p => p.name).join(" / ")) : ic("folders", 13) + "Top level"}${ic("chevron-down", 12)}</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">${isNew ? (d.project ? "New project" : "New folder") : "Folder settings"}</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db">
        <div style="display:flex;align-items:center;gap:12px"><span class="coll-icon">${d.emoji ? `<span style="font-size:20px">${d.emoji}</span>` : ic(d.icon || "folder", 22, FOLDER_COLORS[d.color || ""] || "")}</span><input class="big" id="fd-name" placeholder="Folder name" value="${esc(d.name)}" autocomplete="off"></div>
        <textarea id="fd-desc" class="fd-desc" placeholder="Add a short description…">${esc(d.desc || "")}</textarea>
        <div class="label-mono" style="margin:4px 0 8px">Icon</div><div class="fd-icons">${icons}</div>
        <div class="label-mono" style="margin:14px 0 8px">Colour</div><div class="fd-colors">${colors}</div>
        <div class="box" style="margin-top:18px">
          ${row(`${ic("library-big", 14)} Knowledge Base`, kbDesc, sw(kbOn, "fd-kb"))}
          ${row(`${ic("folder-kanban", 14)} Project`, "Track progress, a target date and milestones for everything in this folder.", sw(!!d.project, "fd-project"))}
          ${d.project ? row("Target date", "Shown on the folder page and in Timelines.", `<input class="input" id="fd-target" value="${esc(d.project.target || "")}" placeholder="e.g. 15 Dec" style="min-width:140px">`) : ""}
        </div></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="fd-save">${isNew ? "Create folder" : "Save"}</button></div></div>`;
  }
  function openFolderSettings(id, preset = {}) {
    const f = folder(id);
    S.fdraft = f ? JSON.parse(JSON.stringify(f)) : Object.assign({ id: null, name: "", parent: null, icon: "folder", color: "", desc: "" }, preset);
    if (S.fdraft.project === true) S.fdraft.project = { target: "", milestones: [] };
    openLayer(folderDialogHtml(), l => { const n = l.querySelector("#fd-name"); n.focus(); n.select(); });
  }
  // keep typed values, then redraw the dialog in place
  function syncFolderDraft() {
    if (!layer || !S.fdraft) return;
    const v = sel => { const el = layer.querySelector(sel); return el ? el.value : null; };
    const d = S.fdraft; d.name = v("#fd-name") ?? d.name; d.desc = v("#fd-desc") ?? d.desc;
    if (d.project && v("#fd-target") != null) d.project.target = v("#fd-target").trim();
  }
  function redrawFolderDialog() { syncFolderDraft(); if (!layer) return; layer.innerHTML = folderDialogHtml(); layer.firstElementChild.style.animation = "none"; }
  function saveFolderDialog() {
    syncFolderDraft();
    const d = S.fdraft, name = d.name.trim();
    if (!name) { const n = layer.querySelector("#fd-name"); n && n.focus(); return; }
    d.name = name; d.desc = (d.desc || "").trim();
    if (!d.project) delete d.project;
    if (d.kb == null) delete d.kb;
    let id = d.id;
    if (!id) { id = d.id = uid("f"); D.folders.push(d); toast((d.project ? "Project" : "Folder") + " created"); }
    else { const f = folder(id); Object.keys(f).forEach(k => delete f[k]); Object.assign(f, d); toast("Folder saved"); }
    S.fdraft = null; closeLayer(); revealFolder(id);
    if (S.route === "folder/" + id) render(); else go("folder/" + id);
  }
  function deleteFolderDialog(id) {
    const f = folder(id), subs = descendants(id), items = deepItems(id);
    const what = [subs.length ? `${subs.length} ${subs.length === 1 ? "subfolder" : "subfolders"}` : "", items.length ? `${items.length} ${items.length === 1 ? "element" : "elements"}` : ""].filter(Boolean).join(" and ");
    openLayer(`<div class="dialog" style="width:min(460px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">Delete “${esc(f.name)}”?</span></div>
      <div class="db"><p style="margin:0;color:var(--text-secondary)">${what ? `It contains ${what}. Keep the contents in ${f.parent ? "“" + esc(folderName(f.parent)) + "”" : "the top level"}, or move the elements to the trash together with the folder.` : "This folder is empty."}</p></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button>${what ? `<button class="btn" data-a="fdel-keep:${id}">Keep contents</button>` : ""}<button class="btn danger-btn" data-a="fdel-all:${id}">${what ? "Delete with contents" : "Delete folder"}</button></div></div>`);
  }
  function deleteFolder(id, withContents) {
    const f = folder(id), parent = f.parent || null, ids = subtreeIds(id);
    if (withContents) { deepItems(id).forEach(({ t, x }) => trashItem(t, x.id)); D.folders = D.folders.filter(x => !ids.includes(x.id)); }
    else { // children move up one level; the folder's own elements move to its parent
      kids(id).forEach(k => k.parent = parent);
      itemsIn(id).forEach(({ x }) => x.folder = parent);
      D.folders = D.folders.filter(x => x.id !== id);
    }
    closeLayer(); toast("Folder deleted");
    if (S.route.startsWith("folder/") && ids.includes(S.route.split("/")[1])) go(parent ? "folder/" + parent : S.lastRoute[S.curProd]); else render();
  }

  /* quick create: one menu for everything, split into Plan and Content; fid preselects the folder */
  const ctxFolder = () => S.route.startsWith("folder/") ? S.route.split("/")[1] : null;
  function createItem(t, fid = null) {
    if (t === "todo") return openTodoDialog({ folder: fid });
    if (t === "event") { const s = Math.min(1380, Math.ceil((nowMin() + 1) / 60) * 60); return openEditor(null, Object.assign(newEvent({ type: "event", date: TODAY_ISO, start: s, end: Math.min(1440, s + CP().duration), allDay: false }), { folder: fid })); }
    if (t === "timeline" || t === "goal") return openPlanDialog(t, { folder: fid });
    if (t === "project") return openFolderSettings(null, { parent: fid, project: true, icon: "folder-kanban" });
    if (t === "folder") return openFolderSettings(null, { parent: fid });
    if (fid) revealFolder(fid);
    if (t === "note") { const id = uid("n"); D.notes.unshift({ id, title: "", body: "", labels: [], updated: "now", folder: fid }); S.openFolders.add("x-notes"); go("work/notes/" + id); setTimeout(() => { const h = document.querySelector(`[data-edit="note-title:${id}"]`); h && h.focus(); }); }
    else if (t === "canvas") { const id = uid("b"); D.canvases.push({ id, name: "Untitled canvas", items: [], updated: "now", folder: fid }); S.openFolders.add("x-canvas"); go("work/canvas/" + id); }
    else if (t === "sticky") { const id = uid("s"); D.stickies.unshift({ id, text: "", color: "amber", updated: "now", folder: fid }); go("work/stickies/" + id); setTimeout(() => { const el = document.querySelector(`[data-edit="sticky:${id}"]`); el && el.focus(); }); }
    else if (t === "page") { const id = uid("pg"); D.pages.push({ id, icon: "file-text", title: "Untitled", body: [""], folder: fid }); go("wiki/" + id); setTimeout(() => { const h = document.querySelector("[data-edit^='page-title']"); if (h) { h.focus(); document.execCommand && document.execCommand("selectAll"); } }); }
  }
  const QC = { plan: [["todo", "circle", "ToDo", ["C"]], ["event", "calendar", "Event"], ["timeline", "chart-gantt", "Timeline"], ["goal", "telescope", "Horizon goal"], ["project", "folder-kanban", "Project folder"]], content: [["note", "file-text", "Note"], ["canvas", "layout-dashboard", "Canvas"], ["sticky", "sticky-note", "Sticky"], ["page", "book-open", "Learn page"]] };
  function quickCreate(el, fid = ctxFolder(), fams = ["plan", "content"]) {
    const items = [];
    fams.forEach(fam => { items.push({ head: fam === "plan" ? "Plan" : "Content" }); QC[fam].forEach(([t, icon, label, k]) => items.push({ icon, label, kbd: k, run: () => createItem(t, fid) })); });
    if (fams.length > 1) items.push("-", { icon: "folder-plus", label: fid ? "Subfolder" : "Folder", run: () => createItem("folder", fid) });
    openMenu(el || document.querySelector(".sidebar .compose") || document.querySelector(".search"), items);
  }

  /* command palette */
  function paletteItems() {
    const out = [];
    const add = (group, icon, label, run, k) => out.push({ group, icon, label, run, kbd: k });
    add("Actions", "circle", "Create ToDo", () => openTodoDialog({ folder: ctxFolder() }), ["C"]);
    add("Actions", "calendar-plus", "Create event", () => { go("pin/calendar"); openNew(); });
    add("Actions", "file-text", "Create note", () => createItem("note", ctxFolder()));
    add("Actions", "folder-plus", "Create folder", () => createItem("folder", ctxFolder()));
    add("Actions", "folder-kanban", "Create project folder", () => createItem("project", ctxFolder()));
    add("Actions", S.theme === "dark" ? "sun" : "moon", "Switch to " + (S.theme === "dark" ? "light" : "dark") + " theme", () => { S.theme = S.theme === "dark" ? "light" : "dark"; render(); });
    add("Actions", "panel-left", "Toggle sidebar", () => { S.collapsed = !S.collapsed; render(); }, ["["]);
    [["pin/inbox", "inbox", "Inbox"], ["pin/calendar", "calendar", "Calendar"], ["pin/todos", "list-checks", "ToDos"], ["work/notes", "notebook-pen", "Notes"], ["work/canvas", "shapes", "Canvas"], ["work/stickies", "sticky-note", "Stickies"], ["plan/timelines", "chart-gantt", "Timelines"], ["plan/horizons", "telescope", "Horizons"], ["plan/time", "timer", "Time tracking"], ["plan/analytics", "chart-column", "Analytics"], ["wiki/flashcards", "gallery-vertical-end", "Flashcards"], ["wiki/practice", "dumbbell", "Practice"], ["wiki/practice/test", "clipboard-check", "Practice test"], ["wiki/practice/braindump", "brain", "Brain dump"], ["wiki/tutor", "graduation-cap", "AI Tutor"], ["wiki/tutor/chat", "messages-square", "Tutor conversation"], ["wiki/tutor/summary", "scroll-text", "Tutor summary"], ["wiki/progress", "trending-up", "Track & progress"], ["files/folders", "folders", "All folders"], ["files/starred", "star", "Starred"], ["files/trash", "trash-2", "Trash"], ["files/kb", "library-big", "Knowledge base"], ["ai/new", "bot", "AI"], ["settings/general", "settings", "Settings"]]
      .forEach(([r, i, l]) => add("Go to", i, l, () => go(r)));
    D.folders.forEach(f => add("Folders", f.icon || "folder", fpath(f.id).map(p => p.name).join(" / "), () => go("folder/" + f.id)));
    TYPE_KEYS.forEach(t => TYPES[t].list().forEach(x => add(TYPES[t].plural, TYPES[t].icon(x), TYPES[t].name(x), () => openItem(t, x.id))));
    return out;
  }
  function openPalette() {
    const all = paletteItems(); let hits = all, hi = 0;
    openLayer(`<div class="palette"><input id="pq" placeholder="Search or type a command…" autocomplete="off"><div class="res" id="pres"></div></div>`, l => {
      const q = l.querySelector("#pq"), res = l.querySelector("#pres");
      const draw = () => {
        let g = "";
        res.innerHTML = hits.length ? hits.slice(0, 40).map((it, n) => {
          const head = it.group !== g ? `<div class="grp-l label-mono">${(g = it.group)}</div>` : "";
          return head + `<div class="opt${n === hi ? " hi" : ""}" data-pi="${n}">${it.icon ? ic(it.icon, 15) : '<span style="width:15px"></span>'}<span>${esc(it.label)}</span>${it.kbd ? `<span class="r">${kbd(it.kbd)}</span>` : ""}</div>`;
        }).join("") : `<div class="opt">Nothing found</div>`;
        const h = res.querySelector(".opt.hi"); h && h.scrollIntoView({ block: "nearest" });
      };
      const run = n => { const it = hits[n]; if (!it) return; closeLayer(); it.run(); };
      q.addEventListener("input", () => { const s = q.value.toLowerCase().trim(); hits = s ? all.filter(it => it.label.toLowerCase().includes(s) || it.group.toLowerCase().includes(s)) : all; hi = 0; draw(); });
      q.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { hi = Math.min(hi + 1, Math.min(hits.length, 40) - 1); draw(); e.preventDefault(); }
        else if (e.key === "ArrowUp") { hi = Math.max(hi - 1, 0); draw(); e.preventDefault(); }
        else if (e.key === "Enter") { run(hi); e.preventDefault(); }
      });
      res.addEventListener("mousemove", e => { const o = e.target.closest("[data-pi]"); if (o && +o.dataset.pi !== hi) { hi = +o.dataset.pi; draw(); } });
      res.addEventListener("click", e => { const o = e.target.closest("[data-pi]"); if (o) run(+o.dataset.pi); });
      draw(); q.focus();
    });
  }
  function confirmDelete(title, text, onOk) {
    openLayer(`<div class="dialog" style="width:min(420px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">${esc(title)}</span></div>
      <div class="db"><p style="margin:0;color:var(--text-secondary)">${esc(text)}</p></div>
      <div class="df"><button class="btn" data-a="close">Cancel</button><button class="btn danger-btn" id="confirm-ok">Delete forever</button></div></div>`,
      l => { const b = l.querySelector("#confirm-ok"); b.focus(); b.addEventListener("click", () => { closeLayer(); onOk(); }); });
  }
  function openShortcuts() {
    const rows = [["Search / command menu", [MOD, "S"]], ["Create something", ["C"]], ["Toggle sidebar", ["["]], ["Plan / Work / Learn / Files / AI", ["1", "–", "5"]], ["Settings", [","]], ["Close dialog or menu", ["Esc"]], ["Create from dialog", [MOD, "⏎"]], ["AI assistant", ["A"]], ["Element actions", ["Right-click"]], ["Move into a folder", ["Drag"]],
      ["Calendar: day / week / month / year", ["D", "W", "M", "Y"]], ["Calendar: schedule / 4 days", ["S", "X"]], ["Calendar: today / next / previous", ["T", "J", "K"]], ["Calendar: new / edit / delete event", ["C", "E", "Del"]], ["Calendar: search / go to date", ["/", "G"]]];
    openLayer(`<div class="dialog" style="width:min(440px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">Keyboard shortcuts</span><span style="flex:1"></span><button class="ib" data-a="close">${ic("x")}</button></div><div class="db">${rows.map(([l, k]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-subtle)"><span style="color:var(--text-secondary)">${l}</span><span style="display:flex;gap:3px">${kbd(k)}</span></div>`).join("")}</div></div>`);
  }

  /* ---------- AI (local, rule-based replies over sample data) ---------- */
  function answer(q) {
    const s = q.toLowerCase(), li = list => "<ul>" + list.map(t => `<li>${esc(t.text)}${t.folder ? ` — <span class="mono">${esc(folderName(t.folder))}</span>` : ""}${t.due ? ` · ${t.due}` : ""}</li>`).join("") + "</ul>";
    const open = D.todos.filter(t => !t.done);
    if (/overdue|late|fällig|überfällig/.test(s)) { const o = open.filter(t => t.due && dayDiff(t.due) < 0); return o.length ? (o.length === 1 ? "1 ToDo is overdue:" : `${o.length} ToDos are overdue:`) + li(o) : "Nothing is overdue."; }
    if (/urgent|dringend/.test(s)) { const u = open.filter(t => t.prio === 1); return u.length ? `Sticky drafted with ${u.length} urgent ToDos:` + li(u) : "There are no urgent ToDos."; }
    if (/week|summar|woche|zusammen/.test(s)) { const w = open.filter(t => t.due && dayDiff(t.due) >= 0 && dayDiff(t.due) <= 7), d = D.todos.filter(t => t.done); return `${open.length} ToDos are open and ${d.length} are done. Due in the next 7 days:` + (w.length ? li(w) : " nothing."); }
    if (/release|notes/.test(s)) { const d = D.todos.filter(t => t.done); return "<b>Release notes (draft)</b><ul>" + d.map(t => `<li>${esc(t.text)}</li>`).join("") + "<li>One global folder tree across the whole app</li></ul>"; }
    if (/folder|ordner|who|wer|working|open per/.test(s)) return "<ul>" + kids(null).map(f => `<li><b>${esc(f.name)}</b>: ${deepItems(f.id, ["todo"]).filter(i => !i.x.done).length} open ToDos, ${deepItems(f.id, famTypes("content")).length} content elements</li>`).join("") + "</ul>";
    return `I looked through ${D.todos.length} ToDos, ${D.folders.length} folders and ${D.pages.length} Learn pages. Try asking what is overdue, what is open per folder, or for a summary of this week.`;
  }
  /* ---------- AI assistant side panel (opened from the top bar, keeps the current page) ---------- */
  const MODELS = ["Claude Sonnet 5.5", "Claude Opus 5.5", "Claude Haiku 5.5"];
  // Assistant modes: Ask answers questions, Build creates things, Autopilot runs multi-step tasks
  const ASST_MODES = [
    { id: "ask", label: "Ask", icon: "search", ph: "Ask anything about your workspace…" },
    { id: "build", label: "Build", icon: "wand-sparkles", ph: "How can I help you today?" },
    { id: "autopilot", label: "Autopilot", icon: "sparkles", ph: "Describe a task to run on autopilot…" },
  ];
  const asstMode = () => ASST_MODES.find(m => m.id === S.asst.mode);
  const ASST_SUGGEST = ["Create a sticky with all urgent ToDos", "What is overdue?", "Summarise this week for the team"];
  function assistant() {
    const chat = D.chats.find(c => c.id === S.asst.chatId), log = chat ? chat.log : [];
    const body = log.length
      ? `<div class="asst-msgs">${log.map(m => `<div class="bubble ${m.me ? "me" : "ai"}">${m.me ? esc(m.text) : m.text}</div>`).join("")}</div>`
      : `<div class="asst-sugg"><div class="asst-sugg-h">Suggestions</div>${ASST_SUGGEST.map(s => `<button class="asst-sugg-i" data-a="asst-ask:${esc(s)}">${ic("corner-down-right", 16, "var(--text-tertiary)")}<span>${esc(s)}</span></button>`).join("")}</div>`;
    return `<aside class="asst" aria-label="AI assistant">
      <div class="asst-head">${ic("bot", 18)}<span class="title">${esc(D.workspace.name)} AI</span><span class="spacer"></span>
        <button class="ib" data-a="asst-new" title="New chat">${ic("square-pen")}</button>
        <button class="ib" data-a="asst-history" title="Chat history">${ic("history")}</button>
        <button class="ib" data-a="asst-more" title="More">${ic("ellipsis")}</button></div>
      <div class="asst-log" id="asstlog">${body}</div>
      <div class="asst-compose"><div class="asst-box">
        <span class="asst-ws"><span class="ws-logo">${D.workspace.initial}</span>${esc(D.workspace.name)}</span>
        <textarea id="asst-prompt" rows="2" placeholder="${asstMode().ph}">${esc(S.asst.draft)}</textarea>
        <div class="asst-tools">
          <button class="ib" data-a="toast:Attachments are not available in this prototype" title="Attach">${ic("plus")}</button>
          <button class="ib asst-mode" data-a="asst-mode" title="Mode: ${asstMode().label}">${ic(asstMode().icon)}</button>
          <span class="spacer"></span>
          <button class="asst-model" data-a="asst-model">${ic("asterisk", 15, "#d97757")}${S.asst.model}${ic("chevron-down", 13, "var(--text-tertiary)")}</button>
          <button class="ib" data-a="toast:Voice input is not available in this prototype" title="Voice input">${ic("mic")}</button>
          <button class="ib asst-send" data-a="asst-send" title="Send  ⏎">${ic("arrow-up")}</button>
        </div></div>
        <div class="asst-note">AI can make mistakes, please double-check responses.</div></div>
    </aside>`;
  }
  function askPanel(text) {
    if (!text.trim()) return;
    let chat = D.chats.find(c => c.id === S.asst.chatId);
    if (!chat) { chat = { id: "c" + S.chatSeq++, title: text.slice(0, 32), log: [] }; D.chats.unshift(chat); S.asst.chatId = chat.id; }
    chat.log.push({ me: true, text }, { me: false, text: answer(text) });
    S.asst.draft = ""; render(); focusAsst();
  }
  function focusAsst() { setTimeout(() => { const p = document.getElementById("asst-prompt"); if (p) { p.focus(); p.setSelectionRange(p.value.length, p.value.length); } }); }
  function ask(text) {
    if (!text.trim()) return;
    let chat = D.chats.find(c => "ai/" + c.id === S.route);
    if (!chat) { chat = { id: "c" + S.chatSeq++, title: text.slice(0, 32), log: [] }; D.chats.unshift(chat); }
    chat.log.push({ me: true, text }, { me: false, text: answer(text) });
    go("ai/" + chat.id);
  }

  /* ---------- actions ---------- */

  const A = {
    go: (v) => go(v),
    product: (v) => go(S.lastRoute[v] || v),
    back: () => go(S.lastRoute.work),
    sec: (k) => { S.closedSecs.has(k) ? S.closedSecs.delete(k) : S.closedSecs.add(k); store.set("closedSecs", [...S.closedSecs]); render(); },
    collapse: () => { S.collapsed = !S.collapsed; render(); },
    theme: () => { S.theme = S.theme === "dark" ? "light" : "dark"; render(); },
    settheme: (v) => { S.theme = v; render(); },
    palette: () => openPalette(),
    shortcuts: () => openShortcuts(),
    newproject: () => createItem("project", ctxFolder()),
    newpage: () => createItem("page", ctxFolder()),
    newtodo: () => openTodoDialog({ folder: ctxFolder() }),
    newtimeline: (v) => openPlanDialog("timeline", { folder: v || ctxFolder() }),
    newgoal: (v) => { const [page, h] = (v || "").split("|"); openPlanDialog("goal", { folder: ctxFolder(), page: page || curHzPage().id, h: h || null }); },
    "pd-page": (v, el) => { syncPlanDraft(); const d = S.pdraft; openMenu(el, D.hzPages.map(p => ({ icon: "columns-3", label: p.name || "Untitled", check: d.page === p.id, run: () => { d.page = p.id; d.h = hzCol(d).id; redrawPlanDialog(); } }))); },
    "hz-page-add": (v, el) => openMenu(el, [
      { icon: "columns-3", label: "Now · Next · Later", run: () => addHzPage(HZ_TEMPLATE()) },
      { icon: "square-dashed", label: "Empty page", run: () => addHzPage([{ id: uid("c"), name: "New column", sub: "" }]) }]),
    "hz-page-menu": (v, el) => openMenu(el, [
      { icon: "pencil", label: "Rename", run: () => focusEdit(`[data-edit="hz-page:${v}"]`) },
      { icon: "plus", label: "Add column", run: () => addHzCol(v) },
      { icon: "copy-plus", label: "Duplicate page", run: () => { const p = hzPage(v); addHzPage(p.cols.map(c => ({ id: uid("c"), name: c.name, sub: c.sub })), p.name + " (copy)"); } },
      { icon: "columns-3", label: "New horizon page", run: () => addHzPage(HZ_TEMPLATE()) }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete page…", run: () => deleteHzPageDialog(v) }]),
    "hz-page-del": (v) => {
      const goals = D.horizons.filter(x => x.page === v); goals.forEach(x => trashItem("goal", x.id));
      D.hzPages = D.hzPages.filter(p => p.id !== v); closeLayer(); go("plan/horizons"); toast("Page deleted" + (goals.length ? " · goals moved to the trash" : ""));
    },
    "hz-col-add": (v) => addHzCol(v),
    "hz-col-menu": (v, el) => { const [pid, cid] = v.split("|"), p = hzPage(pid), i = p.cols.findIndex(c => c.id === cid);
      const swap = j => { [p.cols[i], p.cols[j]] = [p.cols[j], p.cols[i]]; render(); };
      openMenu(el, [
        { icon: "pencil", label: "Rename", run: () => focusEdit(`[data-edit="hz-col:${pid}:${cid}"]`) },
        { icon: "text", label: "Edit subtitle", run: () => focusEdit(`[data-edit="hz-sub:${pid}:${cid}"]`) },
        { icon: "plus", label: "Add goal", run: () => A.newgoal(pid + "|" + cid) }, "-",
        ...(i > 0 ? [{ icon: "arrow-left", label: "Move left", run: () => swap(i - 1) }] : []),
        ...(i < p.cols.length - 1 ? [{ icon: "arrow-right", label: "Move right", run: () => swap(i + 1) }] : []),
        { icon: "plus", label: "Add column to the right", run: () => addHzCol(pid, i + 1) },
        ...(p.cols.length > 1 ? ["-", { icon: "trash-2", color: "var(--danger)", label: "Delete column", run: () => deleteHzCol(pid, cid) }] : [])]); },
    "pd-set": (v) => { const [k, val] = v.split("|"); syncPlanDraft(); S.pdraft[k] = val; redrawPlanDialog(); },
    "pd-folder": (v, el) => { syncPlanDraft(); folderPicker(el, S.pdraft.folder, fid => { S.pdraft.folder = fid; redrawPlanDialog(); }); },
    "pd-save": () => savePlanDialog(),
    "pd-trash": () => { const d = S.pdraft; S.pdraft = null; closeLayer(); trashItem(d.t, d.id); render(); },
    qc: (v, el) => quickCreate(el, v || ctxFolder()),
    qcfam: (v, el) => { const [fam, fid] = v.split("|"); quickCreate(el, fid, [fam]); },
    close: () => closeLayer(),
    create: () => submitCreate(),
    "todo-edit": (v) => openTodoDialog({}, v),
    "todo-done": (v) => { const t = todo(v); if (!t) return; t.done = !t.done; closeLayer(); render(); toast(t.done ? "ToDo done" : "ToDo reopened"); },
    toast: (v) => toast(v),
    upload: () => toast("Upload started"),
    study: (v) => { S.study = { deck: v, i: 0, flipped: false, good: 0 }; go("wiki/flashcards/" + v); },
    flip: () => { S.study.flipped = !S.study.flipped; render(); },
    rate: (v) => { const k = D.decks.find(x => x.id === S.study.deck), card = k.cards[S.study.i]; card.known = v === "good"; if (v === "good") S.study.good++; S.study.i++; S.study.flipped = false; k.last = "now";
      if (S.study.i >= k.cards.length) logLearning("study", k.name, S.study.good, k.cards.length);
      render(); },
    pick: (v) => { const p = S.practice; if (p.picked !== null) return; p.picked = +v; if (p.qs[p.i].options[p.picked] === p.qs[p.i].a) p.score++; render(); },
    "practice-next": () => { const p = S.practice; p.i++; p.picked = null; if (p.i >= p.qs.length) logLearning("practice", "Mixed decks", p.score, p.qs.length); render(); },
    "dump-deck": (v) => { S.dump = { deck: v, text: "", result: null }; render(); },
    "dump-check": () => { const t = document.getElementById("dump-text").value; if (!t.trim()) { toast("Write something first"); return; }
      const b = S.dump, deck = D.decks.find(k => k.id === b.deck) || D.decks[0]; b.text = t; b.result = t;
      logLearning("braindump", deck.name, deck.cards.filter(x => recalled(t, x.a)).length, deck.cards.length); render(); },
    "dump-reset": () => { S.dump.text = ""; S.dump.result = null; render(); },
    "practice-restart": () => { S.practice = null; render(); },
    "tutor-ask": (v) => tutorAsk(v),
    open: (v) => { const [t, id] = v.split("|"); openItem(t, id); },
    imenu: (v, el) => { const [t, id] = v.split("|"); itemMenu(el, t, id); },
    move: (v, el) => { const [t, id] = v.split("|"), x = find(t, id); if (x) folderPicker(el, x.folder || null, fid => moveItem(t, id, fid)); },
    star: (v) => { const [t, id] = v.split("|"), x = find(t, id); if (x) { x.starred = !x.starred; render(); toast(x.starred ? "Starred" : "Unstarred"); } },
    trash: (v) => { const [t, id] = v.split("|"), x = find(t, id); if (!x) return; const here = S.route === TYPES[t].route(x); trashItem(t, id); here ? go("files/trash") : render(); },
    "trash-restore": (v) => { const e = D.trash[+v]; restoreTrash(+v); if (e && e.type === "file" && S.route === "files/file/" + e.item.id) render(); else render(); },
    "trash-purge": (v) => { const e = D.trash[+v]; if (!e) return; confirmDelete("Delete forever?", `“${TYPES[e.type].name(e.item)}” will be removed permanently. This can’t be undone.`, () => { D.trash.splice(D.trash.indexOf(e), 1); go("files/trash"); toast("Deleted forever"); }); },
    "trash-empty": () => { const n = D.trash.length;
      confirmDelete("Empty trash?", `${n} ${n === 1 ? "element" : "elements"} will be removed permanently. This can’t be undone.`, () => { D.trash = []; render(); toast("Trash emptied"); }); },
    openfolder: (v) => { S.openFolders.add(v); go("folder/" + v); },
    fmenu: (v, el) => folderMenu(el, v),
    fsettings: (v) => openFolderSettings(v),
    ftab: (v) => { S.ftab = v; render(); },
    "fd-save": () => saveFolderDialog(),
    "fd-icon": (v) => { S.fdraft.icon = v; delete S.fdraft.emoji; redrawFolderDialog(); },
    "fd-color": (v) => { S.fdraft.color = v === "none" ? "" : v; redrawFolderDialog(); },
    "fd-kb": () => { syncFolderDraft(); const d = S.fdraft, parent = folder(d.parent), inh = parent ? kbState(parent).on : false; d.kb = !(d.kb != null ? d.kb : inh); redrawFolderDialog(); },
    "fd-kb-inherit": () => { syncFolderDraft(); delete S.fdraft.kb; redrawFolderDialog(); },
    "fd-project": () => { syncFolderDraft(); S.fdraft.project = S.fdraft.project ? null : { target: "", milestones: [] }; redrawFolderDialog(); },
    "fd-parent": (v, el) => { syncFolderDraft(); folderPicker(el, S.fdraft.parent || null, pid => { S.fdraft.parent = pid; redrawFolderDialog(); }, S.fdraft.id ? subtreeIds(S.fdraft.id) : []); },
    "fdel-keep": (v) => deleteFolder(v, false),
    "fdel-all": (v) => deleteFolder(v, true),
    "reset-data": () => confirmDelete("Reset demo data?", "All your changes in this browser are replaced by the original sample data.", () => { clearTimeout(saveTimer); store.set("data", null); store.set("route", "pin/inbox"); location.reload(); }),
    opensec: (v) => { const [key, route] = v.split("|"); S.closedSecs.delete(key); store.set("closedSecs", [...S.closedSecs]); go(route); },
    "kb-menu": (v, el) => openMenu(el, [
      { icon: "book-marked", label: "Open", run: () => go("files/kb/" + v) }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete collection", run: () => { D.knowledge.splice(D.knowledge.findIndex(x => x.id === v), 1); render(); toast("Collection deleted — its files are untouched"); } }]),
    "kb-remove": (v) => { const [id, name] = v.split("|"), k = D.knowledge.find(x => x.id === id); k.files = k.files.filter(n => n !== name); render(); toast("Removed from " + k.name); },
    "summary-src": (v) => { S.summary = v; render(); },
    "summary-note": () => { const s = summarySource(S.summary), id = "n" + Date.now().toString(36);
      D.notes.unshift({ id, title: "Summary: " + s.title, body: s.points.map(x => "• " + x).join("\n"), labels: [], updated: "now", folder: null }); toast("Saved to Notes"); },
    "tutor-send": () => tutorAsk(document.getElementById("tutor-prompt").value),
    "tutor-clear": () => { D.tutorLog.length = 0; render(); },
    "note-add": () => createItem("note"),
    "note-labels": (v, el) => { const n = D.notes.find(x => x.id === v); n.labels = n.labels || [];
      openMenu(el, Object.keys(D.labels).map(l => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:8px;height:8px;border-radius:99px;background:${D.labels[l]}"></span></span>`, label: l, check: n.labels.includes(l),
        run: () => { n.labels = n.labels.includes(l) ? n.labels.filter(x => x !== l) : n.labels.concat(l); n.updated = "now"; render(); } }))); },
    "note-menu": (v, el) => itemMenu(el, "note", v),
    "note-new-menu": (v, el) => openMenu(el, [
      { icon: "file-text", label: "Blank note", run: () => A["note-add"]() },
      { icon: "layout-template", label: "Meeting notes template", run: () => { A["note-add"](); const n = D.notes[0]; n.title = "Meeting notes " + TODAY.getDate() + " " + MONTHS[TODAY.getMonth()]; n.body = "Attendees:\nAgenda:\nDecisions:\nNext steps:"; render(); } }]),
    "notes-filter": (v, el) => openMenu(el, [{ icon: "list", label: "All labels", check: !S.notesLabel, run: () => { S.notesLabel = null; render(); } }, "-"].concat(Object.keys(D.labels).map(l => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:8px;height:8px;border-radius:99px;background:${D.labels[l]}"></span></span>`, label: l, check: S.notesLabel === l, run: () => { S.notesLabel = l; render(); } })))),
    "notes-clear": () => { S.notesLabel = null; render(); },
    "notes-more": (v, el) => openMenu(el, [{ icon: "plus", label: "New note", run: () => A["note-add"]() }, { icon: "link", label: "Copy link to collection", run: () => toast("Link copied") }]),
    "note-del": (v) => { trashItem("note", v); go("work/notes"); },
    "cv-add": (kind) => { const wrap = document.querySelector(".canvas-wrap"), n = curBoard().items.length; addCanvasItem(kind, (wrap ? wrap.scrollLeft : 0) + 60 + n * 24 % 240, (wrap ? wrap.scrollTop : 0) + 60 + n * 24 % 240); },
    "cv-del": (v) => { const b = boardOf(v); b.items.splice(b.items.findIndex(c => c.id === v), 1); render(); },
    openrow: (v) => { const [id, route] = v.split("|"); S.openFolders.add(id); store.set("openFolders", [...S.openFolders]); go(route); },
    "canvas-menu": (v, el) => openMenu(el, [
      { icon: "layout-dashboard", label: "Open", run: () => go("work/canvas/" + v) },
      { icon: "copy-plus", label: "Duplicate", run: () => { const b = D.canvases.find(x => x.id === v), s = Date.now().toString(36);
        D.canvases.splice(D.canvases.indexOf(b) + 1, 0, { id: "b" + s, name: b.name + " (copy)", updated: "now", folder: b.folder || null, items: b.items.map((c, n) => Object.assign({}, c, { id: "cv" + s + n })) }); render(); toast("Canvas duplicated"); } },
      { icon: "folder-input", label: "Move to folder…", run: () => A.move("canvas|" + v, el) }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Move to trash", run: () => { trashItem("canvas", v); S.route === "work/canvas/" + v ? go("work/canvas") : render(); } }]),
    "canvas-add": () => createItem("canvas"),
    "sticky-add": () => { const id = "s" + Date.now().toString(36); D.stickies.unshift({ id, text: "", color: "amber", updated: "now", folder: null }); render(); setTimeout(() => { const el = document.querySelector("[data-edit=\"sticky:" + id + "\"]"); el && el.focus(); }); },
    "sticky-del": (v) => { trashItem("sticky", v); render(); },
    "sticky-color": (v, el) => openMenu(el, Object.keys(STICKY_COLORS).map(k => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:10px;height:10px;border-radius:3px;background:${STICKY_COLORS[k][1]}"></span></span>`, label: k[0].toUpperCase() + k.slice(1), check: D.stickies.find(s => s.id === v).color === k, run: () => { D.stickies.find(s => s.id === v).color = k; render(); } }))),
    tfold: (v) => { S.openFolders.has(v) ? S.openFolders.delete(v) : S.openFolders.add(v); store.set("openFolders", [...S.openFolders]); render(); },
    newfolder: (v) => createItem("folder", v || null),
    newcollection: () => { const id = uid("kb"); D.knowledge.push({ id, name: "New collection", files: [] }); S.openFolders.add(id); S.closedSecs.delete("kbase"); render(); toast("Collection created"); },
    timer: () => {
      const t = S.timer;
      if (t.running) { // log elapsed time (min. 0.1h) on today for the selected work item
        const h = Math.max(0.1, (Date.now() - t.start) / 36e5), x = todo(t.todo);
        let e = D.timeEntries.find(y => y.todo === t.todo);
        if (!e) { e = { todo: t.todo, hours: [0, 0, 0, 0, 0, 0, 0] }; D.timeEntries.unshift(e); }
        e.hours[TODAY_IDX] += h; t.running = false; toast(fmtH(h) + "h logged on " + (x ? x.text : "ToDo"));
      } else { t.running = true; t.start = Date.now(); }
      render();
    },
    "timer-todo": (v, el) => openMenu(el, D.todos.filter(t => !t.done).map(t => ({ icon: "circle", label: t.text, check: S.timer.todo === t.id, run: () => { S.timer.todo = t.id; render(); } }))),
    "asst-toggle": () => { S.asst.open = !S.asst.open; render(); if (S.asst.open) focusAsst(); },
    "asst-send": () => askPanel(document.getElementById("asst-prompt").value),
    "asst-ask": (v) => askPanel(v),
    "asst-new": () => { S.asst.chatId = null; S.asst.draft = ""; render(); focusAsst(); },
    "asst-mode": (v, el) => { el.classList.add("on"); openMenu(el, ASST_MODES.map(m => ({ icon: m.icon, label: m.label, check: S.asst.mode === m.id, run: () => { S.asst.mode = m.id; render(); focusAsst(); } }))); },
    "asst-model": (v, el) => openMenu(el, MODELS.map(m => ({ icon: "asterisk", color: "#d97757", label: m, check: S.asst.model === m, run: () => { S.asst.model = m; render(); } }))),
    "asst-history": (v, el) => openMenu(el, D.chats.length ? D.chats.map(c => ({ icon: "message-square", label: c.title, check: S.asst.chatId === c.id, run: () => { S.asst.chatId = c.id; render(); } })) : [{ icon: "message-square", label: "No chats yet" }]),
    "asst-more": (v, el) => openMenu(el, [
      { icon: "maximize-2", label: "Open as full page", run: () => { const id = S.asst.chatId; S.asst.open = false; go(id ? "ai/" + id : "ai/new"); } },
      { icon: "eraser", label: "Clear conversation", run: () => { const c = D.chats.find(x => x.id === S.asst.chatId); if (c) c.log = []; render(); } }, "-",
      { icon: "x", label: "Close", run: () => { S.asst.open = false; render(); } }]),
    todo: (v) => { const t = todo(v); if (t) { t.done = !t.done; render(); } },
    "todo-del": (v) => { trashItem("todo", v); render(); },
    "ib-open": (v) => { const m = D.inbox.find(x => x.id === +v); m.unread = false; if (m.todo) go("pin/todos"); else if (m.link) go(m.link); else render(); },
    "ib-read": (v) => { const m = D.inbox.find(x => x.id === +v); m.unread = !m.unread; render(); },
    "ib-done": (v) => { const m = D.inbox.find(x => x.id === +v); m.done = true; m.unread = false; render(); toast("Notification cleared"); },
    "ib-restore": () => { D.inbox.forEach(m => m.done = false); render(); },
    "ibx-t": (v) => { S.ibxT = v; render(); },
    "ibx-n": (v) => { S.ibxN = v; render(); },
    // from the greeting or a tile: switch the tab, then scroll to its card (or open the full page when the card is hidden)
    "ibx-go": (v) => {
      const [k, tab] = v.split(":"), id = k === "t" ? "todos" : "notes";
      if (k === "t") S.ibxT = tab; else S.ibxN = tab;
      if (!S.ibx.some(w => w.id === id && w.on)) return k === "t" ? go("pin/todos") : toast("Notifications are hidden. Turn them on in Customize.");
      render(); const el = document.getElementById("ibx-w-" + id); el && el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    "ibx-custom": () => { S.ibx = S.ibx || ibxLoad(); openLayer(ibxCustomHtml()); },
    "ibc-move": (v) => { const [i, d] = v.split("|").map(Number), j = i + d; if (j < 0 || j >= S.ibx.length) return; [S.ibx[i], S.ibx[j]] = [S.ibx[j], S.ibx[i]]; ibxSave(); },
    "ibc-size": (v) => { const [i, size] = v.split("|"); S.ibx[+i].size = size; ibxSave(); },
    "ibc-on": (v) => { S.ibx[+v].on = !S.ibx[+v].on; ibxSave(); },
    "ibc-rows": (v) => { S.ibxRows = +v; ibxSave(); },
    "ibc-reset": () => { S.ibx = ibxDefault(); S.ibxRows = 6; ibxSave(); },
    readall: () => { D.inbox.forEach(m => m.unread = false); render(); toast("All notifications marked read"); },
    pref: (k) => { S.prefs[k] = !S.prefs[k]; render(); },
    savews: () => { const v = document.getElementById("wsname").value.trim(); if (v) { D.workspace.name = v; D.workspace.initial = v[0].toUpperCase(); } render(); toast("Workspace saved"); },
    ask: (v) => ask(v),
    send: () => { const p = document.getElementById("prompt"); ask(p.value); },
    wsmenu: (v, el) => openMenu(el, [{ lead: `<span class="ws-logo" style="width:16px;height:16px;font-size:9px;border-radius:4px">${D.workspace.initial}</span>`, label: D.workspace.name, check: true }, "-", { icon: "settings", label: "Workspace settings", run: () => go("settings/general") }, { icon: "users", label: "Invite members", run: () => go("settings/members") }, "-", { icon: "panel-left", label: "Collapse sidebar", kbd: ["["], run: () => A.collapse() }]),
    usermenu: (v, el) => openMenu(el, [{ icon: "user-round", label: "Profile", run: () => go("settings/profile") }, { icon: "palette", label: "Preferences", run: () => go("settings/preferences") }, { icon: "keyboard", label: "Keyboard shortcuts", run: openShortcuts }, "-", { icon: "log-out", label: "Sign out", run: () => toast("Signed out (prototype)") }]),
    "d-prio": (v, el) => openMenu(el, D.priorities.map(p => ({ icon: p.icon, color: p.color, label: p.name, check: S.draft.prio === p.id, run: () => { S.draft.prio = p.id; refreshDraftChips(); } }))),
    "d-due": (v, el) => openMenu(el, [["Today", 0], ["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, n]) => ({ icon: "calendar", label: l + "  ·  " + plusDays(n), check: S.draft.due === plusDays(n), run: () => { S.draft.due = plusDays(n); refreshDraftChips(); } })).concat(["-", { icon: "calendar-x", label: "No date", check: !S.draft.due, run: () => { S.draft.due = null; refreshDraftChips(); } }])),
    "d-dur": (v, el) => openMenu(el, DUR_OPTS.map(m => ({ icon: "timer", label: fmtDur(m), check: S.draft.dur === m, run: () => { S.draft.dur = m; refreshDraftChips(); } })).concat(["-", { icon: "timer-off", label: "No duration", check: !S.draft.dur, run: () => { S.draft.dur = null; refreshDraftChips(); } }])),
    "d-folder": (v, el) => folderPicker(el, S.draft.folder, fid => { S.draft.folder = fid; refreshDraftChips(); }),
    "d-more": (v, el) => { S.draft.more = !S.draft.more; el.classList.toggle("on", S.draft.more); },
  };
  Object.assign(A, CAL_A);

  document.addEventListener("click", e => {
    const mi = e.target.closest("[data-mi]");
    if (mi) { const it = menuItems[+mi.dataset.mi]; closeMenu(); it && it.run && it.run(); return; }
    if (menuEl && !e.target.closest(".menu")) { const wasOpen = menuEl; closeMenu(); if (wasOpen && !e.target.closest("[data-a]")) return; }
    if (calPop && !e.target.closest(".cal-pop,.scrim,.toast")) { closeCalPop(); if (!e.target.closest("[data-a]")) return; }
    const el = e.target.closest("[data-a]");
    if (!el) return;
    e.stopPropagation();
    const a = el.dataset.a, k = a.indexOf(":"), name = k < 0 ? a : a.slice(0, k), val = k < 0 ? undefined : a.slice(k + 1);
    A[name] && A[name](val, el);
  });

  // right-click on any element or folder opens its actions menu (text fields keep the browser menu)
  document.addEventListener("contextmenu", e => {
    const el = e.target.closest("[data-drag]");
    if (!el || e.target.closest("[contenteditable='true'],input,textarea")) return;
    e.preventDefault();
    const [t, id] = el.dataset.drag.split(":"), at = { getBoundingClientRect: () => ({ left: e.clientX, top: e.clientY, bottom: e.clientY }) };
    t === "folder" ? folderMenu(at, id) : itemMenu(at, t, id);
  });
  // drag elements or folders onto a folder row (sidebar, folder page, timelines) to move them there
  let dragKey = null;
  document.addEventListener("dragstart", e => {
    const el = e.target.closest && e.target.closest("[data-drag]");
    if (!el || el.getAttribute("draggable") !== "true") return;
    dragKey = el.dataset.drag; e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", dragKey); } catch (err) {}
    setTimeout(() => el.classList.add("drag-src"));
  });
  document.addEventListener("dragend", () => { dragKey = null; document.querySelectorAll(".drag-src,.drop-hi").forEach(x => x.classList.remove("drag-src", "drop-hi")); });
  document.addEventListener("dragover", e => {
    const el = dragKey && e.target.closest("[data-drop]"); if (!el) return;
    const [t, id] = dragKey.split(":"); if (t === "folder" && subtreeIds(id).includes(el.dataset.drop)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".drop-hi").forEach(x => x !== el && x.classList.remove("drop-hi")); el.classList.add("drop-hi");
  });
  document.addEventListener("dragleave", e => { const el = e.target.closest && e.target.closest("[data-drop]"); if (el && !el.contains(e.relatedTarget)) el.classList.remove("drop-hi"); });
  document.addEventListener("drop", e => {
    const el = dragKey && e.target.closest("[data-drop]"); if (!el) return;
    e.preventDefault();
    const [t, id] = dragKey.split(":"), fid = el.dataset.drop || null; dragKey = null;
    t === "folder" ? moveFolder(id, fid) : moveItem(t, id, fid);
  });

  // canvas: add a card where you double-click, drag cards by their handle (moves the element directly, saves on release)
  function addCanvasItem(kind, x, y) {
    const id = "cv" + Date.now().toString(36);
    curBoard().items.push({ id, kind, text: "", x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), w: kind === "sticky" ? 180 : 220, color: "amber" });
    render(); setTimeout(() => { const el = document.querySelector(`[data-edit="canvas:${id}"]`); el && el.focus(); });
  }
  document.addEventListener("dblclick", e => {
    const cv = e.target.id === "canvas" && e.target; if (!cv) return;
    const r = cv.getBoundingClientRect(); addCanvasItem("card", e.clientX - r.left - 20, e.clientY - r.top - 14);
  });
  let drag = null;
  document.addEventListener("pointerdown", e => {
    const grip = e.target.closest(".cv-grip"); if (!grip || e.target.closest("button")) return;
    const el = grip.closest(".cv-item"); e.preventDefault();
    drag = { el, id: el.dataset.cv, dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop }; el.classList.add("dragging");
  });
  document.addEventListener("pointermove", e => { if (!drag) return; drag.el.style.left = Math.max(0, e.clientX - drag.dx) + "px"; drag.el.style.top = Math.max(0, e.clientY - drag.dy) + "px"; });
  document.addEventListener("pointerup", () => {
    if (!drag) return; const c = cvFind(drag.id);
    if (c) { c.x = drag.el.offsetLeft; c.y = drag.el.offsetTop; } drag.el.classList.remove("dragging"); drag = null;
  });

  // keep the assistant draft across re-renders
  document.addEventListener("input", e => { if (e.target.id === "asst-prompt") S.asst.draft = e.target.value; if (e.target.id === "dump-text") S.dump.text = e.target.value; });

  // inline edits (titles, descriptions, wiki pages) save on blur
  document.addEventListener("focusout", e => {
    const el = e.target.closest && e.target.closest("[data-edit]");
    if (!el) return;
    const [kind, id, n] = el.dataset.edit.split(":"), text = el.innerText.trim();
    // horizon page / column names and subtitles; textContent because column names are shown upper-case; an empty name keeps the old one
    if (kind === "hz-page" || kind === "hz-col" || kind === "hz-sub") {
      const p = D.hzPages.find(x => x.id === id), c = p && p.cols.find(x => x.id === n), val = el.textContent.replace(/\s+/g, " ").trim();
      if (!p || (kind !== "hz-page" && !c)) return;
      if (kind === "hz-sub") c.sub = val;
      else if (val) { if (kind === "hz-page") p.name = val; else c.name = val; }
      el.textContent = kind === "hz-page" ? p.name : kind === "hz-col" ? c.name : c.sub;
      if (kind === "hz-page") document.querySelectorAll(`.sidebar [data-a="go:plan/horizons/${id}"] .lbl`).forEach(l => l.textContent = p.name);
      save(); return;
    }
    if (kind === "page-title" && text) D.pages.find(p => p.id === id).title = text;
    if (kind === "page-body") D.pages.find(p => p.id === id).body[+n] = text;
    if (kind === "note-title" || kind === "note-body") { // update the list row in place (no re-render, so the next click still lands)
      const note = D.notes.find(x => x.id === id); if (!note) return;
      note[kind === "note-title" ? "title" : "body"] = text; note.updated = "now";
      if (kind === "note-title") document.querySelectorAll(`[data-note-title="${id}"], .sidebar [data-a="go:work/notes/${id}"] .lbl`).forEach(el => el.textContent = text || "Untitled");
    }
    if (kind === "canvas") { const c = cvFind(id); if (c) c.text = text; }
    if (kind === "sticky") {
      const s = D.stickies.find(x => x.id === id); if (!s) return;
      s.text = text; s.updated = "now";
      document.querySelectorAll(`.sidebar [data-a="go:work/stickies/${id}"] .lbl`).forEach(el => el.textContent = stickyLabel(s));
    }
    const sb = document.querySelector(".sidebar"); if (sb && kind === "page-title") { const st = sb.scrollTop; render(); document.querySelector(".sidebar").scrollTop = st; }
    save();
  });

  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); layer ? closeLayer() : openPalette(); return; }
    if (e.key === "Escape") { if (menuEl) closeMenu(); else if (layer) closeLayer(); else if (calPop) closeCalPop(); else if (typing) e.target.blur(); return; }
    if (layer && layer.querySelector(".cal-ed") && ((e.metaKey || e.ctrlKey) && e.key === "Enter" || (e.target.id === "ce-title" && e.key === "Enter"))) { e.preventDefault(); saveEd(); return; }
    if (e.key === "Enter" && e.target.dataset && /^hz-/.test(e.target.dataset.edit || "")) { e.preventDefault(); e.target.blur(); return; } // horizon names are single-line
    if (e.target.id === "ce-guest" && (e.key === "Enter" || e.key === ",")) { e.preventDefault(); syncEd(); addGuest(e.target.value); return; }
    if (e.target.id === "cd-h" && e.key === "Enter") { e.preventDefault(); A["cal-tdur"]("custom"); return; }
    if (e.target.id === "cq-title" && e.key === "Enter") { e.preventDefault(); saveQuick(); return; }
    if (e.target.id === "cc-name" && e.key === "Enter") { e.preventDefault(); saveCalDialog(); return; }
    if (e.target.id === "gd-date" && e.key === "Enter") { e.preventDefault(); A["cal-gd"](); return; }
    if (e.target.id === "cal-q" && e.key === "Enter") { e.preventDefault(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && layer && S.draft && layer.querySelector("#dtitle")) { submitCreate(); return; }
    if (e.target.id === "fd-name" && e.key === "Enter") { e.preventDefault(); saveFolderDialog(); return; }
    if (layer && S.pdraft && layer.querySelector("#pd-name") && ((e.metaKey || e.ctrlKey) && e.key === "Enter" || (e.target.id === "pd-name" && e.key === "Enter"))) { e.preventDefault(); savePlanDialog(); return; }
    if (e.target.id === "prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(e.target.value); return; }
    if (e.target.id === "tutor-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tutorAsk(e.target.value); return; }
    if (e.target.id === "asst-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askPanel(e.target.value); return; }
    if (e.target.id === "dtitle" && e.key === "Enter") { e.preventDefault(); submitCreate(); return; }
    if (e.target.id === "todo-new" && e.key === "Enter" && e.target.value.trim()) {
      D.todos.unshift({ id: uid("t"), text: e.target.value.trim(), prio: 0, folder: null }); render();
      const inp = document.getElementById("todo-new"); inp && inp.focus(); return;
    }
    if (typing || layer || e.metaKey || e.ctrlKey || e.altKey) return;
    if (S.route === "pin/calendar" && calKey(e)) return;
    if (/^wiki\/flashcards\/./.test(S.route) && S.study.deck) {
      if (e.key === " ") { e.preventDefault(); A.flip(); return; }
      if (S.study.flipped && (e.key === "1" || e.key === "2")) { A.rate(e.key === "1" ? "again" : "good"); return; }
    }
    if (S.route === "wiki/practice/test" && S.practice) {
      const n = "abcd".indexOf(e.key.toLowerCase()); if (n >= 0 && S.practice.picked === null && S.practice.qs[S.practice.i]) { A.pick(n); return; }
      if (e.key === "Enter" && S.practice.picked !== null) { A["practice-next"](); return; }
    }
    if (e.key === "c") { e.preventDefault(); quickCreate(); }
    else if (e.key === "a") { e.preventDefault(); A["asst-toggle"](); }
    else if (e.key === "[") { S.collapsed = !S.collapsed; render(); }
    else if (/^[1-5]$/.test(e.key)) A.product(["plan", "work", "wiki", "files", "ai"][+e.key - 1]);
    else if (e.key === ",") A.product("settings");
  });

  // tick the running timer label without re-rendering the page
  setInterval(() => { const c = document.getElementById("timer-clock"); if (c && S.timer.running) c.textContent = fmtClock(Date.now() - S.timer.start); }, 1000);

  render();
})();
