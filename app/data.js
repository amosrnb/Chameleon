// Data for the Chameleon workspace prototype (starts empty)
// Every element lives in at most one folder (`folder`); folders form one global tree (`parent`).
// Families: plan = todos, events, timelines, goals (horizons) · content = notes, canvases, stickies, decks, pages, files, chats.
window.DATA = {
  version: 4, // bump when the shape changes; older saved data in localStorage is then ignored
  workspace: { name: "Chameleon", initial: "C", plan: "Business trial" },
  me: "Max Mann",
  people: {
    "Max Mann": "var(--kestrel-400)",
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
  folders: [],
  todos: [],
  // personal notifications from the app itself (no collaboration yet)
  inbox: [],
  pages: [],
  // goals: { id, title, desc, page, h (column id), conf, folder } — page and column come from hzPages
  horizons: [],
  // horizon pages: { id, name, cols: [{ id, name, sub }] } — any number of pages and columns; empty = one default page
  hzPages: [],
  // timelines: { id, name, start, end (ISO days), folder } — shown as bars in Plan › Timelines
  timelines: [],
  timeEntries: [],
  notes: [],
  canvases: [],
  stickies: [],
  decks: [],
  tutorLog: [],
  studyMinutes: [0, 0, 0, 0, 0, 0, 0], // Mon–Sun of the current week
  learnLog: [],
  knowledge: [],
  files: [],
  // one trash for every element type: { type, item, at } — restored items go back to their folder if it still exists
  trash: [],
  chats: [],
  // calendar: dates are ISO days ("2026-10-13"), times are minutes after midnight (570 = 09:30)
  // rrule: { freq: daily|weekly|monthly|yearly, interval, days (0 = Sun … 6 = Sat, weekly only), until, count }
  // type: event | focus; todo links a time block to a ToDo; org is set on events someone else invited me to, rsvp is my answer there (yes/no/maybe)
  calendars: [
    { id: "cal-me", name: "Max Mann", color: "blue" },
  ],
  calPrefs: { weekStart: 1, weekends: true, weekNums: false, h12: false, duration: 60, dimPast: true, declined: true, tasks: true, doneTasks: true, workStart: 480, workEnd: 1080, reminder: 10, tasksHidden: false },
  events: [],
};
