// Demo dataset. The prototype is pinned to the week of Mon, Oct 5 2026.
import type { IconName } from '../components/Icon';
import type { Block, Deck, Doc, DocKind, DocStatus, Exam, Folder, Lesson, LibSetting, Proposal, Todo } from './types';

/** Calendar grid: 48px per hour, 7:00 to 17:00. */
export const HOUR_PX = 48;
export const DAY_START = 7;
export const DAY_END = 17;
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DATES = [5, 6, 7, 8, 9, 10, 11];
export const TODAY_LABEL = 'Monday, Oct 5';
export const TODAY_DATE = 'Mon, Oct 5';
export const fmtH = (h: number) => Math.floor(h) + ':' + (h % 1 ? '30' : '00');

export const FOLDERS: Folder[] = [
  { id: 'y2627', name: 'School year 2026/27', type: 'School year', icon: 'CalendarRange', parent: null },
  { id: 'maths', name: 'Maths', type: 'Subject', icon: 'Sigma', tint: 'sky', parent: 'y2627', teacher: 'Mr Becker' },
  { id: 'm-analysis', name: 'Analysis', type: 'Folder', icon: 'Folder', parent: 'maths' },
  { id: 'm-stoch', name: 'Stochastics', type: 'Folder', icon: 'Folder', parent: 'maths' },
  { id: 'm-hw', name: 'Homework', type: 'Folder', icon: 'Folder', parent: 'maths' },
  { id: 'm-proj', name: 'Survey project', type: 'Project', icon: 'Target', parent: 'maths' },
  { id: 'bio', name: 'Biology', type: 'Subject', icon: 'Leaf', tint: 'sage', parent: 'y2627', teacher: 'Ms Okafor' },
  { id: 'b-cells', name: 'Cells', type: 'Folder', icon: 'Folder', parent: 'bio' },
  { id: 'eng', name: 'English', type: 'Subject', icon: 'BookOpen', tint: 'lilac', parent: 'y2627', teacher: 'Ms Hale' },
  { id: 'hist', name: 'History', type: 'Subject', icon: 'Landmark', tint: 'sand', parent: 'y2627', teacher: 'Mr Lindqvist' },
  { id: 'phys', name: 'Physics', type: 'Subject', icon: 'Atom', tint: 'blush', parent: 'y2627', teacher: 'Ms Romero' },
  { id: 'y2526', name: 'School year 2025/26', type: 'School year', icon: 'Archive', parent: null, archived: true },
  { id: 'library', name: 'Library', type: 'Library', icon: 'Library', parent: null },
  { id: 'l-maths', name: 'Mathematics', type: 'Library area', icon: 'Sigma', tint: 'sky', parent: 'library', linked: 'maths' },
  { id: 'l-bio', name: 'Biology', type: 'Library area', icon: 'Leaf', tint: 'sage', parent: 'library', linked: 'bio' },
  { id: 'l-eng', name: 'English', type: 'Library area', icon: 'BookOpen', tint: 'lilac', parent: 'library', linked: 'eng' },
  { id: 'l-hist', name: 'History', type: 'Library area', icon: 'Landmark', tint: 'sand', parent: 'library', linked: 'hist' },
  { id: 'l-phys', name: 'Physics', type: 'Library area', icon: 'Atom', tint: 'blush', parent: 'library', linked: 'phys' },
];

export const LESSONS: Lesson[] = (
  [
    ['maths', 0, 8, 9.5, 'R 204'],
    ['eng', 0, 11, 12.5, 'R 112'],
    ['bio', 1, 9, 10.5, 'Lab 2'],
    ['phys', 1, 13, 14.5, 'Lab 1'],
    ['eng', 2, 8, 9.5, 'R 112'],
    ['hist', 2, 10, 11.5, 'R 008'],
    ['phys', 3, 8, 9.5, 'Lab 1'],
    ['maths', 3, 10, 11.5, 'R 204'],
    ['bio', 4, 11, 12.5, 'Lab 2'],
    ['hist', 4, 13, 14, 'R 008'],
  ] as const
).map(([sub, day, start, end, room]) => ({ sub, day, start, end, room }));

