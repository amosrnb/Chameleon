// Demo data: fills the empty workspace so every page has something to show.
// Remove the <script src="demo.js"> line in index.html to go back to an empty workspace.
// The prototype "today" is 13 Oct 2026 (see TODAY in app.js); due dates below are relative to it.
Object.assign(window.DATA, {
  version: "4-demo", // own version so saved empty data is replaced, and demo saves are dropped once this file is gone
  people: {
    "Max Mann": "var(--kestrel-400)",
  },
  folders: [
    { id: "f-product", name: "Product", parent: null, icon: "box" },
    { id: "core", name: "Core product", parent: "f-product", emoji: "🚜", desc: "Keyboard-first list views and the double navigation.", project: { target: "15 Dec", milestones: [{ name: "Alpha", start: "15 Sep", end: "24 Oct" }, { name: "Beta", start: "25 Oct", end: "15 Dec" }] } },
    { id: "pro", name: "Chameleon Pro", parent: "f-product", emoji: "🏎️", project: { target: "20 Jan", milestones: [{ name: "Billing GA", start: "20 Oct", end: "20 Jan" }] } },
    { id: "design", name: "Design", parent: "f-product", icon: "palette", color: "violet" },
    { id: "specs", name: "Specs", parent: "f-product", icon: "file-text" },
    { id: "f-marketing", name: "Marketing", parent: null, icon: "megaphone", color: "amber" },
    { id: "web", name: "Web development", parent: "f-marketing", emoji: "🧩", project: { target: "30 Nov", milestones: [{ name: "Content freeze", start: "01 Oct", end: "17 Oct" }, { name: "Relaunch", start: "18 Oct", end: "30 Nov" }] } },
    { id: "media", name: "Media", parent: "f-marketing", icon: "image" },
    { id: "f-research", name: "Research", parent: null, icon: "flask-conical", color: "green" },
    { id: "disc", name: "Discover", parent: "f-research", emoji: "☎️", project: { target: "15 Dec", milestones: [{ name: "Interviews", start: "01 Nov", end: "15 Dec" }] } },
    { id: "f-learning", name: "Learning", parent: null, icon: "graduation-cap", color: "blue", kb: true, desc: "Everything I study — part of the Knowledge Base." },
    { id: "l-start", name: "Getting started", parent: "f-learning" },
    { id: "l-guides", name: "Guides", parent: "f-learning" },
    { id: "l-design", name: "Design system", parent: "l-guides", icon: "palette" },
    { id: "l-updates", name: "Updates", parent: "f-learning", kb: false },
    { id: "f-personal", name: "Personal", parent: null, icon: "user-round" },
  ],
  todos: [
    // overdue
    { id: "t-117", text: "Empty state copy for Views", due: "12 Oct", prio: 4, folder: "core" },
    { id: "t-w26", text: "Send hero copy to review", due: "09 Oct", prio: 2, folder: "web" },
    // today
    { id: "t-104", text: "Redesign the create dialog", due: "13 Oct", prio: 2, folder: "core" },
    { id: "t1", text: "Review sidebar spacing", due: "13 Oct", prio: 0, folder: "design" },
    { id: "t-88", text: "Crash when pasting a table into a note", due: "13 Oct", prio: 1, folder: "core" },
    // upcoming
    { id: "t-128", text: "Keyboard navigation for list views", due: "14 Oct", prio: 2, folder: "core" },
    { id: "t-w31", text: "Marketing site navigation", due: "16 Oct", prio: 2, folder: "web" },
    { id: "t2", text: "Write release notes for Cycle 43", due: "17 Oct", prio: 3, folder: "web" },
    { id: "t-121", text: "Inline status picker in rows", due: "18 Oct", prio: 3, folder: "core" },
    { id: "t-122", text: "Picker keyboard shortcuts", due: "18 Oct", prio: 3, folder: "core" },
    { id: "t-w28", text: "Pricing page responsive layout", due: "21 Oct", prio: 3, folder: "web" },
    { id: "t5", text: "Dentist appointment", due: "22 Oct", prio: 0, folder: "f-personal" },
    { id: "t-d3", text: "Draft interview guide", due: "24 Oct", prio: 3, folder: "disc" },
    { id: "t-112", text: "Bulk edit labels from selection", due: "29 Oct", prio: 1, folder: "core" },
    { id: "t-109", text: "Sync assignee changes from GitHub", due: "03 Nov", prio: 3, folder: "core" },
    { id: "t-p9", text: "Seat-based billing model", due: "04 Nov", prio: 2, folder: "pro" },
    // no date
    { id: "t-96", text: "Saved filters per view", prio: 0, folder: "core" },
    { id: "t-81", text: "Voice input for AI chat", prio: 4, folder: "core" },
    { id: "t-p4", text: "SSO via SAML", prio: 0, folder: "pro" },
    { id: "t3", text: "Reply about the label menu", prio: 0, folder: null },
    // done
    { id: "t-74", text: "Collapsible sidebar sections", due: "02 Oct", prio: 3, folder: "core", done: true },
    { id: "t-73", text: "Pinned pages on top of every sidebar", due: "06 Oct", prio: 3, folder: "core", done: true },
    { id: "t-w22", text: "Footer link audit", due: "01 Oct", prio: 4, folder: "web", done: true },
    { id: "t-w20", text: "New hero section", due: "05 Oct", prio: 2, folder: "web", done: true },
    { id: "t-w19", text: "Pick the new type scale", due: "08 Oct", prio: 3, folder: "web", done: true },
    { id: "t4", text: "Book design review room", prio: 0, folder: "f-personal", done: true },
  ],
  inbox: [
    { id: 1, kind: "reminder", todo: "t-104", body: "Due today", time: "12m", unread: true },
    { id: 2, kind: "reminder", todo: "t-117", body: "Overdue since 12 Oct", time: "1h", unread: true },
    { id: 3, kind: "reminder", title: "Design review", body: "Starts at 14:00 · Room 2", time: "1h", unread: true, link: "pin/calendar" },
    { id: 4, kind: "study", title: "Flashcards ready for review", body: "Kestrel design tokens hasn't been studied for 2 days", time: "2h", unread: true, link: "wiki/flashcards" },
    { id: 5, kind: "milestone", title: "Alpha ends in 11 days", body: "Core product is at 17%", time: "3h", link: "folder/core" },
    { id: 6, kind: "milestone", title: "Content freeze in 4 days", body: "Web development is at 50%", time: "3h", link: "folder/web" },
    { id: 7, kind: "system", title: "Welcome to Chameleon", body: "Start with the keyboard shortcuts guide", time: "4h", link: "wiki/start" },
    { id: 8, kind: "time", title: "Weekly time summary", body: "You logged 5.5h on Keyboard navigation so far this week", time: "1d", link: "plan/time" },
    { id: 9, kind: "done", todo: "t-74", body: "Marked done", time: "1d" },
    { id: 10, kind: "done", todo: "t-w19", body: "Marked done", time: "5d" },
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
    { todo: "t-121", hours: [2, 1, 0, 0, 0, 0, 0] },
    { todo: "t-104", hours: [0, 1.5, 0, 0, 0, 0, 0] },
    { todo: "t-w31", hours: [1.5, 0.5, 0, 0, 0, 0, 0] },
  ],
  notes: [
    { id: "n1", title: "Sidebar ideas", body: "Pinned pages on top of every sidebar.\nFolders instead of fixed sections.\nKeep the rail labels short.", labels: ["Design"], updated: "2h", folder: "core" },
    { id: "n2", title: "Meeting notes 13 Oct", body: "Agreed to ship the double navigation in Cycle 43.", labels: [], updated: "1d", folder: "web" },
    { id: "n3", title: "Reading list", body: "Linear method, Shape Up, Refactoring UI.", labels: ["Enhancement", "AI"], updated: "4d", folder: "f-personal" },
  ],
  canvases: [
    { id: "b1", name: "Product map", updated: "1h", folder: "core", items: [
      { id: "cv1", kind: "card", text: "Double navigation", x: 60, y: 60, w: 220 },
      { id: "cv2", kind: "card", text: "Pinned pages: Inbox, Calendar, ToDos", x: 340, y: 40, w: 220 },
      { id: "cv3", kind: "sticky", text: "Settle the icon set", x: 120, y: 220, w: 180, color: "amber" },
      { id: "cv4", kind: "sticky", text: "Folders everywhere?", x: 400, y: 210, w: 180, color: "green" },
    ] },
  ],
  stickies: [
    { id: "s1", text: "Release notes due Friday", color: "amber", updated: "1h", folder: "web" },
    { id: "s2", text: "Table paste crash: needs a repro", color: "red", updated: "1d", folder: "core" },
    { id: "s3", text: "Idea: weekly digest in AI panel", color: "violet", updated: "2d", folder: null },
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
      { q: "Which key creates something new?", a: "C" },
    ] },
  ],
  studyMinutes: [14, 9, 0, 0, 0, 0, 0],
  events: [
    { id: "e1", title: "Standup", cal: "cal-me", date: "2026-10-12", start: 570, end: 585, reminders: [10], guests: [], exdates: [], rrule: { freq: "weekly", interval: 1, days: [1, 2, 3, 4, 5] } },
    { id: "e2", title: "Design review", cal: "cal-me", date: "2026-10-13", start: 840, end: 900, loc: "Room 2", reminders: [10], guests: [], exdates: [] },
    { id: "e3", title: "Create dialog", type: "focus", todo: "t-104", cal: "cal-me", date: "2026-10-13", start: 600, end: 720, reminders: [], guests: [], exdates: [] },
    { id: "e4", title: "Planning Cycle 44", cal: "cal-me", date: "2026-10-15", start: 660, end: 750, reminders: [10], guests: [], exdates: [] },
  ],
});
