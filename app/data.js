// Sample data for the Chameleon workspace prototype
// Every element lives in at most one folder (`folder`); folders form one global tree (`parent`).
// Families: plan = todos, goals (horizons) · content = notes, canvases, stickies, decks, pages, files, chats.
window.DATA = {
  version: 2, // bump when the shape changes; older saved data in localStorage is then ignored
  workspace: { name: "Chameleon", initial: "C", plan: "Business trial" },
  me: "Max Mann",
  people: {
    "Max Mann": "var(--kestrel-400)",
    "Ana Ruiz": "var(--green-500)",
    "Lee Park": "var(--amber-500)",
    "Jo Berg": "var(--violet-500)",
  },
  priorities: [
    { id: 0, name: "No priority", icon: "ellipsis", color: "var(--text-tertiary)" },
    { id: 1, name: "Urgent", icon: "circle-alert", color: "var(--danger)" },
    { id: 2, name: "High", icon: "signal-high", color: "var(--warning)" },
    { id: 3, name: "Medium", icon: "signal-medium", color: "var(--text-secondary)" },
    { id: 4, name: "Low", icon: "signal-low", color: "var(--text-tertiary)" },
  ],
  labels: {
    Accessibility: "var(--blue-500)", Editor: "var(--green-500)", Design: "var(--violet-500)",
    Enhancement: "var(--violet-500)", Integrations: "var(--amber-500)", Bug: "var(--red-500)",
    Mobile: "var(--blue-500)", AI: "var(--green-500)",
  },
  // global folder tree; kb: true/false overrides the parent, missing = inherited
  // project: set on project folders (target date + milestones)
  folders: [
    { id: "f-product", name: "Product", parent: null, icon: "box" },
    { id: "core", name: "Core product", parent: "f-product", emoji: "🚜", desc: "Keyboard-first list views and the double navigation.", project: { target: "15 Dec", milestones: [{ name: "Beta", start: "01 Oct", end: "15 Dec" }] } },
    { id: "pro", name: "Chameleon Pro", parent: "f-product", emoji: "🏎️", project: { target: "20 Jan", milestones: [{ name: "Billing GA", start: "20 Oct", end: "20 Jan" }] } },
    { id: "design", name: "Design", parent: "f-product", icon: "palette", color: "violet" },
    { id: "specs", name: "Specs", parent: "f-product", icon: "file-text" },
    { id: "f-marketing", name: "Marketing", parent: null, icon: "megaphone", color: "amber" },
    { id: "web", name: "Web development", parent: "f-marketing", emoji: "🧩", project: { target: "30 Nov", milestones: [{ name: "Relaunch", start: "15 Sep", end: "30 Nov" }] } },
    { id: "media", name: "Media", parent: "f-marketing", icon: "image" },
    { id: "f-research", name: "Research", parent: null, icon: "flask-conical", color: "green" },
    { id: "disc", name: "Discover", parent: "f-research", emoji: "☎️", project: { target: "15 Dec", milestones: [{ name: "Research", start: "01 Nov", end: "15 Dec" }] } },
    { id: "f-learning", name: "Learning", parent: null, icon: "graduation-cap", color: "blue", kb: true, desc: "Everything I study — part of the Knowledge Base." },
    { id: "l-start", name: "Getting started", parent: "f-learning" },
    { id: "l-guides", name: "Guides", parent: "f-learning" },
    { id: "l-design", name: "Design system", parent: "l-guides", icon: "palette" },
    { id: "l-updates", name: "Updates", parent: "f-learning", kb: false },
    { id: "f-personal", name: "Personal", parent: null, icon: "user-round" },
  ],
  todos: [
    { id: "t-128", text: "Keyboard navigation for list views", due: "14 Oct", prio: 2, folder: "core" },
    { id: "t-121", text: "Inline status picker in rows", due: "18 Oct", prio: 3, folder: "core" },
    { id: "t-122", text: "Picker keyboard shortcuts", due: "18 Oct", prio: 3, folder: "core" },
    { id: "t-117", text: "Empty state copy for Views", due: "12 Oct", prio: 4, folder: "core" },
    { id: "t-112", text: "Bulk edit labels from selection", due: "29 Oct", prio: 1, folder: "core" },
    { id: "t-109", text: "Sync assignee changes from GitHub", due: "03 Nov", prio: 3, folder: "core" },
    { id: "t-104", text: "Redesign the create dialog", due: "13 Oct", prio: 2, folder: "core" },
    { id: "t-96", text: "Saved filters per view", prio: 0, folder: "core" },
    { id: "t-88", text: "Crash when pasting a table into a note", prio: 1, folder: "core" },
    { id: "t-81", text: "Voice input for AI chat", prio: 4, folder: "core" },
    { id: "t-74", text: "Collapsible sidebar sections", due: "02 Oct", prio: 3, folder: "core", done: true },
    { id: "t-73", text: "Pinned pages on top of every sidebar", due: "06 Oct", prio: 3, folder: "core", done: true },
    { id: "t-w31", text: "Marketing site navigation", due: "16 Oct", prio: 2, folder: "web" },
    { id: "t-w28", text: "Pricing page responsive layout", due: "21 Oct", prio: 3, folder: "web" },
    { id: "t-w22", text: "Footer link audit", due: "01 Oct", prio: 4, folder: "web", done: true },
    { id: "t-w20", text: "New hero section", due: "05 Oct", prio: 2, folder: "web", done: true },
    { id: "t-p9", text: "Seat-based billing model", due: "04 Nov", prio: 2, folder: "pro" },
    { id: "t-p4", text: "SSO via SAML", prio: 0, folder: "pro" },
    { id: "t1", text: "Review sidebar spacing with Ana", due: "13 Oct", prio: 0, folder: "design" },
    { id: "t2", text: "Write release notes for Cycle 43", due: "17 Oct", prio: 0, folder: "web" },
    { id: "t3", text: "Reply to Lee about the label menu", prio: 0, folder: null },
    { id: "t4", text: "Book design review room", prio: 0, folder: "f-personal", done: true },
  ],
  // personal notifications from the app itself (no collaboration yet)
  inbox: [
    { id: 1, kind: "reminder", todo: "t-104", body: "Due today", time: "12m", unread: true },
    { id: 2, kind: "reminder", todo: "t-117", body: "Overdue since 12 Oct", time: "1h", unread: true },
    { id: 3, kind: "study", title: "Flashcards ready for review", body: "Kestrel design tokens hasn't been studied for 2 days", time: "2h", unread: true, link: "wiki/flashcards" },
    { id: 4, kind: "milestone", title: "Relaunch ends in 48 days", body: "Web development is at 50%", time: "3h", link: "folder/web" },
    { id: 5, kind: "system", title: "Welcome to Chameleon", body: "Start with the keyboard shortcuts guide", time: "4h", link: "wiki/start" },
    { id: 6, kind: "time", title: "Weekly time summary", body: "You logged 5.5h on Keyboard navigation so far this week", time: "1d", link: "plan/time" },
    { id: 7, kind: "done", todo: "t-74", body: "Marked done", time: "1d" },
  ],
  pages: [
    { id: "start", icon: "book-open", title: "Getting started", folder: "l-start", body: ["Chameleon keeps planning, notes, learning and AI help in one place. The rail on the left switches between products; the sidebar next to it changes with the product you are in.", "Press C anywhere to create something, Ctrl+S to search, and [ to collapse the sidebar."] },
    { id: "design", icon: "palette", title: "Design system", folder: "l-design", body: ["The interface uses Kestrel: a dark-first, dense system with a near-black neutral ramp, one muted slate accent and Geist type.", "Radii are 4 / 6 / 8 / 12. Rows are 38px, headers 48px, nav items 30px."] },
    { id: "process", icon: "workflow", title: "Team process", folder: "l-guides", body: ["Work moves from open to done. Keep titles short and imperative.", "Cycles run two weeks. Unfinished work rolls over automatically."] },
    { id: "release", icon: "rocket", title: "Release notes", folder: "l-updates", body: ["Double navigation: product rail plus contextual sidebar.", "Light theme, command palette and one global folder tree."] },
  ],
  horizons: [
    { id: "g1", h: "now", title: "Ship keyboard-first list views", folder: "core", conf: "on" },
    { id: "g2", h: "now", title: "Relaunch marketing site", folder: "web", conf: "risk" },
    { id: "g3", h: "next", title: "Seat-based billing", folder: "pro", conf: "on" },
    { id: "g4", h: "next", title: "Offline mode for the editor", folder: "core", conf: "idea" },
    { id: "g5", h: "later", title: "Customer research programme", folder: "disc", conf: "idea" },
  ],
  timeEntries: [
    { todo: "t-128", hours: [3, 2.5, 0, 0, 0, 0, 0] },
    { todo: "t-121", hours: [4, 3, 0, 0, 0, 0, 0] },
    { todo: "t-112", hours: [2, 1.5, 0, 0, 0, 0, 0] },
    { todo: "t-w31", hours: [1.5, 2, 0, 0, 0, 0, 0] },
    { todo: "t-81", hours: [2, 0, 0, 0, 0, 0, 0] },
  ],
  notes: [
    { id: "n1", title: "Sidebar ideas", body: "Pinned pages on top of every sidebar.\nFolders instead of fixed sections.\nKeep the rail labels short.", labels: ["Design"], updated: "2h", folder: "core" },
    { id: "n2", title: "Meeting notes 13 Oct", body: "Agreed to ship the double navigation in Cycle 43. Ana owns the inline status picker.", labels: [], updated: "1d", folder: "web" },
    { id: "n3", title: "Reading list", body: "Linear method, Shape Up, Refactoring UI.", labels: ["Enhancement", "AI"], updated: "4d", folder: "f-personal" },
  ],
  canvases: [
    { id: "b1", name: "Product map", updated: "1h", folder: "core", items: [
      { id: "cv1", kind: "card", text: "Double navigation", x: 60, y: 60, w: 220 },
      { id: "cv2", kind: "card", text: "Pinned pages: Inbox, Calendar, ToDos", x: 340, y: 40, w: 220 },
      { id: "cv3", kind: "sticky", text: "Ask Ana about icon set", x: 120, y: 220, w: 180, color: "amber" },
      { id: "cv4", kind: "sticky", text: "Folders everywhere?", x: 400, y: 210, w: 180, color: "green" },
    ] },
    { id: "b2", name: "Retro board", updated: "3d", folder: null, items: [
      { id: "cv5", kind: "card", text: "What went well", x: 40, y: 40, w: 220 },
      { id: "cv6", kind: "card", text: "What to improve", x: 300, y: 40, w: 220 },
      { id: "cv7", kind: "sticky", text: "Faster reviews", x: 60, y: 140, w: 180, color: "green" },
      { id: "cv8", kind: "sticky", text: "Too many meetings", x: 320, y: 140, w: 180, color: "red" },
    ] },
  ],
  stickies: [
    { id: "s1", text: "Release notes due Friday", color: "amber", updated: "1h", folder: "web" },
    { id: "s2", text: "Review Horizons with Lee", color: "blue", updated: "3h", folder: null },
    { id: "s3", text: "Table paste crash: needs a repro", color: "red", updated: "1d", folder: "core" },
    { id: "s4", text: "Idea: weekly digest in AI panel", color: "violet", updated: "2d", folder: null },
  ],
  decks: [
    { id: "d1", name: "Kestrel design tokens", last: "2d", folder: "l-design", cards: [
      { q: "What is the base UI font size?", a: "13px", known: true },
      { q: "Which font is used for IDs and counts?", a: "Geist Mono", known: true },
      { q: "How tall is a list row?", a: "38px", known: true },
      { q: "Which radius do dialogs use?", a: "12px" },
      { q: "What is the accent colour called?", a: "Kestrel slate", known: true },
    ] },
    { id: "d2", name: "Team process", last: "5d", folder: "l-guides", cards: [
      { q: "How long does a cycle run?", a: "Two weeks", known: true },
      { q: "What happens to unfinished work at cycle end?", a: "It rolls over" },
      { q: "Where do finished ToDos go?", a: "Done", known: true },
      { q: "Which key creates something new?", a: "C", known: true },
    ] },
  ],
  tutorLog: [],
  studyMinutes: [14, 9, 0, 0, 0, 0, 0], // Mon–Sun of the current week
  learnLog: [
    { type: "practice", deck: "Mixed decks", score: 5, total: 6, when: "3d" },
    { type: "study", deck: "Team process", score: 3, total: 4, when: "5d" },
    { type: "study", deck: "Kestrel design tokens", score: 4, total: 5, when: "1w" },
  ],
  knowledge: [
    { id: "kb-brand", name: "Brand & design", files: ["Sidebar redesign.fig", "Kestrel tokens.css", "Double nav reference.png"] },
    { id: "kb-product", name: "Product specs", files: ["Billing model.pdf", "Q4 roadmap.xlsx"] },
  ],
  files: [
    { id: "fl1", name: "Sidebar redesign.fig", folder: "design", icon: "pen-tool", owner: "Max Mann", modified: "12m", size: "4.2 MB", starred: true },
    { id: "fl2", name: "Kestrel tokens.css", folder: "design", icon: "file-code", owner: "Ana Ruiz", modified: "2h", size: "6 KB" },
    { id: "fl3", name: "Double nav reference.png", folder: "media", icon: "file-image", owner: "Max Mann", modified: "4h", size: "820 KB", starred: true },
    { id: "fl4", name: "Billing model.pdf", folder: "pro", icon: "file-text", owner: "Lee Park", modified: "1d", size: "1.1 MB", shared: true },
    { id: "fl5", name: "Q4 roadmap.xlsx", folder: "specs", icon: "file-spreadsheet", owner: "Jo Berg", modified: "2d", size: "240 KB", shared: true },
    { id: "fl6", name: "Onboarding video.mp4", folder: "media", icon: "file-video", owner: "Ana Ruiz", modified: "5d", size: "88 MB" },
    { id: "fl8", name: "Release assets.zip", folder: "media", icon: "file-archive", owner: "Max Mann", modified: "1w", size: "12 MB" },
  ],
  // one trash for every element type: { type, item, at } — restored items go back to their folder if it still exists
  trash: [
    { type: "file", at: "2d", item: { id: "fl7", name: "Old logo draft.png", folder: "design", icon: "file-image", owner: "Max Mann", modified: "2w", size: "1.4 MB" } },
  ],
  chats: [
    { id: "c1", title: "Summarise this week", log: [], folder: null },
    { id: "c2", title: "Draft release notes", log: [], folder: "web" },
  ],
};