export const KIND_ICON: Record<DocKind, IconName> = { 'Lesson notes': 'PenLine', Note: 'StickyNote', PDF: 'FileText', Deck: 'Layers', Word: 'FileType' };
export const NOTE_KINDS: DocKind[] = ['Lesson notes', 'Note'];

export const DOCS: Doc[] = [
  { id: 'n1', title: 'Chain rule', kind: 'Lesson notes', date: 'Thu, Oct 1', edited: 'Thu', folder: 'm-analysis', status: 'open' },
  { id: 'p1', title: 'Derivatives worksheet.pdf', kind: 'PDF', edited: 'Thu', folder: 'm-analysis' },
  { id: 'k1', title: 'Derivative rules', kind: 'Deck', deck: 'd1', edited: 'Fri', folder: 'm-analysis' },
  { id: 'n3', title: 'Power rule', kind: 'Lesson notes', date: 'Mon, Sep 28', edited: 'Sep 28', folder: 'm-analysis', status: 'integrated' },
  { id: 'n4', title: 'Tree diagrams', kind: 'Lesson notes', date: 'Tue, Sep 29', edited: 'Yesterday', folder: 'm-stoch', status: 'changed' },
  { id: 'n8', title: 'Test dates', kind: 'Note', edited: 'Sep 21', folder: 'maths', status: 'declined', lib: 'no' },
  { id: 'p2', title: 'Survey plan.docx', kind: 'Word', edited: 'Sep 30', folder: 'm-proj' },
  { id: 'n5', title: 'Cell membrane', kind: 'Lesson notes', date: 'Tue, Sep 29', edited: 'Tue', folder: 'b-cells', status: 'open' },
  { id: 'k2', title: 'Cell organelles', kind: 'Deck', deck: 'd2', edited: 'Sep 24', folder: 'b-cells' },
  { id: 'n6', title: 'Macbeth, Act 1', kind: 'Lesson notes', date: 'Wed, Sep 30', edited: 'Wed', folder: 'eng', status: 'open' },
  { id: 'k3', title: 'Macbeth quotes', kind: 'Deck', deck: 'd3', edited: 'Sep 30', folder: 'eng' },
  { id: 'n7', title: 'Velocity', kind: 'Lesson notes', date: 'Thu, Oct 1', edited: 'Thu', folder: 'phys', status: 'open' },
  { id: 'n9', title: 'Causes of WW1', kind: 'Lesson notes', date: 'Wed, Sep 30', edited: 'Wed', folder: 'hist', status: 'integrated' },
];

export const BLOCKS: Record<string, Block[]> = {
  n1: [
    { t: 'h2', x: 'When to use it' },
    { t: 'p', x: 'Use the chain rule when one function sits inside another: f(x) = g(h(x)).' },
    { t: 'callout', x: 'f′(x) = g′(h(x)) · h′(x). Outer derivative times inner derivative.' },
    { t: 'h2', x: 'Examples from the board' },
    { t: 'ul', x: 'f(x) = (3x + 1)⁵ → f′(x) = 5(3x + 1)⁴ · 3 = 15(3x + 1)⁴' },
    { t: 'gap', x: 'second example from the board', sugg: 'f(x) = (2x² + 1)³ → f′(x) = 3(2x² + 1)² · 4x = 12x(2x² + 1)²', src: 'From Derivatives worksheet.pdf, task 2 (same day)' },
    { t: 'h2', x: 'Organisation' },
    { t: 'p', x: 'Test on Friday: power rule, chain rule, product rule.' },
  ],
  n3: [
    { t: 'p', x: 'For f(x) = xⁿ the derivative is f′(x) = n·xⁿ⁻¹.' },
    { t: 'callout', x: 'Bring the exponent down, then reduce it by one.' },
    { t: 'ul', x: 'f(x) = x³ → f′(x) = 3x²' },
  ],
  n4: [
    { t: 'p', x: 'Multiply along a branch, add across branches.' },
    { t: 'h2', x: 'Added on Sunday' },
    { t: 'ul', x: 'Two coin tosses: P(HH) = ½ · ½ = ¼' },
  ],
  n5: [
    { t: 'p', x: 'The cell membrane is a phospholipid bilayer with embedded proteins.' },
    { t: 'ul', x: 'Passive transport: diffusion, osmosis' },
    { t: 'ul', x: 'Active transport needs energy (ATP)' },
    { t: 'gap', x: 'labels for the membrane diagram', alt: 'Phospholipid head, fatty acid tail, channel protein, carrier protein', src: 'From Cell membrane worksheet, figure 1' },
  ],
  n6: [
    { t: 'p', x: 'The witches greet Macbeth as Thane of Cawdor and future king.' },
    { t: 'callout', x: 'Theme: ambition and what it costs.' },
    { t: 'ul', x: 'Lady Macbeth questions his courage (1.7)' },
  ],
  n7: [
    { t: 'p', x: 'Velocity is displacement per time: v = s / t.' },
    { t: 'callout', x: 'Unit m/s. Divide km/h by 3.6 to get m/s.' },
  ],
  n8: [{ t: 'p', x: 'Maths test Fri, Oct 9. Physics test Wed, Oct 7.' }],
  n9: [
    { t: 'p', x: 'Long-term causes: militarism, alliances, imperialism, nationalism.' },
    { t: 'ul', x: 'Trigger: assassination in Sarajevo, June 1914' },
  ],
};

