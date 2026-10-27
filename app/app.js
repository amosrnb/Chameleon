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
    prefs: { notifications: true, digest: false, autoAssign: true, publicLinks: false },
    chatSeq: 3,
    study: { deck: null, i: 0, flipped: false, good: 0 }, // flashcard session
    practice: null, // current practice round
    dump: { deck: "d1", text: "", result: null }, // brain dump session
    summary: "page:design", // source shown on the tutor summary page
    notesLabel: null, // label filter on the notes overview
    timer: { running: false, start: 0, todo: "t-128" },
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
    goal: { fam: "plan", label: "Goal", plural: "Goals", icon: () => "telescope", list: () => D.horizons, name: x => x.title, route: () => "plan/horizons" },
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
  const PROD_TYPES = { plan: ["todo", "goal"], work: ["note", "canvas", "sticky"], wiki: ["deck", "page"], files: TYPE_KEYS, ai: ["chat"] };
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
  // one row of an element inside the sidebar tree; ToDos and goals share a page, so they never show as active
  function treeItem({ t, x }, depth) {
    const T = TYPES[t], route = T.route(x);
    return nav(route, T.icon(x), T.name(x), { sub: true, pad: 30 + Math.min(depth, 4) * 14, drag: t + ":" + x.id, active: T.fam === "plan" ? false : null, color: t === "todo" && x.done ? "var(--success)" : "" });
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
        ${nav("plan/horizons", "telescope", "Horizons")}
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
    if (t === "goal") return { now: "Now", next: "Next", later: "Later" }[x.h] || "";
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
      : (plan.length ? `<div class="coll-table fd-area">${itemGroups(plan)}</div>` : empty("calendar-check", "No ToDos or goals in this folder yet."));
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
  // Inbox: everything still open in one list (notifications, then ToDos by due date), context tiles on the side — no collaboration yet
  const IB_ICONS = { reminder: "bell", study: "gallery-vertical-end", milestone: "flag", time: "timer", done: "circle-check", system: "sparkles" };
  const dueLabel = dd => dd < 0 ? `${-dd}d overdue` : dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : `In ${dd}d`;
  function viewInbox() {
    const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const open = D.inbox.filter(m => !m.done), cleared = D.inbox.length - open.length, unread = unreadCount();
    const mono = s => `<span class="mono ibx-m">${s}</span>`;
    const tileHead = (k, right) => `<div class="ibx-tile-top"><span class="label-mono">${k}</span>${right}</div>`;
    // open ToDos bucketed by due date; undated ones go last
    const openT = D.todos.filter(t => !t.done).map(t => ({ t, dd: t.due ? dayDiff(t.due) : null }));
    const bucket = f => openT.filter(f).sort((a, b) => a.dd - b.dd);
    const over = bucket(x => x.dd !== null && x.dd < 0), today = bucket(x => x.dd === 0), week = bucket(x => x.dd > 0 && x.dd <= 7),
      later = bucket(x => x.dd > 7), undated = openT.filter(x => x.dd === null);

    // summary strip: one number per bucket, click jumps to it
    const sum = (k, n, icon, target, cls = "") => `<div class="ibx-tile ibx-sum-t${cls}" data-a="ibx-jump:${target}">${tileHead(k, ic(icon, 14, "var(--text-tertiary)"))}<div class="ibx-big">${n}</div></div>`;
    const summary = `<div class="ibx-sum">
      ${sum("Unread", unread, "mail", "ibx-notes")}
      ${sum("Overdue", over.length, "circle-alert", over.length ? "ibx-g-over" : "ibx-todos", over.length ? " hot" : "")}
      ${sum("Due today", today.length, "calendar-check", today.length ? "ibx-g-today" : "ibx-todos")}
      ${sum("This week", week.length, "calendar-range", week.length ? "ibx-g-week" : "ibx-todos")}</div>`;

    const KIND = { reminder: "Reminder", study: "Study", milestone: "Milestone", time: "Time", done: "Done", system: "System" };
    const row = m => {
      const t = m.todo && todo(m.todo), fo = t && folder(t.folder);
      const title = t ? esc(t.text) : esc(m.title || "Deleted ToDo");
      return `<div class="ibx-row${m.unread ? " unread" : ""}" data-a="ib-open:${m.id}"><span class="ibx-ico">${ic(IB_ICONS[m.kind] || "bell", 15)}</span>
        <span class="ibx-txt"><span class="ibx-t">${title}</span><span class="ibx-s">${esc(m.body)}</span></span>
        <span class="ibx-col">${fo ? esc(fo.name) : ""}</span><span class="ibx-col label-mono">${KIND[m.kind] || ""}</span>
        <span class="ibx-time">${m.time}</span>${m.unread ? '<span class="unread-dot"></span>' : '<span class="dot-gap"></span>'}
        <span class="ibx-tools"><button class="ib sm" data-a="ib-read:${m.id}" title="${m.unread ? "Mark read" : "Mark unread"}">${ic(m.unread ? "mail-open" : "mail", 14)}</button><button class="ib sm" data-a="ib-done:${m.id}" title="Clear">${ic("check", 14)}</button></span></div>`;
    };
    // the circle ticks a ToDo off, the rest of the row opens the ToDos page
    const todoRow = ({ t, dd }) => {
      const pr = prio(t.prio);
      return `<div class="ibx-row ibx-todo${dd !== null && dd < 0 ? " late" : ""}" data-a="go:pin/todos"><span class="ibx-ck" data-a="todo:${t.id}" title="Mark done"></span>
        <span class="ibx-txt"><span class="ibx-t">${esc(t.text)}</span></span>
        <span class="ibx-col">${esc(folderName(t.folder) || "")}</span><span class="ibx-pr" title="${pr.name}">${pr.id ? ic(pr.icon, 13, "var(--text-tertiary)") : ""}</span>
        <span class="ibx-due-l">${dd === null ? "No date" : dueLabel(dd)}</span></div>`;
    };
    const group = (lbl, list, render, id = "", cls = "") => list.length ? `<div class="ibx-group label-mono${cls}"${id ? ` id="${id}"` : ""}>${lbl}<span>${list.length}</span></div>${list.map(render).join("")}` : "";
    const section = (id, title, n, extra, body) => `<section class="ibx-sec" id="${id}"><div class="ibx-sec-h"><h2 class="ibx-h2">${title}</h2><span class="label-mono">${n}</span>${extra}</div>${body}</section>`;

    const notes = section("ibx-notes", "Notifications", open.length, cleared ? `<span class="ibx-link" data-a="ib-restore">Restore ${cleared} cleared</span>` : "",
      open.length ? `<div class="box ibx-list">${group("New", open.filter(m => m.unread), row)}${group("Earlier", open.filter(m => !m.unread), row)}</div>`
        : `<div class="box ibx-list ibx-empty">${ic("sparkles", 16, "var(--text-tertiary)")}You're all caught up.</div>`);
    const todos = section("ibx-todos", "ToDos", openT.length, `<span class="ibx-link" data-a="go:pin/todos">All ToDos</span>`,
      openT.length ? `<div class="box ibx-list">${group("Overdue", over, todoRow, "ibx-g-over", " late")}${group("Today", today, todoRow, "ibx-g-today")}${group("This week", week, todoRow, "ibx-g-week")}${group("Later", later, todoRow)}${group("No date", undated, todoRow)}</div>`
        : `<div class="box ibx-list ibx-empty">${ic("circle-check", 16, "var(--text-tertiary)")}Nothing open.</div>`);

    // side column: context, not tasks
    const kv = (k, v) => `<div class="ibx-kv"><span>${k}</span>${mono(v)}</div>`;
    const days = Array.from({ length: 14 }, (_, d) => ({ d, n: openT.filter(x => x.dd === d).length, wd: "MTWTFSS"[(TODAY_IDX + d) % 7] }));
    const myHours = [0, 1, 2, 3, 4, 5, 6].map(d => D.timeEntries.reduce((s, e) => s + e.hours[d], 0));
    const maxH = Math.max(4, ...myHours), totalH = myHours.reduce((a, b) => a + b, 0);
    const cards = D.decks.flatMap(d => d.cards), known = cards.filter(c => c.known).length, studyMin = D.studyMinutes.reduce((a, b) => a + b, 0);
    // dates carry no year, so an end far in the past (e.g. January) means next year
    const ms = projects().flatMap(p => (p.project.milestones || []).map(m => ({ m, p, dd: (d => d < -180 ? d + 365 : d)(dayDiff(m.end)) }))).filter(x => x.dd >= 0).sort((a, b) => a.dd - b.dd).slice(0, 3);
    const side = `<aside class="ibx-side">
      <div class="ibx-tile">${tileHead("Next 14 days", `<span class="label-mono">${days.reduce((s, x) => s + x.n, 0)} due</span>`)}
        <div class="ibx-dots">${days.map(x => `<div class="col${x.d === 0 ? " now" : ""}" title="${x.n} due ${x.d === 0 ? "today" : "in " + x.d + "d"}"><em>${x.n || ""}</em>${[3, 2, 1, 0].map(k => `<i class="${k < x.n ? "on" : ""}"></i>`).join("")}<b>${x.wd}</b></div>`).join("")}</div></div>
      <div class="ibx-tile" data-a="go:plan/time">${tileHead("Focus this week", ic("timer", 14, "var(--text-tertiary)"))}
        <div class="ibx-big">${totalH}h<small> / ${(totalH / Math.max(1, TODAY_IDX + 1)).toFixed(1)}h per day</small></div>
        <div class="ibx-bars">${myHours.map((h, d) => `<div class="b${d === TODAY_IDX ? " now" : ""}"><span class="${h ? "" : "zero"}" style="height:${Math.max(6, h / maxH * 100)}%"></span><b>${"MTWTFSS"[d]}</b></div>`).join("")}</div></div>
      <div class="ibx-tile">${tileHead("Projects", `<span class="ibx-link" data-a="go:plan/timelines">Timeline</span>`)}
        ${projects().map(p => { const pct = projProgress(p); return `<div class="ibx-prow" data-a="openfolder:${p.id}"><span class="t">${esc(p.name)}</span><span class="bar"><span style="width:${pct}%"></span></span>${mono(pct + "%")}</div>`; }).join("") || '<div class="ibx-kv"><span>No project folders yet</span></div>'}
        ${ms.length ? `<div class="label-mono ibx-sub">Milestones</div><div class="ibx-mini">${ms.map(({ m, p, dd }) => `<div data-a="openfolder:${p.id}"><span class="t">${esc(m.name)} <span style="color:var(--text-tertiary)">· ${esc(p.name)}</span></span>${mono(dueLabel(dd))}</div>`).join("")}</div>` : ""}</div>
      <div class="ibx-tile" data-a="go:wiki/flashcards">${tileHead("Learning", ic("gallery-vertical-end", 14, "var(--text-tertiary)"))}
        <div class="ibx-big">${cards.length ? Math.round(known / cards.length * 100) : 0}%<small> mastered</small></div>
        ${kv("Cards known", known + " / " + cards.length)}${kv("Studied this week", studyMin + " min")}</div>
    </aside>`;

    return header("Inbox", { lead: ic("inbox", 16, "var(--text-secondary)"), actions: `<button class="btn sm ghost" data-a="readall">${ic("check-check", 13)}Mark all read</button>` }) + `<div class="scroll"><div class="home ibx">
      <h1 class="ibx-title">${greet}, ${esc(D.me.split(" ")[0])}. <span>Here's what's open.</span></h1>
      ${summary}
      <div class="ibx-layout"><div class="ibx-main">${notes}${todos}</div>${side}</div>
    </div></div>`;
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
          <div class="coll-table"><div class="coll-row c5 head"><span>Deck</span><span>Cards</span><span>To learn</span><span>Last studied</span><span></span></div>${rows}</div>
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
    if (kind === "deck") { const k = D.decks.find(x => x.id === id); if (k) return { title: k.name, kind: "Deck", icon: "gallery-vertical-end", points: k.cards.map(x => `${x.q.replace(/\?$/, "")}: ${x.a}`) }; }
    const p = D.pages.find(x => x.id === id) || D.pages[0];
    return { title: p.title, kind: "Page", icon: p.icon, points: p.body.join(" ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) };
  }
  function viewSummary() {
    const src = S.summary, s = summarySource(src);
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
          ${s.kind === "Deck" ? `<button class="btn" data-a="study:${src.split(":")[1]}">${ic("gallery-vertical-end", 14)}Study deck</button>` : ""}
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
      // six-month timeline starting September: one row per project folder milestone
      const t0 = new Date(2026, 8, 1), t1 = new Date(2027, 2, 1), pct = d => Math.max(0, Math.min(100, (d - t0) / (t1 - t0) * 100));
      const months = [8, 9, 10, 11, 0, 1].map(m => `<span>${MONTHS[m]}</span>`).join("");
      const rows = projects().flatMap(f => (f.project.milestones || []).map(m => {
        const a = pct(parseRange(m.start)), b = pct(parseRange(m.end));
        return `<div class="tl-row" data-a="openfolder:${f.id}" data-drop="${f.id}"><span class="tl-name">${f.emoji ? f.emoji + "&nbsp; " : ""}${esc(f.name)}</span><span class="tl-track"><span class="tl-bar" style="left:${a}%;width:${b - a}%"><span class="tl-fill" style="width:${projProgress(f)}%"></span><span class="tl-lbl">${esc(m.name)} · ${m.end}</span></span><span class="tl-today" style="left:${pct(TODAY)}%"></span></span></div>`;
      })).join("");
      return header("Timelines", { lead: ic("chart-gantt", 16, "var(--text-secondary)"), actions: `<button class="btn sm primary" data-a="newproject">${ic("plus", 13)}New project</button>` }) +
        (rows ? `<div class="scroll"><div class="tl"><div class="tl-row tl-head"><span class="tl-name label-mono">Project</span><span class="tl-track tl-months">${months}</span></div>${rows}</div></div>`
          : emptyState("chart-gantt", "No project folders yet", "Turn on “Project” in a folder's settings to see it on the timeline.", `<button class="btn primary" data-a="newproject">New project</button>`));
    }
    if (page === "horizons") {
      const conf = { on: ["circle-check", "var(--success)", "On track"], risk: ["circle-alert", "var(--warning)", "At risk"], idea: ["circle-dashed", "var(--text-tertiary)", "Idea"] };
      const col = h => {
        const items = D.horizons.filter(x => x.h === h.id);
        return `<div class="hz-col"><div class="hz-head"><span class="label-mono">${h.label}</span><span class="mono" style="color:var(--text-tertiary)">${items.length}</span></div><div class="hz-sub">${h.sub}</div>
          ${items.map(x => { const c = conf[x.conf] || conf.idea; return `<div class="hz-card" data-a="imenu:goal|${x.id}" data-drag="goal:${x.id}" draggable="true"><div class="hz-t">${esc(x.title)}</div><div class="hz-meta">${folderChip("goal", x)}<span class="chip">${ic(c[0], 13, c[1])}${c[2]}</span></div></div>`; }).join("")}
          <button class="hz-add" data-a="toast:Goals get their own editor in a later phase">${ic("plus", 14)}Add goal</button></div>`;
      };
      return header("Horizons", { lead: ic("telescope", 16, "var(--text-secondary)") }) +
        `<div class="scroll"><div class="hz">${[{ id: "now", label: "Now", sub: "This quarter" }, { id: "next", label: "Next", sub: "Next quarter" }, { id: "later", label: "Later", sub: "6–12 months" }].map(col).join("")}</div></div>`;
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
    if (page === "calendar") {
      // October 2026, weeks start on Monday; dated ToDos show on their day
      const offset = (new Date(2026, 9, 1).getDay() + 6) % 7, cells = [];
      for (let n = 0; n < 35; n++) {
        const d = new Date(2026, 9, n - offset + 1), key = String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()];
        const due = D.todos.filter(t => t.due === key).map(t => `<span class="cal-it" data-a="go:pin/todos" data-drag="todo:${t.id}" style="border-left-color:${t.done ? "var(--success)" : dayDiff(t.due) < 0 ? "var(--danger)" : "var(--text-tertiary)"}${t.done ? ";color:var(--text-tertiary)" : ""}">${esc(t.text)}</span>`).join("");
        cells.push(`<div class="cal-cell${d.getMonth() === 9 ? "" : " out"}${+d === +TODAY ? " today" : ""}"><span class="cal-d">${d.getDate()}</span>${due}</div>`);
      }
      return header("Calendar", { lead: ic("calendar", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">October 2026</span>` }) +
        `<div class="scroll"><div class="cal">${WEEKDAYS.map(w => `<div class="cal-w label-mono">${w}</div>`).join("")}${cells.join("")}</div></div>`;
    }
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
    const row = t => { const pr = prio(t.prio); return `<div class="todo${t.done ? " done" : ""}" data-drag="todo:${t.id}" draggable="true"><button class="todo-ck" data-a="todo:${t.id}" role="checkbox" aria-checked="${!!t.done}" title="${t.done ? "Mark as open" : "Mark as done"}">${t.done ? ic("check", 12) : ""}</button><span class="todo-t">${esc(t.text)}</span>${pr.id ? `<span title="${pr.name}">${ic(pr.icon, 13, pr.color)}</span>` : ""}${folderChip("todo", t)}${t.due ? `<span class="mono" style="color:${!t.done && dayDiff(t.due) < 0 ? "var(--danger)" : "var(--text-tertiary)"}">${t.due}</span>` : ""}<button class="ib sm todo-x" data-a="imenu:todo|${t.id}" title="More">${ic("ellipsis", 13)}</button></div>`; };
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
    const log = document.getElementById("chatlog"); if (log) log.scrollTop = log.scrollHeight;
    const selSticky = root.querySelector(".sticky-card.sel"); if (selSticky && !sameRoute) selSticky.scrollIntoView({ block: "nearest" });
    const alog = document.getElementById("asstlog"); if (alog) alog.scrollTop = alog.scrollHeight;
    store.set("route", S.route); store.set("theme", S.theme); store.set("prod", S.curProd); store.set("openFolders", [...S.openFolders]);
    save();
  }
  function go(route) {
    if (!route) return;
    const p = route.split("/")[0];
    if (p !== "pin" && p !== "folder") { S.curProd = p; S.lastRoute[p] = route; }
    if (p === "folder") { revealFolder(route.split("/")[1]); if (route !== S.route) S.ftab = "plan"; }
    // leaving Notes / Canvas collapses their sidebar branch (caret or a click on the row reopens it)
    const branches = { "x-notes": "work/notes", "x-canvas": "work/canvas", "x-practice": "wiki/practice", "x-tutor": "wiki/tutor" };
    let closed = false;
    for (const id in branches) if (S.openFolders.has(id) && !(route + "/").startsWith(branches[id] + "/")) { S.openFolders.delete(id); closed = true; }
    if (closed) store.set("openFolders", [...S.openFolders]);
    S.route = route; closeMenu(); render();
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
    closeLayer(); closeMenu();
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
      <span class="chip${pr.id ? "" : " is-empty"}" data-a="d-prio">${ic(pr.icon, 13, pr.color)}${pr.id ? pr.name : "Priority"}</span>
      <span class="chip${f ? "" : " is-empty"}" data-a="d-folder">${f ? folderIcon(f, 13) : ic("folder-plus", 13)}${f ? esc(f.name) : "No folder"}</span>`;
  }
  function refreshDraftChips() {
    const c = layer && layer.querySelector("#dchips"); if (c) c.innerHTML = draftChips();
    const pc = layer && layer.querySelector("#dcrumb"); if (pc) pc.innerHTML = draftCrumb();
  }
  const draftCrumb = () => { const f = folder(S.draft.folder); return f ? folderIcon(f, 13) + esc(f.name) : ic("list-checks", 13) + "ToDos"; };
  function openTodoDialog(preset = {}) {
    S.draft = Object.assign({ due: null, prio: 0, folder: null, more: false }, preset);
    openLayer(`<div class="dialog" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb" id="dcrumb">${draftCrumb()}</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">New ToDo</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db"><input class="big" id="dtitle" placeholder="What needs to be done?" autocomplete="off">
        <div id="dchips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${draftChips()}</div></div>
      <div class="df"><span style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font:var(--type-small)"><button class="switch" data-a="d-more" role="switch"></button>Create more</span><span style="flex:1"></span>
        <button class="btn primary" data-a="create">Create ToDo ${kbd([MOD, "⏎"])}</button></div></div>`,
      l => l.querySelector("#dtitle").focus());
  }
  function submitCreate() {
    const d = S.draft, input = layer.querySelector("#dtitle"), text = input.value.trim();
    if (!text) { input.focus(); return; }
    D.todos.unshift({ id: uid("t"), text, due: d.due, prio: d.prio, folder: d.folder });
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
    TYPES[e.type].list().unshift(e.item);
    toast(TYPES[e.type].name(e.item) + " restored");
  }
  // the same "…" / right-click menu for every element
  function itemMenu(el, t, id) {
    const x = find(t, id); if (!x) return;
    const T = TYPES[t];
    openMenu(el, [
      { icon: T.icon(x), label: "Open", run: () => openItem(t, id) },
      { icon: "folder-input", label: "Move to folder…", run: () => folderPicker(el, x.folder || null, fid => moveItem(t, id, fid)) },
      { icon: "star", color: x.starred ? "var(--warning)" : "", label: x.starred ? "Unstar" : "Star", run: () => { x.starred = !x.starred; render(); } },
      ...(t === "todo" ? [{ icon: x.done ? "circle" : "circle-check", label: x.done ? "Mark as open" : "Mark as done", run: () => { x.done = !x.done; render(); } }] : []),
      "-",
      { icon: "trash-2", color: "var(--danger)", label: "Move to trash", run: () => { const here = S.route === T.route(x) && T.fam === "content"; trashItem(t, id); here ? go(t === "note" ? "work/notes" : t === "canvas" ? "work/canvas" : t === "chat" ? "ai/new" : t === "file" ? "files/trash" : S.lastRoute[S.curProd]) : render(); } },
    ]);
  }
  function openItem(t, id) {
    if (t === "deck") return A.study(id);
    const x = find(t, id); if (x) go(TYPES[t].route(x));
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
    if (t === "project") return openFolderSettings(null, { parent: fid, project: true, icon: "folder-kanban" });
    if (t === "folder") return openFolderSettings(null, { parent: fid });
    if (fid) revealFolder(fid);
    if (t === "note") { const id = uid("n"); D.notes.unshift({ id, title: "", body: "", labels: [], updated: "now", folder: fid }); S.openFolders.add("x-notes"); go("work/notes/" + id); setTimeout(() => { const h = document.querySelector(`[data-edit="note-title:${id}"]`); h && h.focus(); }); }
    else if (t === "canvas") { const id = uid("b"); D.canvases.push({ id, name: "Untitled canvas", items: [], updated: "now", folder: fid }); S.openFolders.add("x-canvas"); go("work/canvas/" + id); }
    else if (t === "sticky") { const id = uid("s"); D.stickies.unshift({ id, text: "", color: "amber", updated: "now", folder: fid }); go("work/stickies/" + id); setTimeout(() => { const el = document.querySelector(`[data-edit="sticky:${id}"]`); el && el.focus(); }); }
    else if (t === "page") { const id = uid("pg"); D.pages.push({ id, icon: "file-text", title: "Untitled", body: [""], folder: fid }); go("wiki/" + id); setTimeout(() => { const h = document.querySelector("[data-edit^='page-title']"); if (h) { h.focus(); document.execCommand && document.execCommand("selectAll"); } }); }
  }
  const QC = { plan: [["todo", "circle", "ToDo", ["C"]], ["project", "folder-kanban", "Project folder"]], content: [["note", "file-text", "Note"], ["canvas", "layout-dashboard", "Canvas"], ["sticky", "sticky-note", "Sticky"], ["page", "book-open", "Learn page"]] };
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
    const rows = [["Search / command menu", [MOD, "S"]], ["Create something", ["C"]], ["Toggle sidebar", ["["]], ["Plan / Work / Learn / Files / AI", ["1", "–", "5"]], ["Settings", [","]], ["Close dialog or menu", ["Esc"]], ["Create from dialog", [MOD, "⏎"]], ["AI assistant", ["A"]], ["Element actions", ["Right-click"]], ["Move into a folder", ["Drag"]]];
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
    qc: (v, el) => quickCreate(el, v || ctxFolder()),
    qcfam: (v, el) => { const [fam, fid] = v.split("|"); quickCreate(el, fid, [fam]); },
    close: () => closeLayer(),
    create: () => submitCreate(),
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
    "ibx-jump": (v) => { const el = document.getElementById(v); el && el.scrollIntoView({ behavior: "smooth", block: "start" }); },
    readall: () => { D.inbox.forEach(m => m.unread = false); render(); toast("All notifications marked read"); },
    pref: (k) => { S.prefs[k] = !S.prefs[k]; render(); },
    savews: () => { const v = document.getElementById("wsname").value.trim(); if (v) { D.workspace.name = v; D.workspace.initial = v[0].toUpperCase(); } render(); toast("Workspace saved"); },
    ask: (v) => ask(v),
    send: () => { const p = document.getElementById("prompt"); ask(p.value); },
    wsmenu: (v, el) => openMenu(el, [{ lead: `<span class="ws-logo" style="width:16px;height:16px;font-size:9px;border-radius:4px">${D.workspace.initial}</span>`, label: D.workspace.name, check: true }, "-", { icon: "settings", label: "Workspace settings", run: () => go("settings/general") }, { icon: "users", label: "Invite members", run: () => go("settings/members") }, "-", { icon: "panel-left", label: "Collapse sidebar", kbd: ["["], run: () => A.collapse() }]),
    usermenu: (v, el) => openMenu(el, [{ icon: "user-round", label: "Profile", run: () => go("settings/profile") }, { icon: "palette", label: "Preferences", run: () => go("settings/preferences") }, { icon: "keyboard", label: "Keyboard shortcuts", run: openShortcuts }, "-", { icon: "log-out", label: "Sign out", run: () => toast("Signed out (prototype)") }]),
    "d-prio": (v, el) => openMenu(el, D.priorities.map(p => ({ icon: p.icon, color: p.color, label: p.name, check: S.draft.prio === p.id, run: () => { S.draft.prio = p.id; refreshDraftChips(); } }))),
    "d-due": (v, el) => openMenu(el, [["Today", 0], ["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, n]) => ({ icon: "calendar", label: l + "  ·  " + plusDays(n), check: S.draft.due === plusDays(n), run: () => { S.draft.due = plusDays(n); refreshDraftChips(); } })).concat(["-", { icon: "calendar-x", label: "No date", check: !S.draft.due, run: () => { S.draft.due = null; refreshDraftChips(); } }])),
    "d-folder": (v, el) => folderPicker(el, S.draft.folder, fid => { S.draft.folder = fid; refreshDraftChips(); }),
    "d-more": (v, el) => { S.draft.more = !S.draft.more; el.classList.toggle("on", S.draft.more); },
  };

  document.addEventListener("click", e => {
    const mi = e.target.closest("[data-mi]");
    if (mi) { const it = menuItems[+mi.dataset.mi]; closeMenu(); it && it.run && it.run(); return; }
    if (menuEl && !e.target.closest(".menu")) { const wasOpen = menuEl; closeMenu(); if (wasOpen && !e.target.closest("[data-a]")) return; }
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
    if (e.key === "Escape") { if (menuEl) closeMenu(); else if (layer) closeLayer(); else if (typing) e.target.blur(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && layer && S.draft && layer.querySelector("#dtitle")) { submitCreate(); return; }
    if (e.target.id === "fd-name" && e.key === "Enter") { e.preventDefault(); saveFolderDialog(); return; }
    if (e.target.id === "prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(e.target.value); return; }
    if (e.target.id === "tutor-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tutorAsk(e.target.value); return; }
    if (e.target.id === "asst-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askPanel(e.target.value); return; }
    if (e.target.id === "dtitle" && e.key === "Enter") { e.preventDefault(); submitCreate(); return; }
    if (e.target.id === "todo-new" && e.key === "Enter" && e.target.value.trim()) {
      D.todos.unshift({ id: uid("t"), text: e.target.value.trim(), prio: 0, folder: null }); render();
      const inp = document.getElementById("todo-new"); inp && inp.focus(); return;
    }
    if (typing || layer || e.metaKey || e.ctrlKey || e.altKey) return;
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
