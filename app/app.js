// Chameleon workspace — double navigation shell (product rail + contextual sidebar)
(function () {
  const D = window.DATA;
  const TODAY = new Date(2026, 9, 13); // prototype "today" so due-date groups stay meaningful
  const root = document.getElementById("root");

  /* ---------- persistence (per-viewer convenience only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cham-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cham-" + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- state ---------- */
  const S = {
    route: store.get("route", "work/home"),
    theme: store.get("theme", "dark"),
    collapsed: innerWidth < 900, // on narrow screens the sidebar overlays content, so start closed
    closedSecs: new Set(store.get("closedSecs", [])),
    openFolders: new Set(store.get("openFolders", [])),
    curProd: store.get("prod", "work"), // product whose sidebar is shown (pinned "pin/…" routes keep it)
    closedGroups: new Set(),
    tab: "items",
    groupBy: "status",
    filterMine: false,
    selInbox: null,
    lastRoute: { plan: "plan/timelines", work: "work/notes", wiki: "wiki/flashcards", files: "files/folders", ai: "ai/new", settings: "settings/general" },
    draft: null,
    prefs: { notifications: true, digest: false, autoAssign: true, publicLinks: false },
    chatSeq: 3,
    study: { deck: null, i: 0, flipped: false, good: 0 }, // flashcard session
    practice: null, // current practice round
    dump: { deck: "d1", text: "", result: null }, // brain dump session
    summary: "page:design", // source shown on the tutor summary page
    notesLabel: null, // label filter on the notes overview
    timer: { running: false, start: 0, issue: "CHA-128" },
    asst: { open: false, chatId: null, draft: "", model: "Claude Sonnet 5.5", mode: "build" },
  };

  if (S.route.split("/")[0] !== "pin") S.curProd = S.route.split("/")[0];

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, size = 16, color) => `<i class="icon-${n}" aria-hidden="true" style="font-size:${size}px;width:${size}px;height:${size}px${color ? ";color:" + color : ""}"></i>`;
  const initials = n => n.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const av = (n, s = 20) => `<span class="av" title="${esc(n)}" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .45)}px;background:${D.people[n] || "var(--gray-6)"}">${initials(n)}</span>`;
  const status = id => D.statuses.find(s => s.id === id);
  const prio = id => D.priorities.find(p => p.id === id);
  const project = id => D.projects.find(p => p.id === id);
  const issue = id => D.issues.find(i => i.id === id);
  const parseDue = d => { if (!d) return null; const [day, mon] = d.split(" "); const m = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ").indexOf(mon); return new Date(2026, m, +day); };
  const dayDiff = d => Math.round((parseDue(d) - TODAY) / 864e5);
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"; // shortcut modifier label
  const kbd = keys => keys.map(k => `<span class="kbd">${k}</span>`).join("");
  const nav = (route, icon, label, extra = {}) => {
    const active = S.route === route || (extra.match && S.route.startsWith(extra.match));
    const lead = extra.emoji ? `<span class="emoji">${extra.emoji}</span>` : ic(icon);
    const on = extra.active != null ? extra.active : active;
    return `<button class="nav${on ? " active" : ""}${extra.sub ? " sub" : ""}" data-a="${extra.action || "go:" + route}">${lead}<span class="lbl">${esc(label)}</span>${extra.count ? `<span class="count">${extra.count}</span>` : ""}</button>`;
  };
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
  function sidebarWork() {
    return sbHead("newissue", "New work item  C") +
      `<div class="sb-group">
        ${expandRow("x-notes", "notebook-pen", "Notes", D.notes.map(n => nav("work/notes/" + n.id, "file-text", n.title || "Untitled", { sub: true })).join(""), "note-add", "New note", "work/notes")}
        ${expandRow("x-canvas", "shapes", "Canvas", D.canvases.map(b => nav("work/canvas/" + b.id, "layout-dashboard", b.name, { sub: true })).join(""), "canvas-add", "New canvas", "work/canvas")}
        ${nav("work/stickies", "sticky-note", "Stickies", { match: "work/stickies" })}
      </div>
      ${section("wfold", "Folders", D.workFolders.map(f => folderTree(f, workItem)).join(""), `<span class="ib sm sec-act" data-a="newfolder:work" title="New folder">${ic("plus", 14)}</span>`)}
      ${sbFoot()}`;
  }
  function sidebarWiki() {
    return sbHead("newpage", "New page") +
      `<div class="sb-group">
        ${nav("wiki/flashcards", "gallery-vertical-end", "Flashcards", { match: "wiki/flashcards" })}
        ${expandRow("x-practice", "dumbbell", "Practice", nav("wiki/practice/test", "clipboard-check", "Test", { sub: true }) + nav("wiki/practice/braindump", "brain", "Brain dump", { sub: true }), null, null, "wiki/practice")}
        ${expandRow("x-tutor", "graduation-cap", "AI Tutor", nav("wiki/tutor/chat", "messages-square", "Conversation mode", { sub: true }) + nav("wiki/tutor/summary", "scroll-text", "Summary", { sub: true }), null, null, "wiki/tutor")}
        ${nav("wiki/progress", "trending-up", "Track & progress")}
      </div>
      ${section("lfold", "Folders", D.learnFolders.map(f => folderTree(f, learnItem)).join(""), `<span class="ib sm sec-act" data-a="newfolder:learn" title="New folder">${ic("plus", 14)}</span>`)}
      ${sbFoot()}`;
  }
  // learn folders hold wiki pages; files folders hold files (tree ids are prefixed so they never clash with other folders)
  const learnItem = it => { const p = D.pages.find(x => x.id === it.page); return p ? nav("wiki/" + p.id, p.icon, p.title, { sub: true }) : ""; };
  // ai folders hold chats
  const aiItem = it => { const c = D.chats.find(x => x.id === it.chat); return c ? nav("ai/" + c.id, "message-square", c.title, { sub: true }) : ""; };
  const fileItem = f => nav("files/file/" + D.files.indexOf(f), f.icon, f.name, { sub: true });
  const liveFiles = () => D.files.filter(f => !f.trashed);
  const kbTree = k => ({ id: k.id, name: k.name, items: liveFiles().filter(f => k.files.includes(f.name)) });
  const fileFolder = f => ({ id: "fo-" + f.id, name: f.name, items: liveFiles().filter(x => x.folder === f.id) });
  // what a plan folder can hold, and where each kind opens
  const PLAN_KINDS = { timeline: ["chart-gantt", "plan/timelines"], horizon: ["telescope", "plan/horizons"], report: ["chart-column", "plan/analytics"] };
  // expandable folder row (like the project tree in Work): click only shows/hides its items; an item opens itself
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
  const planItem = (it, n, f) => nav(`plan/item/${f.id}/${n}`, PLAN_KINDS[it.kind][0], it.name, { sub: true });
  // work folders hold projects; an item opens its project
  const itemFolder = (kind, id) => D.workFolders.find(f => f.items.some(i => i[kind] === id));
  const noteFolder = n => itemFolder("note", n.id);
  const stickyLabel = s => (s.text.split("\n")[0] || "Empty sticky").slice(0, 32);
  // folder picker menu: moves an item between work folders (or out of all of them)
  function folderMenu(el, kind, id, onMove) {
    const cur = itemFolder(kind, id);
    const move = f => { if (cur) cur.items = cur.items.filter(i => i[kind] !== id); if (f) { f.items.push({ [kind]: id }); S.openFolders.add(f.id); } onMove && onMove(); render(); };
    openMenu(el, D.workFolders.map(f => ({ icon: "folder", label: f.name, check: cur === f, run: () => move(f) })).concat(["-", { icon: "folder-x", label: "No folder", check: !cur, run: () => move(null) }]));
  }
  const workItem = it => {
    if (it.sticky) { const s = D.stickies.find(x => x.id === it.sticky); return s ? nav("work/stickies/" + s.id, "sticky-note", stickyLabel(s), { sub: true }) : ""; }
    if (it.note) { const n = D.notes.find(x => x.id === it.note); return n ? nav("work/notes/" + n.id, "file-text", n.title || "Untitled", { sub: true }) : ""; }
    const p = project(it.project); return p ? nav("work/project/" + p.id, null, p.name, { sub: true, emoji: p.emoji, match: "work/project/" + p.id }) : ""; };
  function sidebarPlan() {
    return sbHead("newproject", "New project") +
      `<div class="sb-group">
        ${nav("plan/timelines", "chart-gantt", "Timelines")}
        ${nav("plan/horizons", "telescope", "Horizons")}
        ${nav("plan/time", "timer", "Time tracking")}
        ${nav("plan/analytics", "chart-column", "Analytics")}
      </div>
      ${section("pfold", "Folders", D.planFolders.map(f => folderTree(f, planItem)).join(""), `<span class="ib sm sec-act" data-a="newfolder:plan" title="New folder">${ic("plus", 14)}</span>`)}
      ${sbFoot()}`;
  }
  function sidebarFiles() {
    return sbHead("upload", "Upload file") +
      `<div class="sb-group">
        ${nav("files/folders", "folders", "All folders")}
        ${nav("files/recent", "clock", "Recent")}
        ${nav("files/starred", "star", "Starred")}
        ${nav("files/trash", "trash-2", "Trash", { count: D.files.filter(f => f.trashed).length || "" })}
      </div>
      ${section("folders", "Folders", D.folders.map(f => folderTree(fileFolder(f), fileItem)).join(""), `<span class="ib sm sec-act" data-a="newfolder:files" title="New folder">${ic("plus", 14)}</span>`, "files/folders")}
      ${section("kbase", "Knowledge base", D.knowledge.map(k => folderTree(kbTree(k), fileItem, ["book-marked", "library-big"])).join(""), `<span class="ib sm sec-act" data-a="newfolder:kb" title="New collection">${ic("plus", 14)}</span>`, "files/kb")}
      ${sbFoot()}`;
  }
  function sidebarAI() {
    return sbHead("go:ai/new", "New chat") +
      `<div class="sb-group">${nav("ai/new", "message-square-plus", "New chat")}</div>
      ${section("chats", "Recent chats", D.chats.map(c => nav("ai/" + c.id, "message-square", c.title)).join(""))}
      ${section("afold", "Folders", D.aiFolders.map(f => folderTree(f, aiItem)).join(""), `<span class="ib sm sec-act" data-a="newfolder:ai" title="New folder">${ic("plus", 14)}</span>`)}
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
  function issueRow(i) {
    const st = status(i.status), pr = prio(i.prio), dd = i.due ? dayDiff(i.due) : null;
    const dueColor = i.status !== "done" && dd != null && dd < 0 ? "var(--danger)" : "";
    return `<div class="row${i.parent ? " sub" : ""}" data-a="go:work/issue/${i.id}">
      <button class="prio" data-a="prio:${i.id}" title="${pr.name}" style="border-color:transparent">${ic(pr.icon, 14, pr.color)}</button>
      <span class="id">${i.id}</span>
      <button class="status-btn" data-a="status:${i.id}" title="${st.name}">${ic(st.icon, 14, st.color)}</button>
      <span class="t" style="${i.status === "done" ? "color:var(--text-tertiary)" : ""}">${esc(i.title)}</span>
      <span class="tr">
        <span class="chip" data-a="label:${i.id}"><span class="dot" style="background:${D.labels[i.label]}"></span>${esc(i.label)}</span>
        ${i.due ? `<span class="chip date" style="${dueColor ? "color:" + dueColor : ""}">${ic("calendar", 13)}${i.due}</span>` : ""}
        ${av(i.who, 20)}
      </span>
    </div>`;
  }
  function issueList(items) {
    if (!items.length) return emptyState("circle-check", "Nothing here", "No work items match this view.");
    const groups = S.groupBy === "priority"
      ? D.priorities.slice(1).concat(D.priorities[0]).map(p => ({ key: "p" + p.id, name: p.name, icon: p.icon, color: p.color, items: items.filter(i => i.prio === p.id) }))
      : D.statuses.map(s => ({ key: s.id, name: s.name, icon: s.icon, color: s.color, items: items.filter(i => i.status === s.id) }));
    return groups.filter(g => g.items.length).map(g => {
      const closed = S.closedGroups.has(g.key);
      return `<div class="grp${closed ? " closed" : ""}" data-a="grp:${g.key}">${ic("chevron-down", 13).replace('<i class="', '<i class="chev ')}${ic(g.icon, 14, g.color)}${g.name}<span class="n">${g.items.length}</span><span style="flex:1"></span><button class="ib sm" data-a="newissue:${g.key}" title="Add">${ic("plus", 14)}</button></div>` +
        (closed ? "" : g.items.map(issueRow).join(""));
    }).join("");
  }
  function listToolbar(title, items) {
    return `<div class="toolbar">${ic("copy", 14, "var(--text-secondary)")}<span style="font:var(--type-ui);font-weight:600">${title}</span><span class="mono" style="color:var(--accent-text)">${items.length}</span><span style="flex:1"></span>
      <button class="btn sm${S.filterMine ? "" : " ghost"}" data-a="filter">${ic("list-filter", 13)}${S.filterMine ? "Assigned to me" : "Filter"}</button>
      <button class="btn sm ghost" data-a="display">${ic("sliders-horizontal", 13)}Display</button>
      <button class="btn sm primary" data-a="newissue">${ic("plus", 13)}Add work item</button></div>`;
  }

  /* ---------- views ---------- */
  function viewHome() {
    const open = D.issues.filter(i => i.status !== "done");
    const mine = open.filter(i => i.who === D.me && i.due);
    const over = mine.filter(i => dayDiff(i.due) < 0), today = mine.filter(i => dayDiff(i.due) === 0), week = mine.filter(i => dayDiff(i.due) > 0 && dayDiff(i.due) <= 7);
    const h = new Date().getHours(), greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const card = (lbl, list, red) => `<div class="card"><div class="label-mono${red ? " red" : ""}">${lbl}</div>${list.length ? list.map(i => `<div class="it" data-a="go:work/issue/${i.id}">${ic(status(i.status).icon, 14, status(i.status).color)}<span class="mono" style="color:var(--text-tertiary)">${i.id}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.title)}</span></div>`).join("") : '<div class="none">Nothing here</div>'}</div>`;
    const stat = (v, k, icon) => `<div class="stat"><div style="display:flex;justify-content:space-between;align-items:center"><span class="v">${v}</span>${ic(icon, 16, "var(--text-tertiary)")}</div><div class="k">${k}</div></div>`;
    return header("Home", { lead: ic("house", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="home">
      <h1>${greet}, ${esc(D.me.split(" ")[0])}</h1><p class="sub">Here is what needs your attention in ${esc(D.workspace.name)}.</p>
      <div class="stats">${stat(open.length, "Open work items", "circle")}${stat(D.issues.filter(i => i.status === "progress").length, "In progress", "circle-dot")}${stat(unreadCount(), "Unread notifications", "inbox")}${stat(D.issues.filter(i => i.status === "done").length, "Done this cycle", "circle-check")}</div>
      <div class="due-head"><h2>Due</h2><span class="label-mono">${over.length + today.length + week.length} open</span></div>
      <div class="cols">${card("Overdue", over, true)}${card("Today", today)}${card("This week", week)}</div>
      <div class="due-head"><h2>Projects</h2></div>
      <div class="box">${D.projects.map(p => `<div class="prow" data-a="go:work/project/${p.id}" style="grid-template-columns:1fr 160px 60px"><span>${p.emoji}&nbsp; ${esc(p.name)}</span><span class="bar"><span style="width:${p.progress}%"></span></span><span class="mono" style="color:var(--text-tertiary);text-align:right">${p.progress}%</span></div>`).join("")}</div>
    </div></div>`;
  }
  function viewInbox() {
    const sel = D.inbox.find(m => m.id === S.selInbox);
    const list = D.inbox.map(m => {
      const iss = m.issue && issue(m.issue);
      return `<div class="msg${m.unread ? " unread" : ""}${S.selInbox === m.id ? " sel" : ""}" data-a="inbox:${m.id}">${av(m.who, 28)}<div class="b"><div class="h"><span class="tt">${iss ? `<span class="mono" style="color:var(--text-tertiary)">${iss.id}</span> ${esc(iss.title)}` : esc(m.title)}</span>${m.unread ? '<span class="unread-dot"></span>' : ""}<span class="time">${m.time}</span></div><div class="s">${esc(m.body)}</div></div></div>`;
    }).join("");
    let detail = emptyState("inbox", "No notification selected", "Pick a notification on the left to see what changed.");
    if (sel) {
      const iss = sel.issue && issue(sel.issue);
      detail = `<div class="doc"><div class="label-mono" style="margin-bottom:10px">${sel.time} ago · ${esc(sel.who)}</div><h1 style="font:var(--type-title)">${iss ? esc(iss.title) : esc(sel.title)}</h1><p>${esc(sel.body)}.</p>${iss ? `<div class="props">${chipsFor(iss)}</div><button class="btn" data-a="go:work/issue/${iss.id}">Open ${iss.id}${ic("arrow-right", 14)}</button>` : `<p>Press <span class="kbd">C</span> to create a work item, ${kbd([MOD, "S"])} to search, and <span class="kbd">[</span> to collapse the sidebar.</p>`}</div>`;
    }
    return header("Inbox", { lead: ic("inbox", 16, "var(--text-secondary)"), actions: `<button class="btn sm ghost" data-a="readall">${ic("check-check", 13)}Mark all read</button>` }) +
      `<div class="split"><div class="list-pane"><div class="scroll">${list}</div></div><div class="detail">${detail}</div></div>`;
  }
  function chipsFor(i) {
    const st = status(i.status), pr = prio(i.prio), p = project(i.project);
    return `<span class="chip" data-a="status:${i.id}">${ic(st.icon, 13, st.color)}${st.name}</span>
      <span class="chip" data-a="prio:${i.id}">${ic(pr.icon, 13, pr.color)}${pr.name}</span>
      <span class="chip" data-a="assignee:${i.id}">${av(i.who, 14)}${esc(i.who)}</span>
      <span class="chip" data-a="label:${i.id}"><span class="dot" style="background:${D.labels[i.label]}"></span>${esc(i.label)}</span>
      <span class="chip${i.due ? "" : " is-empty"}">${ic("calendar", 13)}${i.due || "Due date"}</span>
      <span class="chip" data-a="go:work/project/${p.id}">${p.emoji} ${esc(p.name)}</span>`;
  }
  function viewIssue(id) {
    const i = issue(id);
    if (!i) return header("Not found") + emptyState("circle-help", "Work item not found", "It may have been deleted.");
    const p = project(i.project), subs = D.issues.filter(x => x.parent === i.id);
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:work/project/${p.id}">${p.emoji} ${esc(p.name)}</span> <span class="crumb-sep">›</span> ${i.id}`, {
      actions: `<button class="ib" data-a="toast:Link copied" title="Copy link">${ic("link")}</button><button class="ib" data-a="issuemenu:${i.id}" title="More">${ic("ellipsis")}</button>` }) +
      `<div class="scroll"><div class="doc">
        <h1 class="editable" contenteditable="true" data-edit="issue-title:${i.id}" data-ph="Issue title">${esc(i.title)}</h1>
        <div class="props">${chipsFor(i)}</div>
        <p class="editable" contenteditable="true" data-edit="issue-desc:${i.id}" data-ph="Add a description…">${esc(i.desc || "")}</p>
        ${subs.length ? `<h2>Sub-items</h2><div class="box">${subs.map(issueRow).join("")}</div>` : ""}
        <div class="activity"><div class="label-mono" style="margin-bottom:6px">Activity</div>
          <div class="act-row">${av(i.who, 16)}<b>${esc(i.who)}</b> created the work item · 3d</div>
          <div class="act-row">${ic(status(i.status).icon, 14, status(i.status).color)}<b>${esc(D.me)}</b> set status to ${status(i.status).name} · 1d</div>
        </div></div></div>`;
  }
  function viewProject(id) {
    const p = project(id);
    if (!p) return header("Not found");
    const tabs = [["overview", "Overview"], ["items", "Work items"], ["cycles", "Cycles"], ["modules", "Modules"]].map(([k, l]) => `<button class="tab${S.tab === k ? " active" : ""}" data-a="tab:${k}">${l}</button>`).join("");
    let items = D.issues.filter(i => i.project === id);
    if (S.filterMine) items = items.filter(i => i.who === D.me);
    let body;
    if (S.tab === "items") body = listToolbar("Work items", items) + `<div class="scroll">${issueList(items)}</div>`;
    else if (S.tab === "overview") {
      const all = D.issues.filter(i => i.project === id);
      body = `<div class="scroll"><div class="doc"><div style="font-size:32px">${p.emoji}</div><h1>${esc(p.name)}</h1><p>One clear outcome, tracked through work items, cycles and modules.</p>
        <div class="props"><span class="chip">${av(p.lead, 14)}${esc(p.lead)}</span><span class="chip">${ic("target", 13)}Target ${p.target}</span><span class="chip">${ic("hash", 13)}${p.key}</span></div>
        <h2>Progress</h2><div style="display:flex;align-items:center;gap:12px"><div class="bar" style="flex:1"><span style="width:${p.progress}%"></span></div><span class="mono">${p.progress}%</span></div>
        <h2>Breakdown</h2><div class="box">${D.statuses.map(s => `<div class="box-row">${ic(s.icon, 14, s.color)}<span class="l">${s.name}</span><span class="mono">${all.filter(i => i.status === s.id).length}</span></div>`).join("")}</div></div></div>`;
    } else body = emptyState(S.tab === "cycles" ? "refresh-cw" : "boxes", S.tab === "cycles" ? "No cycles yet" : "No modules yet",
      S.tab === "cycles" ? "Cycles are time-boxed periods of work. Plan two weeks at a time and let unfinished items roll over." : "Modules group related work items into smaller deliverables inside a project.",
      `<button class="btn primary" data-a="toast:${S.tab === "cycles" ? "Cycle" : "Module"} created">Create ${S.tab === "cycles" ? "cycle" : "module"}</button>`);
    return header(esc(p.name), { lead: `<span style="font-size:16px">${p.emoji}</span>`, mid: `<div class="tabs">${tabs}</div>`, actions: `<button class="ib" data-a="toast:Link copied" title="Copy link">${ic("link")}</button>` }) + body;
  }
  function viewMine() {
    const items = D.issues.filter(i => i.who === D.me);
    return header("My issues", { lead: ic("scan-eye", 16, "var(--text-secondary)") }) + listToolbar("Assigned to you", items) + `<div class="scroll">${issueList(items)}</div>`;
  }
  function viewProjects() {
    return header("Projects", { lead: ic("box", 16, "var(--text-secondary)"), count: D.projects.length, actions: `<button class="btn sm primary" data-a="newproject">${ic("plus", 13)}New project</button>` }) +
      `<div class="scroll"><div class="prow head"><span>Name</span><span>Lead</span><span>Progress</span><span>Target</span></div>${D.projects.map(p => `<div class="prow" data-a="go:work/project/${p.id}"><span>${p.emoji}&nbsp; ${esc(p.name)}</span><span style="display:flex;gap:6px;align-items:center;color:var(--text-secondary)">${av(p.lead, 18)}${esc(p.lead)}</span><span class="bar"><span style="width:${p.progress}%"></span></span><span class="mono" style="color:var(--text-tertiary)">${p.target}</span></div>`).join("")}</div>`;
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
      const rows = list.map(n => `<div class="coll-row" data-a="go:work/notes/${n.id}">
          <span class="coll-name">${ic("file-text", 16, "var(--text-secondary)")}<span>${esc(n.title || "Untitled")}</span></span>
          <span>${(f => `<span class="chip${f ? "" : " is-empty"}" data-a="note-folder:${n.id}">${ic(f ? "folder" : "folder-plus", 13)}${f ? esc(f.name) : "No folder"}</span>`)(noteFolder(n))}</span>
          <span class="mono">${words(n)}</span>
          <span><span class="chip${(n.labels || []).length ? "" : " is-empty"}" data-a="note-labels:${n.id}">${labels(n)}</span></span>
          <span style="color:var(--text-secondary)">${ago(n.updated)}</span>
          <button class="ib sm" data-a="note-menu:${n.id}" title="More">${ic("ellipsis", 14)}</button></div>`).join("");
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
      actions: `<button class="ib" data-a="note-del:${note.id}" title="Delete note">${ic("trash-2")}</button>${newBtn}` }) +
      `<div class="scroll"><div class="doc"><h1 class="editable" contenteditable="true" data-edit="note-title:${note.id}" data-ph="Untitled">${esc(note.title)}</h1><div class="label-mono" style="margin:6px 0 18px">Edited ${note.updated === "now" ? "just now" : note.updated + " ago"}</div>
        <p class="editable note-body" contenteditable="true" data-edit="note-body:${note.id}" data-ph="Start writing…">${esc(note.body)}</p></div></div>`;
  }
  // canvas boards: the board in the route, else the first one; item helpers search every board
  const curBoard = () => { const p = S.route.split("/"); return (p[1] === "canvas" && D.canvases.find(b => b.id === p[2])) || D.canvases[0]; };
  const boardOf = id => D.canvases.find(b => b.items.some(c => c.id === id));
  const cvFind = id => { const b = boardOf(id); return b && b.items.find(c => c.id === id); };
  function viewCanvasOverview() {
    const count = (b, k) => b.items.filter(c => (c.kind || "card") === k).length;
    const rows = D.canvases.map(b => `<div class="coll-row c5" data-a="go:work/canvas/${b.id}">
        <span class="coll-name">${ic("layout-dashboard", 16, "var(--text-secondary)")}<span>${esc(b.name)}</span></span>
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
    if (!board) return header("Canvas", { lead: ic("shapes", 16, "var(--text-secondary)") }) + emptyState("shapes", "No canvases yet", "A canvas is a free-form board for cards and stickies.", `<button class="btn primary" data-a="canvas-add">New canvas</button>`);
    const items = board.items.map(c => `<div class="cv-item${c.kind === "sticky" ? " sticky" : ""}" data-cv="${c.id}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px${c.kind === "sticky" ? `;background:${STICKY_COLORS[c.color || "amber"][0]};border-color:${STICKY_COLORS[c.color || "amber"][1]}` : ""}">
        <div class="cv-grip" title="Drag to move">${ic("grip-horizontal", 14)}<span class="spacer"></span><button class="ib sm" data-a="cv-del:${c.id}" title="Remove">${ic("x", 12)}</button></div>
        <div class="cv-text editable" contenteditable="true" data-edit="canvas:${c.id}" data-ph="Type something…">${esc(c.text)}</div></div>`).join("");
    return header(`<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:work/canvas">Canvas</span> <span class="crumb-sep">›</span> ${esc(board.name)}`, { lead: ic("shapes", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">Double-click to add a card · drag the handle to move</span>`,
      actions: `<button class="btn sm" data-a="cv-add:sticky">${ic("sticky-note", 13)}Sticky</button><button class="btn sm primary" data-a="cv-add:card">${ic("square-plus", 13)}Card</button>` }) +
      `<div class="scroll canvas-wrap"><div class="canvas" id="canvas">${items}</div></div>`;
  }
  function viewStickies(selId) {
    const cards = D.stickies.map(s => { const c = STICKY_COLORS[s.color], f = itemFolder("sticky", s.id); return `<div class="sticky-card${s.id === selId ? " sel" : ""}" data-sticky="${s.id}" style="background:${c[0]};border-color:${c[1]}">
        <div class="editable sticky-text" contenteditable="true" data-edit="sticky:${s.id}" data-ph="Write a sticky…">${esc(s.text)}</div>
        <div class="sticky-foot"><span class="chip sticky-folder${f ? "" : " is-empty"}" data-a="sticky-folder:${s.id}" title="Move to folder">${ic(f ? "folder" : "folder-plus", 12)}${f ? esc(f.name) : "Folder"}</span><span class="spacer"></span><span class="mono" style="color:var(--text-tertiary);margin-right:4px">${s.updated}</span><button class="ib sm" data-a="sticky-color:${s.id}" title="Colour">${ic("palette", 13)}</button><button class="ib sm" data-a="sticky-del:${s.id}" title="Delete">${ic("trash-2", 13)}</button></div></div>`; }).join("");
    return header("Stickies", { lead: ic("sticky-note", 16, "var(--text-secondary)"), count: D.stickies.length, actions: `<button class="btn sm primary" data-a="sticky-add">${ic("plus", 13)}Add sticky</button>` }) +
      (D.stickies.length ? `<div class="scroll"><div class="stickies">${cards}</div></div>` : emptyState("sticky-note", "No stickies", "Stickies are quick personal notes. Jot something down before it becomes a work item.", `<button class="btn primary" data-a="sticky-add">Add sticky</button>`));
  }
  function viewWork(parts) {
    switch (parts[1]) {
      case "notes": return viewNotes(parts[2]);
      case "canvas": return viewCanvas(parts[2]);
      case "inbox": return viewInbox();
      case "mine": return viewMine();
      case "projects": return viewProjects();
      case "project": return viewProject(parts[2]);
      case "issue": return viewIssue(parts[2]);
      case "views": return header("Views", { lead: ic("layers", 16, "var(--text-secondary)") }) + emptyState("layers", "Views", "Views are saved filters over work items. Save one from any list to share it with your team.", `<button class="btn primary" data-a="toast:View created">Create view</button>`);
      case "drafts": return header("Drafts", { lead: ic("pencil-line", 16, "var(--text-secondary)") }) + emptyState("pencil-line", "No drafts", "Work items you start but do not create are kept here.", `<button class="btn" data-a="newissue">New work item ${kbd(["C"])}</button>`);
      case "stickies": return viewStickies(parts[2]);
      default: return viewHome();
    }
  }
  /* ---------- Learn: flashcards, practice, AI tutor ---------- */
  function viewFlashcards(deckId) {
    const deck = deckId && D.decks.find(x => x.id === deckId);
    if (!deck) { // deck overview
      const rows = D.decks.map(k => `<div class="coll-row c5" data-a="study:${k.id}">
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
    return header(`<span style="color:var(--text-secondary);font-weight:500">Learn</span> <span class="crumb-sep">›</span> ${esc(p.title)}`, { actions: `<button class="ib" data-a="toast:Added to favorites" title="Favorite">${ic("star")}</button><button class="ib" data-a="toast:Link copied" title="Copy link">${ic("link")}</button>` }) +
      `<div class="scroll"><div class="doc"><div style="margin-bottom:10px">${ic(p.icon, 28, "var(--text-tertiary)")}</div>
        <h1 class="editable" contenteditable="true" data-edit="page-title:${p.id}" data-ph="Untitled">${esc(p.title)}</h1>
        <div class="label-mono" style="margin:6px 0 18px">Edited by ${esc(D.me)} · 2h</div>
        ${p.body.map((t, n) => `<p class="editable" contenteditable="true" data-edit="page-body:${p.id}:${n}" data-ph="Write something…">${esc(t)}</p>`).join("")}
      </div></div>`;
  }
  function viewAI(parts) {
    const chat = D.chats.find(c => c.id === parts[1]);
    const log = chat ? chat.log : [];
    const sug = ["Summarise this week", "What is overdue?", "Draft release notes", "Who is working on what?"];
    const inner = log.length ? log.map(m => `<div class="bubble ${m.me ? "me" : "ai"}">${m.me ? esc(m.text) : m.text}</div>`).join("")
      : `<div class="empty" style="padding-top:12vh">${ic("sparkles", 40)}<h3>Ask about your workspace</h3><p>AI reads your work items, projects and wiki pages. Answers stay inside ${esc(D.workspace.name)}.</p><div class="suggest">${sug.map(s => `<button class="chip" data-a="ask:${s}">${esc(s)}</button>`).join("")}</div></div>`;
    return header(chat ? esc(chat.title) : "New chat", { lead: ic("sparkles", 16, "var(--text-secondary)") }) +
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
      // six-month timeline starting September
      const t0 = new Date(2026, 8, 1), t1 = new Date(2027, 2, 1), pct = d => Math.max(0, Math.min(100, (d - t0) / (t1 - t0) * 100));
      const months = [8, 9, 10, 11, 0, 1].map(m => `<span>${MONTHS[m]}</span>`).join("");
      const rows = D.milestones.map(m => {
        const p = project(m.project), a = pct(parseRange(m.start)), b = pct(parseRange(m.end));
        return `<div class="tl-row" data-a="go:work/project/${p.id}"><span class="tl-name">${p.emoji}&nbsp; ${esc(p.name)}</span><span class="tl-track"><span class="tl-bar" style="left:${a}%;width:${b - a}%"><span class="tl-fill" style="width:${p.progress}%"></span><span class="tl-lbl">${esc(m.name)} · ${m.end}</span></span><span class="tl-today" style="left:${pct(TODAY)}%"></span></span></div>`;
      }).join("");
      return header("Timelines", { lead: ic("chart-gantt", 16, "var(--text-secondary)"), actions: `<button class="btn sm primary" data-a="newproject">${ic("plus", 13)}New project</button>` }) +
        `<div class="scroll"><div class="tl"><div class="tl-row tl-head"><span class="tl-name label-mono">Project</span><span class="tl-track tl-months">${months}</span></div>${rows}</div></div>`;
    }
    if (page === "horizons") {
      const conf = { on: ["circle-check", "var(--success)", "On track"], risk: ["circle-alert", "var(--warning)", "At risk"], idea: ["circle-dashed", "var(--text-tertiary)", "Idea"] };
      const col = h => {
        const items = D.horizons.filter(x => x.h === h.id);
        return `<div class="hz-col"><div class="hz-head"><span class="label-mono">${h.label}</span><span class="mono" style="color:var(--text-tertiary)">${items.length}</span></div><div class="hz-sub">${h.sub}</div>
          ${items.map(x => { const p = project(x.project), c = conf[x.conf]; return `<div class="hz-card" data-a="go:work/project/${p.id}"><div class="hz-t">${esc(x.title)}</div><div class="hz-meta"><span class="chip">${p.emoji} ${esc(p.name)}</span><span class="chip">${ic(c[0], 13, c[1])}${c[2]}</span>${av(x.owner, 18)}</div></div>`; }).join("")}
          <button class="hz-add" data-a="toast:Goal added">${ic("plus", 14)}Add goal</button></div>`;
      };
      return header("Horizons", { lead: ic("telescope", 16, "var(--text-secondary)") }) +
        `<div class="scroll"><div class="hz">${[{ id: "now", label: "Now", sub: "This quarter" }, { id: "next", label: "Next", sub: "Next quarter" }, { id: "later", label: "Later", sub: "6–12 months" }].map(col).join("")}</div></div>`;
    }
    if (page === "time") {
      const t = S.timer, total = D.timeEntries.reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0);
      const dayTotals = WEEKDAYS.map((_, d) => D.timeEntries.reduce((s, e) => s + e.hours[d], 0));
      const head = `<div class="ts-row ts-head"><span>Work item</span>${WEEKDAYS.map((w, d) => `<span class="${d === TODAY_IDX ? "today" : ""}">${w}</span>`).join("")}<span>Total</span></div>`;
      const rows = D.timeEntries.map(e => { const i = issue(e.issue); return `<div class="ts-row"><span class="ts-name" data-a="go:work/issue/${e.issue}"><span class="mono" style="color:var(--text-tertiary)">${e.issue}</span>${esc(i ? i.title : "")}</span>${e.hours.map((h, d) => `<span class="ts-h${d === TODAY_IDX ? " today" : ""}${h ? "" : " zero"}">${h ? fmtH(h) : "–"}</span>`).join("")}<span class="ts-h total">${fmtH(e.hours.reduce((a, b) => a + b, 0))}</span></div>`; }).join("");
      const foot = `<div class="ts-row ts-foot"><span>Total</span>${dayTotals.map((h, d) => `<span class="ts-h${d === TODAY_IDX ? " today" : ""}">${h ? fmtH(h) : "–"}</span>`).join("")}<span class="ts-h total">${fmtH(total)}</span></div>`;
      const timerBtn = t.running
        ? `<button class="btn sm" data-a="timer">${ic("square", 12, "var(--danger)")}Stop <span class="mono" id="timer-clock">${fmtClock(Date.now() - t.start)}</span></button>`
        : `<button class="btn sm primary" data-a="timer">${ic("play", 12)}Start timer</button>`;
      return header("Time tracking", { lead: ic("timer", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">Week of 12 Oct · ${fmtH(total)}h logged</span>`,
        actions: `<button class="chip" data-a="timer-issue">${ic("copy", 13)}${t.issue}</button>${timerBtn}` }) +
        `<div class="scroll"><div class="ts">${head}${rows}${foot}</div></div>`;
    }
    if (page === "analytics") {
      // single-series bars (one hue = magnitude); values as direct labels in text ink, tooltip per bar
      const open = D.issues.filter(i => i.status !== "done");
      const hours = Object.keys(D.people).map(n => ({ name: n, v: D.timeEntries.filter(e => e.who === n).reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0) }));
      const bars = (rows, unit) => { const max = Math.max(1, ...rows.map(r => r.v)); return `<div class="an-bars">${rows.map(r => `<div class="an-row" title="${esc(r.name)}: ${fmtH(r.v)}${unit}"><span class="an-lbl">${r.lead || ""}${esc(r.name)}</span><span class="an-track"><span class="an-bar" style="width:${r.v / max * 100}%"></span></span><span class="an-v">${fmtH(r.v)}${unit}</span></div>`).join("")}</div>`; };
      const stat = (v, k, icon) => `<div class="stat"><div style="display:flex;justify-content:space-between;align-items:center"><span class="v">${v}</span>${ic(icon, 16, "var(--text-tertiary)")}</div><div class="k">${k}</div></div>`;
      const totalH = hours.reduce((s, h) => s + h.v, 0);
      return header("Analytics", { lead: ic("chart-column", 16, "var(--text-secondary)") }) + `<div class="scroll"><div class="home">
        <div class="stats">${stat(open.length, "Open work items", "circle")}${stat(D.issues.filter(i => i.status === "done").length, "Completed", "circle-check")}${stat(fmtH(totalH) + "h", "Logged this week", "timer")}${stat(D.issues.filter(i => i.prio === 1 && i.status !== "done").length, "Urgent and open", "circle-alert")}</div>
        <div class="an-grid">
          <div class="card"><div class="an-title">Work items by status</div>${bars(D.statuses.map(s => ({ name: s.name, lead: ic(s.icon, 13, s.color), v: D.issues.filter(i => i.status === s.id).length })), "")}</div>
          <div class="card"><div class="an-title">Open work items by project</div>${bars(D.projects.map(p => ({ name: p.name, lead: `<span style="width:14px;text-align:center">${p.emoji}</span>`, v: open.filter(i => i.project === p.id).length })), "")}</div>
          <div class="card"><div class="an-title">Hours logged this week</div>${bars(hours.map(h => ({ name: h.name, lead: av(h.name, 16), v: h.v })), "h")}</div>
        </div></div></div>`;
    }
    if (page === "item") { // a folder element: its kind's page, titled "Folder › Item"
      const f = D.planFolders.find(x => x.id === parts[2]), it = f && f.items[+parts[3]];
      if (!it) return header("Not found") + emptyState("folder", "Item not found", "It may have been moved or deleted.");
      const title = `<span class="title"><span style="color:var(--text-secondary);font-weight:500">${esc(f.name)}</span> <span class="crumb-sep">›</span> ${esc(it.name)}</span>`;
      return viewPlan(["plan", PLAN_KINDS[it.kind][1].split("/")[1]]).replace(/<span class="title">[^<]*<\/span>/, title);
    }
    if (page === "folder") {
      const f = D.planFolders.find(x => x.id === parts[2]);
      if (!f) return header("Folder") + emptyState("folder", "Folder not found", "It may have been deleted.");
      return header(esc(f.name), { lead: ic("folder", 16, "var(--text-secondary)"), count: f.items.length, actions: `<button class="btn sm" data-a="toast:Plan added">${ic("plus", 13)}Add plan</button>` }) +
        (f.items.length ? `<div class="scroll">${f.items.map((it, n) => `<div class="prow" style="grid-template-columns:1fr 120px" data-a="go:plan/item/${f.id}/${n}"><span style="display:flex;align-items:center;gap:10px">${ic(PLAN_KINDS[it.kind][0], 16, "var(--text-secondary)")}${esc(it.name)}</span><span class="mono" style="color:var(--text-tertiary);text-transform:capitalize">${it.kind}</span></div>`).join("")}</div>`
          : emptyState("folder-open", "Empty folder", "Group timelines, horizons and reports that belong together."));
    }
    if (page === "calendar") {
      // October 2026, weeks start on Monday
      const offset = (new Date(2026, 9, 1).getDay() + 6) % 7, cells = [];
      for (let n = 0; n < 35; n++) {
        const d = new Date(2026, 9, n - offset + 1), key = String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()];
        const due = D.issues.filter(i => i.due === key).map(i => `<span class="cal-it" data-a="go:work/issue/${i.id}" style="border-left-color:${status(i.status).color}">${esc(i.title)}</span>`).join("");
        cells.push(`<div class="cal-cell${d.getMonth() === 9 ? "" : " out"}${+d === +TODAY ? " today" : ""}"><span class="cal-d">${d.getDate()}</span>${due}</div>`);
      }
      return header("Calendar", { lead: ic("calendar", 16, "var(--text-secondary)"), mid: `<span class="mono" style="color:var(--text-tertiary);margin-left:6px">October 2026</span>` }) +
        `<div class="scroll"><div class="cal">${WEEKDAYS.map(w => `<div class="cal-w label-mono">${w}</div>`).join("")}${cells.join("")}</div></div>`;
    }
    return viewPlan(["plan", "timelines"]);
  }
  function viewFiles(parts) {
    if (parts[1] === "file") { // single file: preview placeholder + details
      const f = D.files[+parts[2]];
      if (!f) return header("Not found") + emptyState("file", "File not found", "It may have been moved or deleted.");
      const fo = D.folders.find(x => x.id === f.folder);
      const row = (k, v) => `<div class="box-row"><div class="l"><span>${k}</span></div><span style="color:var(--text-secondary)">${v}</span></div>`;
      return header(`${fo ? `<span style="color:var(--text-secondary);font-weight:500">${esc(fo.name)}</span> <span class="crumb-sep">›</span> ` : ""}${esc(f.name)}`, { lead: ic(f.icon, 16, "var(--text-secondary)"),
        actions: f.trashed ? `<button class="btn sm" data-a="file-restore:${parts[2]}">${ic("rotate-ccw", 13)}Restore</button>`
          : `<button class="ib" data-a="toast:Link copied" title="Copy link">${ic("link")}</button><button class="ib" data-a="file-trash:${parts[2]}" title="Move to trash">${ic("trash-2")}</button><button class="btn sm" data-a="toast:Download started">${ic("download", 13)}Download</button>` }) +
        `<div class="scroll"><div class="set">${f.trashed ? `<div class="trash-banner">${ic("trash-2", 15)}This file is in the trash. Restore it to use it again.</div>` : ""}<div class="file-preview">${ic(f.icon, 56, "var(--text-tertiary)")}<span>${esc(f.name)}</span></div>
          <div class="box">${row("Owner", `<span style="display:inline-flex;gap:6px;align-items:center">${av(f.owner, 18)}${esc(f.owner)}</span>`)}${row("Folder", fo ? esc(fo.name) : "–")}${row("Modified", f.modified + " ago")}${row("Size", f.size)}${row("Sharing", f.shared ? "Shared with workspace" : "Only you")}</div></div></div>`;
    }
    if (!parts[1] || parts[1] === "folders") return viewAllFolders();
    const page = parts[1], folder = page === "folder" && D.folders.find(f => f.id === parts[2]);
    if (page === "trash") return viewTrash();
    if (page === "kb") return viewKnowledge(parts[2]);
    const live = liveFiles(), list = folder ? live.filter(f => f.folder === folder.id) : page === "starred" ? live.filter(f => f.starred) : page === "recent" ? live.slice(0, 4) : live;
    const title = folder ? folder.name : { all: "All files", recent: "Recent", starred: "Starred" }[page] || "All files";
    const rows = list.map(f => `<div class="prow frow" data-a="go:files/file/${D.files.indexOf(f)}"><span class="fname">${ic(f.icon, 16, "var(--text-secondary)")}<span>${esc(f.name)}</span>${f.starred ? ic("star", 12, "var(--warning)") : ""}</span><span style="display:flex;gap:6px;align-items:center;color:var(--text-secondary)">${av(f.owner, 18)}${esc(f.owner)}</span><span class="mono" style="color:var(--text-tertiary)">${f.modified}</span><span class="mono" style="color:var(--text-tertiary);text-align:right">${f.size}</span><button class="ib sm frow-x" data-a="file-trash:${D.files.indexOf(f)}" title="Move to trash">${ic("trash-2", 13)}</button></div>`).join("");
    return header(folder ? `<span style="color:var(--text-secondary);font-weight:500;cursor:pointer" data-a="go:files/folders">All folders</span> <span class="crumb-sep">›</span> ${esc(title)}` : esc(title), { lead: ic(folder ? "folder" : "files", 16, "var(--text-secondary)"), count: list.length, actions: `<button class="btn sm primary" data-a="upload">${ic("upload", 13)}Upload</button>` }) +
      (list.length ? `<div class="scroll"><div class="prow frow head"><span>Name</span><span>Owner</span><span>Modified</span><span style="text-align:right">Size</span><span></span></div>${rows}</div>` : emptyState("files", "Nothing here", "Files you star or that others share with you show up here."));
  }
  // sizes like "820 KB" / "4.2 MB" → bytes; ages like "12m" / "2h" / "1d" / "1w" → minutes (for "newest")
  const toBytes = s => { const [n, u] = s.split(" "); return +n * ({ KB: 1e3, MB: 1e6, GB: 1e9 }[u] || 1); };
  const fmtBytes = b => b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : b >= 1e6 ? (b / 1e6).toFixed(1).replace(/\.0$/, "") + " MB" : Math.round(b / 1e3) + " KB";
  const ageMin = a => parseFloat(a) * ({ m: 1, h: 60, d: 1440, w: 10080 }[a.slice(-1)] || 1);
  function viewAllFolders() {
    const rows = D.folders.map(f => {
      const files = liveFiles().filter(x => x.folder === f.id), newest = files.slice().sort((a, b) => ageMin(a.modified) - ageMin(b.modified))[0];
      return `<div class="coll-row c5" data-a="go:files/folder/${f.id}">
        <span class="coll-name">${ic("folder", 16, "var(--text-secondary)")}<span>${esc(f.name)}</span></span>
        <span class="mono">${files.length}</span><span class="mono">${files.length ? fmtBytes(files.reduce((s, x) => s + toBytes(x.size), 0)) : "–"}</span>
        <span style="color:var(--text-secondary)">${newest ? newest.modified + " ago" : "–"}</span>
        <button class="ib sm" data-a="folder-menu:${f.id}" title="More">${ic("ellipsis", 14)}</button></div>`;
    }).join("");
    return header("All folders", { lead: ic("folders", 16, "var(--text-secondary)"), actions: `<button class="ib" data-a="palette" title="Search  ${MOD}+S">${ic("search")}</button>` }) +
      `<div class="scroll"><div class="coll">
        <div class="coll-head"><span class="coll-icon">${ic("folders", 24)}</span><h1>All folders</h1><span class="spacer"></span>
          <button class="btn" data-a="upload">${ic("upload", 14)}Upload</button><button class="btn primary" data-a="newfolder:files">New folder</button></div>
        <p class="coll-desc">${D.folders.length} folders · ${liveFiles().length} files · ${fmtBytes(liveFiles().reduce((s, x) => s + toBytes(x.size), 0))} in total.</p>
        ${D.folders.length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Folder name</span><span>Files</span><span>Size</span><span>Last modified</span><span></span></div>${rows}</div>`
          : emptyState("folders", "No folders yet", "Folders keep related files together.", `<button class="btn primary" data-a="newfolder:files">New folder</button>`)}
      </div></div>`;
  }
  // knowledge base: home table of collections, or one collection's files
  function viewKnowledge(id) {
    const kbIcon = `<span class="coll-icon">${ic("library-big", 24)}</span>`;
    const k = id && D.knowledge.find(x => x.id === id);
    if (k) {
      const files = kbTree(k).items;
      const rows = files.map(f => `<div class="prow frow" data-a="go:files/file/${D.files.indexOf(f)}"><span class="fname">${ic(f.icon, 16, "var(--text-secondary)")}<span>${esc(f.name)}</span></span><span style="display:flex;gap:6px;align-items:center;color:var(--text-secondary)">${av(f.owner, 18)}${esc(f.owner)}</span><span class="mono" style="color:var(--text-tertiary)">${f.modified}</span><span class="mono" style="color:var(--text-tertiary);text-align:right">${f.size}</span><button class="ib sm frow-x" data-a="kb-remove:${k.id}|${esc(f.name)}" title="Remove from collection">${ic("x", 13)}</button></div>`).join("");
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
          <button class="btn primary" data-a="newfolder:kb">New collection</button></div>
        <p class="coll-desc">Curated reference material for your team and the AI assistant · ${D.knowledge.length} collections · ${refs.size} files.</p>
        ${D.knowledge.length ? `<div class="coll-table"><div class="coll-row c5 head"><span>Collection</span><span>Files</span><span>Size</span><span>Last updated</span><span></span></div>${rows}</div>`
          : emptyState("library-big", "No collections yet", "Group the files your team keeps coming back to.", `<button class="btn primary" data-a="newfolder:kb">New collection</button>`)}
      </div></div>`;
  }
  function viewTrash() {
    const items = D.files.map((f, n) => ({ f, n })).filter(x => x.f.trashed);
    const rows = items.map(({ f, n }) => { const fo = D.folders.find(x => x.id === f.folder);
      return `<div class="coll-row c-trash" data-a="go:files/file/${n}">
        <span class="coll-name">${ic(f.icon, 16, "var(--text-tertiary)")}<span>${esc(f.name)}</span></span>
        <span style="color:var(--text-secondary)">${fo ? esc(fo.name) : "–"}</span>
        <span style="color:var(--text-secondary)">${f.trashedAt === "now" ? "just now" : f.trashedAt + " ago"}</span>
        <span class="mono" style="color:var(--text-tertiary)">${f.size}</span>
        <span class="trash-acts"><button class="ib sm" data-a="file-restore:${n}" title="Restore">${ic("rotate-ccw", 14)}</button><button class="ib sm danger" data-a="file-purge:${n}" title="Delete forever">${ic("x", 14)}</button></span></div>`; }).join("");
    return header("Trash", { lead: ic("trash-2", 16, "var(--text-secondary)"), count: items.length }) + `<div class="scroll"><div class="coll">
      <div class="coll-head"><span class="coll-icon">${ic("trash-2", 24)}</span><h1>Trash</h1><span class="spacer"></span>
        ${items.length ? `<button class="btn danger-btn" data-a="trash-empty">${ic("trash-2", 14)}Empty trash</button>` : ""}</div>
      <p class="coll-desc">Files in the trash are hidden from folders and search. They are deleted for good after 30 days.</p>
      ${items.length ? `<div class="coll-table"><div class="coll-row c-trash head"><span>Name</span><span>Original folder</span><span>Deleted</span><span>Size</span><span></span></div>${rows}</div>`
        : emptyState("trash-2", "Trash is empty", "Files you delete land here first, so you can still restore them.")}
    </div></div>`;
  }
  function viewTodos() {
    const open = D.todos.filter(t => !t.done), done = D.todos.filter(t => t.done);
    const row = t => `<div class="todo${t.done ? " done" : ""}"><button class="todo-ck" data-a="todo:${t.id}" role="checkbox" aria-checked="${t.done}" title="${t.done ? "Mark as open" : "Mark as done"}">${t.done ? ic("check", 12) : ""}</button><span class="todo-t">${esc(t.text)}</span>${t.due ? `<span class="mono" style="color:var(--text-tertiary)">${t.due}</span>` : ""}<button class="ib sm todo-x" data-a="todo-del:${t.id}" title="Delete">${ic("x", 13)}</button></div>`;
    return header("ToDos", { lead: ic("list-checks", 16, "var(--text-secondary)"), count: open.length }) +
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
      ${row("Public links", "Allow sharing read-only links outside the workspace.", sw("publicLinks"))}</div>
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
    const parts = S.route.split("/"), prod = parts[0] === "pin" ? S.curProd : parts[0];
    const sb = { plan: sidebarPlan, work: sidebarWork, wiki: sidebarWiki, files: sidebarFiles, ai: sidebarAI, settings: sidebarSettings }[prod] || sidebarWork;
    const view = { pin: viewPinned, plan: viewPlan, work: viewWork, wiki: viewWiki, files: viewFiles, ai: viewAI, settings: viewSettings }[parts[0]] || viewWork;
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
    store.set("route", S.route); store.set("theme", S.theme); store.set("prod", S.curProd);
  }
  function go(route) {
    if (!route) return;
    if (route.split("/")[0] === "work" && route.startsWith("work/project/") && !S.route.startsWith(route)) S.tab = "items";
    const p = route.split("/")[0];
    if (p !== "pin") { S.curProd = p; S.lastRoute[p] = route; }
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
    menuEl.innerHTML = items.map((it, n) => it === "-" ? '<div class="msep"></div>' : `<div class="mi" data-mi="${n}">${it.lead || (it.icon ? ic(it.icon, 15, it.color) : "")}<span>${esc(it.label)}</span>${it.check ? `<span class="ck">${ic("check", 14)}</span>` : it.kbd ? `<span style="margin-left:auto;display:flex;gap:3px">${kbd(it.kbd)}</span>` : ""}</div>`).join("");
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

  function draftChips() {
    const d = S.draft, st = status(d.status), pr = prio(d.prio), p = project(d.project);
    if (d.kind === "project") return `<span class="chip" data-a="d-status">${ic(st.icon, 13, st.color)}${st.name}</span><span class="chip" data-a="d-prio">${ic(pr.icon, 13, pr.color)}${pr.name}</span><span class="chip" data-a="d-who">${av(d.who, 14)}Lead: ${esc(d.who)}</span><span class="chip is-empty">${ic("calendar", 13)}Target</span>`;
    return `<span class="chip" data-a="d-status">${ic(st.icon, 13, st.color)}${st.name}</span><span class="chip" data-a="d-prio">${ic(pr.icon, 13, pr.color)}${pr.name}</span><span class="chip" data-a="d-who">${av(d.who, 14)}${esc(d.who)}</span><span class="chip" data-a="d-label"><span class="dot" style="background:${D.labels[d.label]}"></span>${esc(d.label)}</span><span class="chip" data-a="d-project">${p.emoji} ${esc(p.name)}</span>`;
  }
  function refreshDraftChips() { const c = layer && layer.querySelector("#dchips"); if (c) c.innerHTML = draftChips(); }
  function openCreate(kind, preset = {}) {
    const cur = S.route.match(/^work\/project\/(\w+)/);
    S.draft = Object.assign({ kind, status: "todo", prio: 0, who: D.me, label: "Enhancement", project: cur ? cur[1] : D.projects[0].id, more: false }, preset);
    const p = project(S.draft.project), isP = kind === "project";
    openLayer(`<div class="dialog" role="dialog" aria-modal="true">
      <div class="dh"><span class="pill-crumb">${isP ? ic("box", 13) + esc(D.workspace.name) : p.emoji + " " + esc(p.key)}</span><span class="crumb-sep">›</span><span style="font:var(--type-ui);font-weight:600">${isP ? "New project" : "New work item"}</span><span style="flex:1"></span><button class="ib" data-a="close" title="Close  Esc">${ic("x")}</button></div>
      <div class="db">${isP ? `<div style="width:32px;height:32px;border-radius:6px;background:var(--bg-selected);display:grid;place-items:center;margin:6px 0">${ic("box", 16)}</div>` : ""}
        <input class="big" id="dtitle" placeholder="${isP ? "Project name" : "Issue title"}" autocomplete="off">
        <textarea id="ddesc" placeholder="${isP ? "Add a short summary…" : "Add a description…"}"></textarea>
        <div id="dchips" style="display:flex;flex-wrap:wrap;gap:6px">${draftChips()}</div></div>
      <div class="df">${isP ? "" : `<span style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font:var(--type-small)"><button class="switch" data-a="d-more" role="switch"></button>Create more</span><span style="flex:1"></span>`}
        <button class="btn primary" data-a="create">${isP ? "Create project" : "Create work item"} ${kbd([MOD, "⏎"])}</button></div></div>`,
      l => l.querySelector("#dtitle").focus());
  }
  function submitCreate() {
    const d = S.draft, title = layer.querySelector("#dtitle").value.trim();
    if (!title) { layer.querySelector("#dtitle").focus(); return; }
    if (d.kind === "project") {
      const id = "p" + Date.now().toString(36);
      D.projects.push({ id, emoji: "📦", name: title, key: title.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "NEW", lead: d.who, target: "—", progress: 0 });
      closeLayer(); go("work/project/" + id); toast("Project created"); return;
    }
    const p = project(d.project), n = Math.max(0, ...D.issues.filter(i => i.project === p.id).map(i => +i.id.split("-")[1])) + 1;
    const id = p.key + "-" + n;
    D.issues.unshift({ id, project: p.id, status: d.status, prio: d.prio, title, label: d.label, who: d.who, desc: layer.querySelector("#ddesc").value.trim() });
    toast(id + " created");
    if (d.more) { layer.querySelector("#dtitle").value = ""; layer.querySelector("#ddesc").value = ""; layer.querySelector("#dtitle").focus(); render(); }
    else { closeLayer(); render(); }
  }

  /* command palette */
  function paletteItems() {
    const out = [];
    const add = (group, icon, label, run, k) => out.push({ group, icon, label, run, kbd: k });
    add("Actions", "square-pen", "Create work item", () => openCreate("issue"), ["C"]);
    add("Actions", "box", "Create project", () => openCreate("project"));
    add("Actions", S.theme === "dark" ? "sun" : "moon", "Switch to " + (S.theme === "dark" ? "light" : "dark") + " theme", () => { S.theme = S.theme === "dark" ? "light" : "dark"; render(); });
    add("Actions", "panel-left", "Toggle sidebar", () => { S.collapsed = !S.collapsed; render(); }, ["["]);
    [["work/notes", "notebook-pen", "Notes"], ["work/canvas", "shapes", "Canvas"], ["work/stickies", "sticky-note", "Stickies"], ["work/home", "house", "Home"], ["pin/inbox", "inbox", "Inbox"], ["pin/todos", "list-checks", "ToDos"], ["work/mine", "scan-eye", "My issues"], ["work/projects", "box", "Projects"], ["plan/timelines", "chart-gantt", "Timelines"], ["plan/horizons", "telescope", "Horizons"], ["plan/time", "timer", "Time tracking"], ["plan/analytics", "chart-column", "Analytics"], ["pin/calendar", "calendar", "Calendar"], ["wiki/flashcards", "gallery-vertical-end", "Flashcards"], ["wiki/practice", "dumbbell", "Practice"], ["wiki/practice/test", "clipboard-check", "Practice test"], ["wiki/practice/braindump", "brain", "Brain dump"], ["wiki/tutor", "graduation-cap", "AI Tutor"], ["wiki/tutor/chat", "messages-square", "Tutor conversation"], ["wiki/tutor/summary", "scroll-text", "Tutor summary"], ["wiki/progress", "trending-up", "Track & progress"], ["files/folders", "folders", "All folders"], ["files/trash", "trash-2", "Trash"], ["files/kb", "library-big", "Knowledge base"], ["ai/new", "bot", "AI"], ["settings/general", "settings", "Settings"]]
      .forEach(([r, i, l]) => add("Go to", i, l, () => go(r)));
    D.projects.forEach(p => add("Projects", null, p.emoji + "  " + p.name, () => go("work/project/" + p.id)));
    D.issues.forEach(i => add("Work items", status(i.status).icon, i.id + "  " + i.title, () => go("work/issue/" + i.id)));
    D.files.forEach((f, n) => { if (!f.trashed) add("Files", f.icon, f.name, () => go("files/file/" + n)); });
    D.pages.forEach(p => add("Learn", p.icon, p.title, () => go("wiki/" + p.id)));
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
    const rows = [["Search / command menu", [MOD, "S"]], ["New work item", ["C"]], ["Toggle sidebar", ["["]], ["Plan / Work / Learn / Files / AI", ["1", "–", "5"]], ["Settings", [","]], ["Close dialog or menu", ["Esc"]], ["Create from dialog", [MOD, "⏎"]], ["AI assistant", ["A"]]];
    openLayer(`<div class="dialog" style="width:min(440px,calc(100vw - 32px))"><div class="dh"><span style="font:var(--type-heading)">Keyboard shortcuts</span><span style="flex:1"></span><button class="ib" data-a="close">${ic("x")}</button></div><div class="db">${rows.map(([l, k]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-subtle)"><span style="color:var(--text-secondary)">${l}</span><span style="display:flex;gap:3px">${kbd(k)}</span></div>`).join("")}</div></div>`);
  }

  /* ---------- AI (local, rule-based replies over sample data) ---------- */
  function answer(q) {
    const s = q.toLowerCase(), li = list => "<ul>" + list.map(i => `<li><span class="mono">${i.id}</span> ${esc(i.title)} — ${esc(i.who)}</li>`).join("") + "</ul>";
    const open = D.issues.filter(i => i.status !== "done");
    if (/overdue|late|fällig|überfällig/.test(s)) { const o = open.filter(i => i.due && dayDiff(i.due) < 0); return o.length ? (o.length === 1 ? "1 work item is overdue:" : `${o.length} work items are overdue:`) + li(o) : "Nothing is overdue."; }
    if (/urgent|dringend/.test(s)) { const u = open.filter(i => i.prio === 1); return u.length ? `Sticky drafted with ${u.length} urgent work items:` + li(u) : "There are no urgent work items."; }
    if (/week|summar|woche|zusammen/.test(s)) { const p = D.issues.filter(i => i.status === "progress"), d = D.issues.filter(i => i.status === "done"); return `This week ${p.length} items are in progress and ${d.length} are done. In progress:` + li(p); }
    if (/release|notes/.test(s)) { const d = D.issues.filter(i => i.status === "done"); return "<b>Release notes (draft)</b><ul>" + d.map(i => `<li>${esc(i.title)}</li>`).join("") + "<li>Double navigation with product rail and contextual sidebar</li></ul>"; }
    if (/who|wer|working/.test(s)) return "<ul>" + Object.keys(D.people).map(n => `<li><b>${esc(n)}</b>: ${open.filter(i => i.who === n).length} open items</li>`).join("") + "</ul>";
    return `I looked through ${D.issues.length} work items, ${D.projects.length} projects and ${D.pages.length} wiki pages. Try asking what is overdue, who is working on what, or for a summary of this week.`;
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
  const ASST_SUGGEST = ["Create a sticky with all urgent work items", "What is overdue?", "Summarise this week for the team"];
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
  function statusMenu(el, i) { openMenu(el, D.statuses.map(s => ({ icon: s.icon, color: s.color, label: s.name, check: i.status === s.id, run: () => { i.status = s.id; render(); } }))); }
  function prioMenu(el, i) { openMenu(el, D.priorities.map(p => ({ icon: p.icon, color: p.color, label: p.name, check: i.prio === p.id, run: () => { i.prio = p.id; render(); } }))); }
  function whoMenu(el, cur, set) { openMenu(el, Object.keys(D.people).map(n => ({ lead: av(n, 16), label: n, check: cur === n, run: () => set(n) }))); }
  function labelMenu(el, cur, set) { openMenu(el, Object.keys(D.labels).map(l => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:8px;height:8px;border-radius:99px;background:${D.labels[l]}"></span></span>`, label: l, check: cur === l, run: () => set(l) }))); }

  const A = {
    go: (v) => go(v),
    product: (v) => go(S.lastRoute[v] || v),
    back: () => go(S.lastRoute.work),
    sec: (k) => { S.closedSecs.has(k) ? S.closedSecs.delete(k) : S.closedSecs.add(k); store.set("closedSecs", [...S.closedSecs]); render(); },
    grp: (k) => { S.closedGroups.has(k) ? S.closedGroups.delete(k) : S.closedGroups.add(k); render(); },
    collapse: () => { S.collapsed = !S.collapsed; render(); },
    theme: () => { S.theme = S.theme === "dark" ? "light" : "dark"; render(); },
    settheme: (v) => { S.theme = v; render(); },
    tab: (v) => { S.tab = v; render(); },
    palette: () => openPalette(),
    shortcuts: () => openShortcuts(),
    newissue: (v) => openCreate("issue", D.statuses.some(s => s.id === v) ? { status: v } : /^p\d$/.test(v || "") ? { prio: +v.slice(1) } : {}),
    newproject: () => openCreate("project", { status: "backlog" }),
    newpage: () => { const id = "pg" + Date.now().toString(36); D.pages.push({ id, icon: "file-text", title: "Untitled", body: [""] }); D.learnFolders[0].items.push({ page: id }); S.openFolders.add(D.learnFolders[0].id); go("wiki/" + id); setTimeout(() => { const h = document.querySelector("[data-edit^='page-title']"); if (h) { h.focus(); document.execCommand && document.execCommand("selectAll"); } }); },
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
    "file-trash": (v) => { const f = D.files[+v]; f.trashed = true; f.trashedAt = "now"; if (S.route === "files/file/" + v) go("files/trash"); else render(); toast(f.name + " moved to trash"); },
    "file-restore": (v) => { const f = D.files[+v]; f.trashed = false; if (!D.folders.some(x => x.id === f.folder)) f.folder = null; render(); toast(f.name + " restored"); },
    "file-purge": (v) => confirmDelete("Delete forever?", `“${D.files[+v].name}” will be removed permanently. This can’t be undone.`, () => { const name = D.files[+v].name; D.files.splice(+v, 1); go("files/trash"); toast(name + " deleted"); }),
    "trash-empty": () => { const n = D.files.filter(f => f.trashed).length;
      confirmDelete("Empty trash?", `${n} ${n === 1 ? "file" : "files"} will be removed permanently. This can’t be undone.`, () => { D.files = D.files.filter(f => !f.trashed); render(); toast("Trash emptied"); }); },
    opensec: (v) => { const [key, route] = v.split("|"); S.closedSecs.delete(key); store.set("closedSecs", [...S.closedSecs]); go(route); },
    "kb-menu": (v, el) => openMenu(el, [
      { icon: "book-marked", label: "Open", run: () => go("files/kb/" + v) }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete collection", run: () => { D.knowledge.splice(D.knowledge.findIndex(x => x.id === v), 1); render(); toast("Collection deleted — its files are untouched"); } }]),
    "kb-remove": (v) => { const [id, name] = v.split("|"), k = D.knowledge.find(x => x.id === id); k.files = k.files.filter(n => n !== name); render(); toast("Removed from " + k.name); },
    "folder-menu": (v, el) => openMenu(el, [
      { icon: "folder-open", label: "Open", run: () => go("files/folder/" + v) },
      { icon: "upload", label: "Upload here", run: () => toast("Upload started") }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete folder", run: () => { const n = liveFiles().filter(x => x.folder === v).length; if (n) { toast("Move or delete its " + n + " files first"); return; } D.folders.splice(D.folders.findIndex(f => f.id === v), 1); render(); toast("Folder deleted"); } }]),
    "summary-src": (v) => { S.summary = v; render(); },
    "summary-note": () => { const s = summarySource(S.summary), id = "n" + Date.now().toString(36);
      D.notes.unshift({ id, title: "Summary: " + s.title, body: s.points.map(x => "• " + x).join("\n"), labels: [], updated: "now" }); toast("Saved to Notes"); },
    "tutor-send": () => tutorAsk(document.getElementById("tutor-prompt").value),
    "tutor-clear": () => { D.tutorLog.length = 0; render(); },
    "note-add": () => { const id = "n" + Date.now().toString(36); D.notes.unshift({ id, title: "", body: "", labels: [], updated: "now" }); S.openFolders.add("x-notes"); go("work/notes/" + id); setTimeout(() => { const h = document.querySelector("[data-edit=\"note-title:" + id + "\"]"); h && h.focus(); }); },
    "note-labels": (v, el) => { const n = D.notes.find(x => x.id === v); n.labels = n.labels || [];
      openMenu(el, Object.keys(D.labels).map(l => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:8px;height:8px;border-radius:99px;background:${D.labels[l]}"></span></span>`, label: l, check: n.labels.includes(l),
        run: () => { n.labels = n.labels.includes(l) ? n.labels.filter(x => x !== l) : n.labels.concat(l); n.updated = "now"; render(); } }))); },
    "note-menu": (v, el) => openMenu(el, [
      { icon: "file-text", label: "Open", run: () => go("work/notes/" + v) },
      { icon: "copy-plus", label: "Duplicate", run: () => { const n = D.notes.find(x => x.id === v); D.notes.splice(D.notes.indexOf(n) + 1, 0, Object.assign({}, n, { id: "n" + Date.now().toString(36), title: (n.title || "Untitled") + " (copy)", labels: (n.labels || []).slice(), updated: "now" })); render(); toast("Note duplicated"); } },
      { icon: "link", label: "Copy link", run: () => toast("Link copied") }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete", run: () => A["note-del"](v) }]),
    "note-new-menu": (v, el) => openMenu(el, [
      { icon: "file-text", label: "Blank note", run: () => A["note-add"]() },
      { icon: "layout-template", label: "Meeting notes template", run: () => { A["note-add"](); const n = D.notes[0]; n.title = "Meeting notes " + TODAY.getDate() + " " + MONTHS[TODAY.getMonth()]; n.body = "Attendees:\nAgenda:\nDecisions:\nNext steps:"; render(); } }]),
    "notes-filter": (v, el) => openMenu(el, [{ icon: "list", label: "All labels", check: !S.notesLabel, run: () => { S.notesLabel = null; render(); } }, "-"].concat(Object.keys(D.labels).map(l => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:8px;height:8px;border-radius:99px;background:${D.labels[l]}"></span></span>`, label: l, check: S.notesLabel === l, run: () => { S.notesLabel = l; render(); } })))),
    "notes-clear": () => { S.notesLabel = null; render(); },
    "notes-more": (v, el) => openMenu(el, [{ icon: "plus", label: "New note", run: () => A["note-add"]() }, { icon: "link", label: "Copy link to collection", run: () => toast("Link copied") }]),
    "note-folder": (v, el) => folderMenu(el, "note", v, () => { D.notes.find(x => x.id === v).updated = "now"; }),
    "sticky-folder": (v, el) => folderMenu(el, "sticky", v, () => { D.stickies.find(x => x.id === v).updated = "now"; }),
    "note-del": (v) => { D.workFolders.forEach(f => f.items = f.items.filter(i => i.note !== v)); D.notes.splice(D.notes.findIndex(n => n.id === v), 1); go("work/notes"); toast("Note deleted"); },
    "cv-add": (kind) => { const wrap = document.querySelector(".canvas-wrap"), n = curBoard().items.length; addCanvasItem(kind, (wrap ? wrap.scrollLeft : 0) + 60 + n * 24 % 240, (wrap ? wrap.scrollTop : 0) + 60 + n * 24 % 240); },
    "cv-del": (v) => { const b = boardOf(v); b.items.splice(b.items.findIndex(c => c.id === v), 1); render(); },
    openrow: (v) => { const [id, route] = v.split("|"); S.openFolders.add(id); store.set("openFolders", [...S.openFolders]); go(route); },
    "canvas-menu": (v, el) => openMenu(el, [
      { icon: "layout-dashboard", label: "Open", run: () => go("work/canvas/" + v) },
      { icon: "copy-plus", label: "Duplicate", run: () => { const b = D.canvases.find(x => x.id === v), s = Date.now().toString(36);
        D.canvases.splice(D.canvases.indexOf(b) + 1, 0, { id: "b" + s, name: b.name + " (copy)", updated: "now", items: b.items.map((c, n) => Object.assign({}, c, { id: "cv" + s + n })) }); render(); toast("Canvas duplicated"); } }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete", run: () => { D.canvases.splice(D.canvases.findIndex(x => x.id === v), 1); render(); toast("Canvas deleted"); } }]),
    "canvas-add": () => { const id = "b" + Date.now().toString(36); D.canvases.push({ id, name: "Untitled canvas", items: [], updated: "now" }); S.openFolders.add("x-canvas"); go("work/canvas/" + id); },
    "sticky-add": () => { const id = "s" + Date.now().toString(36); D.stickies.unshift({ id, text: "", color: "amber", updated: "now" }); render(); setTimeout(() => { const el = document.querySelector("[data-edit=\"sticky:" + id + "\"]"); el && el.focus(); }); },
    "sticky-del": (v) => { D.workFolders.forEach(f => f.items = f.items.filter(i => i.sticky !== v)); D.stickies.splice(D.stickies.findIndex(s => s.id === v), 1); render(); },
    "sticky-color": (v, el) => openMenu(el, Object.keys(STICKY_COLORS).map(k => ({ lead: `<span style="width:15px;display:grid;place-items:center"><span style="width:10px;height:10px;border-radius:3px;background:${STICKY_COLORS[k][1]}"></span></span>`, label: k[0].toUpperCase() + k.slice(1), check: D.stickies.find(s => s.id === v).color === k, run: () => { D.stickies.find(s => s.id === v).color = k; render(); } }))),
    tfold: (v) => { S.openFolders.has(v) ? S.openFolders.delete(v) : S.openFolders.add(v); store.set("openFolders", [...S.openFolders]); render(); },
    newfolder: (scope) => { // scope: "plan" | "work" | "learn" | "files" | "ai"
      const id = scope[0] + Date.now().toString(36);
      if (scope === "kb") { D.knowledge.push({ id, name: "New collection", files: [] }); S.openFolders.add(id); S.closedSecs.delete("kbase"); render(); toast("Collection created"); return; }
      if (scope === "files") { D.folders.push({ id, name: "New folder", icon: "folder" }); S.openFolders.add("fo-" + id); }
      else { ({ work: D.workFolders, plan: D.planFolders, learn: D.learnFolders, ai: D.aiFolders })[scope].push({ id, name: "New folder", items: [] }); S.openFolders.add(id); }
      S.closedSecs.delete({ work: "wfold", plan: "pfold", learn: "lfold", files: "folders", ai: "afold" }[scope]); render(); toast("Folder created");
    },
    timer: () => {
      const t = S.timer;
      if (t.running) { // log elapsed time (min. 0.1h) on today for the selected work item
        const h = Math.max(0.1, (Date.now() - t.start) / 36e5), i = issue(t.issue);
        let e = D.timeEntries.find(x => x.issue === t.issue && x.who === D.me);
        if (!e) { e = { issue: t.issue, who: D.me, hours: [0, 0, 0, 0, 0, 0, 0] }; D.timeEntries.unshift(e); }
        e.hours[TODAY_IDX] += h; t.running = false; toast(fmtH(h) + "h logged on " + (i ? i.id : t.issue));
      } else { t.running = true; t.start = Date.now(); }
      render();
    },
    "timer-issue": (v, el) => openMenu(el, D.issues.filter(i => i.status !== "done").map(i => ({ icon: status(i.status).icon, color: status(i.status).color, label: i.id + "  " + i.title, check: S.timer.issue === i.id, run: () => { S.timer.issue = i.id; render(); } }))),
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
    todo: (v) => { const t = D.todos.find(x => x.id === +v); t.done = !t.done; render(); },
    "todo-del": (v) => { D.todos.splice(D.todos.findIndex(x => x.id === +v), 1); render(); },
    inbox: (v) => { const m = D.inbox.find(x => x.id === +v); m.unread = false; S.selInbox = m.id; render(); },
    readall: () => { D.inbox.forEach(m => m.unread = false); render(); toast("All notifications marked read"); },
    pref: (k) => { S.prefs[k] = !S.prefs[k]; render(); },
    savews: () => { const v = document.getElementById("wsname").value.trim(); if (v) { D.workspace.name = v; D.workspace.initial = v[0].toUpperCase(); } render(); toast("Workspace saved"); },
    ask: (v) => ask(v),
    send: () => { const p = document.getElementById("prompt"); ask(p.value); },
    status: (v, el) => statusMenu(el, issue(v)),
    prio: (v, el) => prioMenu(el, issue(v)),
    assignee: (v, el) => { const i = issue(v); whoMenu(el, i.who, n => { i.who = n; render(); }); },
    label: (v, el) => { const i = issue(v); labelMenu(el, i.label, l => { i.label = l; render(); }); },
    issuemenu: (v, el) => openMenu(el, [
      { icon: "copy", label: "Copy ID", run: () => toast(v + " copied") },
      { icon: "circle-check", label: "Mark as done", run: () => { issue(v).status = "done"; render(); } }, "-",
      { icon: "trash-2", color: "var(--danger)", label: "Delete", run: () => { const i = issue(v); D.issues.splice(D.issues.indexOf(i), 1); go("work/project/" + i.project); toast(v + " deleted"); } }]),
    filter: (v, el) => openMenu(el, [{ icon: "list", label: "All work items", check: !S.filterMine, run: () => { S.filterMine = false; render(); } }, { icon: "user-round", label: "Assigned to me", check: S.filterMine, run: () => { S.filterMine = true; render(); } }]),
    display: (v, el) => openMenu(el, [{ icon: "circle-dot", label: "Group by status", check: S.groupBy === "status", run: () => { S.groupBy = "status"; render(); } }, { icon: "signal-high", label: "Group by priority", check: S.groupBy === "priority", run: () => { S.groupBy = "priority"; render(); } }]),
    wsmenu: (v, el) => openMenu(el, [{ lead: `<span class="ws-logo" style="width:16px;height:16px;font-size:9px;border-radius:4px">${D.workspace.initial}</span>`, label: D.workspace.name, check: true }, "-", { icon: "settings", label: "Workspace settings", run: () => go("settings/general") }, { icon: "users", label: "Invite members", run: () => go("settings/members") }, "-", { icon: "panel-left", label: "Collapse sidebar", kbd: ["["], run: () => A.collapse() }]),
    usermenu: (v, el) => openMenu(el, [{ icon: "user-round", label: "Profile", run: () => go("settings/profile") }, { icon: "palette", label: "Preferences", run: () => go("settings/preferences") }, { icon: "keyboard", label: "Keyboard shortcuts", run: openShortcuts }, "-", { icon: "log-out", label: "Sign out", run: () => toast("Signed out (prototype)") }]),
    "d-status": (v, el) => openMenu(el, D.statuses.map(s => ({ icon: s.icon, color: s.color, label: s.name, check: S.draft.status === s.id, run: () => { S.draft.status = s.id; refreshDraftChips(); } }))),
    "d-prio": (v, el) => openMenu(el, D.priorities.map(p => ({ icon: p.icon, color: p.color, label: p.name, check: S.draft.prio === p.id, run: () => { S.draft.prio = p.id; refreshDraftChips(); } }))),
    "d-who": (v, el) => whoMenu(el, S.draft.who, n => { S.draft.who = n; refreshDraftChips(); }),
    "d-label": (v, el) => labelMenu(el, S.draft.label, l => { S.draft.label = l; refreshDraftChips(); }),
    "d-project": (v, el) => openMenu(el, D.projects.map(p => ({ lead: `<span style="width:15px;text-align:center">${p.emoji}</span>`, label: p.name, check: S.draft.project === p.id, run: () => { S.draft.project = p.id; refreshDraftChips(); } }))),
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
    if (kind === "issue-title" && text) issue(id).title = text;
    if (kind === "issue-desc") issue(id).desc = text;
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
  });

  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); layer ? closeLayer() : openPalette(); return; }
    if (e.key === "Escape") { if (menuEl) closeMenu(); else if (layer) closeLayer(); else if (typing) e.target.blur(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && layer && S.draft && layer.querySelector("#dtitle")) { submitCreate(); return; }
    if (e.target.id === "prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(e.target.value); return; }
    if (e.target.id === "tutor-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tutorAsk(e.target.value); return; }
    if (e.target.id === "asst-prompt" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askPanel(e.target.value); return; }
    if (e.target.id === "dtitle" && e.key === "Enter") { e.preventDefault(); submitCreate(); return; }
    if (e.target.id === "todo-new" && e.key === "Enter" && e.target.value.trim()) {
      D.todos.unshift({ id: Date.now(), text: e.target.value.trim() }); render();
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
    if (e.key === "c") { e.preventDefault(); openCreate("issue"); }
    else if (e.key === "a") { e.preventDefault(); A["asst-toggle"](); }
    else if (e.key === "[") { S.collapsed = !S.collapsed; render(); }
    else if (/^[1-5]$/.test(e.key)) A.product(["plan", "work", "wiki", "files", "ai"][+e.key - 1]);
    else if (e.key === ",") A.product("settings");
  });

  // tick the running timer label without re-rendering the page
  setInterval(() => { const c = document.getElementById("timer-clock"); if (c && S.timer.running) c.textContent = fmtClock(Date.now() - S.timer.start); }, 1000);

  render();
})();