/** Simulated AI proposals shown when a note is marked as done. */
export const PROPOSALS: Record<string, Proposal> = {
  n1: {
    topic: 'Mathematics / Analysis / Derivatives',
    add: ['Chain rule: outer derivative times inner derivative', 'Worked examples (3x + 1)⁵ and (2x² + 1)³'],
    existing: ['Notation f′(x)', 'Power rule'],
    skip: ['Test on Friday (organisational)'],
    derived: { label: 'Create the event “Maths test” on Fri, Oct 9', exam: { id: 'e2', title: 'Maths test', sub: 'maths', day: 4 } },
  },
  n4: { topic: 'Mathematics / Stochastics / Probability', add: ['New since last time: two coin tosses, P(HH) = ¼'], existing: ['Multiply along a branch, add across branches'], skip: [] },
  n5: { topic: 'Biology / Cells / Cell membrane', add: ['Phospholipid bilayer with embedded proteins', 'Passive and active transport'], existing: [], skip: [] },
  n6: { topic: 'English / Literature / Macbeth', add: ['Act 1: the prophecy', 'Theme: ambition and what it costs'], existing: ['Lady Macbeth (character)'], skip: [] },
  n7: { topic: 'Physics / Mechanics / Velocity', add: ['v = s / t', 'Converting km/h to m/s'], existing: [], skip: [] },
};

export const DECKS: Deck[] = [
  {
    id: 'd1', name: 'Derivative rules', folder: 'm-analysis', due: 4,
    cards: [
      { q: 'Power rule: f(x) = xⁿ. What is f′(x)?', a: 'f′(x) = n·xⁿ⁻¹', sec: 'Derivatives › Power rule' },
      { q: 'Chain rule: f(x) = g(h(x)). What is f′(x)?', a: 'f′(x) = g′(h(x)) · h′(x)', sec: 'Derivatives › Chain rule' },
      { q: 'Differentiate f(x) = (3x + 1)⁵', a: 'f′(x) = 15(3x + 1)⁴', sec: 'Derivatives › Chain rule' },
      { q: 'What is the derivative of sin(x)?', a: 'cos(x)', sec: 'Derivatives › Trigonometric functions' },
      { q: 'What is the derivative of eˣ?', a: 'eˣ', sec: 'Derivatives › Exponential functions' },
      { q: 'Product rule: f(x) = u(x) · v(x). What is f′(x)?', a: 'f′ = u′v + uv′', sec: 'Derivatives › Product rule' },
    ],
  },
  {
    id: 'd2', name: 'Cell organelles', folder: 'b-cells', due: 3,
    cards: [
      { q: 'What do mitochondria do?', a: 'Cellular respiration: they release energy as ATP', sec: 'Cells › Organelles' },
      { q: 'Where are proteins made?', a: 'At the ribosomes', sec: 'Cells › Organelles' },
      { q: 'What does the nucleus contain?', a: 'The DNA. It controls the cell.', sec: 'Cells › Organelles' },
      { q: 'What does the cell membrane control?', a: 'What enters and leaves the cell', sec: 'Cells › Cell membrane' },
    ],
  },
  {
    id: 'd3', name: 'Macbeth quotes', folder: 'eng', due: 0,
    cards: [
      { q: '“Fair is foul, and foul is fair.” Who says it?', a: 'The witches, Act 1 Scene 1', sec: 'Macbeth › Act 1' },
      { q: '“Look like th’ innocent flower, but be the serpent under’t.” Who says it, to whom?', a: 'Lady Macbeth to Macbeth, Act 1 Scene 5', sec: 'Macbeth › Lady Macbeth' },
      { q: '“Is this a dagger which I see before me?” Which act?', a: 'Act 2 Scene 1, Macbeth', sec: 'Macbeth › Act 2' },
    ],
  },
];

export const TODOS: Todo[] = [
  { id: 't3', title: 'Lab report: osmosis', kind: 'Homework', folder: 'b-cells', due: 'Fri, Oct 2', bucket: 'overdue', status: 'inprogress', subs: [{ x: 'Write up the method', done: true }, { x: 'Results table', done: false }, { x: 'Conclusion', done: false }] },
  { id: 't9', title: 'Velocity worksheet', kind: 'Homework', folder: 'phys', due: 'Sat, Oct 3', bucket: 'overdue', status: 'open', subs: [] },
  { id: 't2', title: 'Read Macbeth Act 2', kind: 'Homework', folder: 'eng', due: 'Today', bucket: 'today', status: 'open', subs: [] },
  { id: 't6', title: 'Bring signed trip form', kind: 'Todo', folder: 'hist', due: 'Today', bucket: 'today', status: 'open', subs: [] },
  { id: 't4', title: 'Draft survey questions', kind: 'Todo', folder: 'm-proj', due: 'Wed', bucket: 'upcoming', status: 'open', subs: [{ x: '10 questions max', done: false }, { x: 'Ask Mr Becker for feedback', done: false }] },
  { id: 't7', title: 'Timeline: causes of WW1', kind: 'Homework', folder: 'hist', due: 'Wed', bucket: 'upcoming', status: 'open', subs: [] },
  { id: 't1', title: 'Exercises p. 84, no. 3–7', kind: 'Homework', folder: 'm-hw', due: 'Thu', bucket: 'upcoming', status: 'open', subs: [] },
  { id: 't5', title: 'Revise chain rule for the test', kind: 'Todo', folder: 'm-analysis', due: 'Thu', bucket: 'upcoming', status: 'open', subs: [], sched: { day: 2, start: 16 } },
  { id: 't8', title: 'Vocabulary list 4', kind: 'Homework', folder: 'eng', due: 'Sep 30', bucket: 'past', status: 'done', subs: [] },
];

export const EXAMS: Exam[] = [{ id: 'e1', title: 'Physics test', sub: 'phys', day: 2 }];

export const LIB: Record<string, LibSetting> = { y2627: 'no', maths: 'yes', bio: 'yes', eng: 'yes', hist: 'yes', phys: 'yes', 'm-hw': 'no', y2526: 'no', library: 'no' };

export const STATUS: Record<DocStatus, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' }> = {
  open: { label: 'Open', tone: 'neutral' },
  done: { label: 'Done', tone: 'accent' },
  integrated: { label: 'In library', tone: 'success' },
  changed: { label: 'Changed', tone: 'warning' },
  declined: { label: 'Not added', tone: 'neutral' },
};

export const LIB_CYCLE: Record<LibSetting, LibSetting> = { inherit: 'yes', yes: 'no', no: 'inherit' };

/** Text a newly added block starts with; the paragraph placeholder renders faint. */
export const NEW_BLOCK_TEXT: Record<Block['t'], string> = { p: 'New paragraph', h2: 'Heading', ul: 'List item', callout: 'Something to remember', gap: 'something from class' };
export const PLACEHOLDER = 'Start typing here.';
