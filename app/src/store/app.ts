// Local-first app store. Content and settings persist in localStorage; transient UI state does not.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BLOCKS, DAYS, DOCS, EXAMS, LIB, LIB_CYCLE, PLACEHOLDER, TODAY_DATE, TODOS, fmtH } from '../data/seed';
import type { Block, Doc, Exam, LibSetting, Tint, Todo, TodoStatus } from '../data/types';
import type { ToastAction } from '../ds';
import { docLib, folder, libOf, proposal, subjectOf } from '../lib/model';

export interface Settings {
  navLayout: 'split' | 'switch';
  folderLayout: 'list' | 'grid';
  inboxLayout: 'list' | 'focus';
  dark: boolean;
  tint: Tint;
}

interface Content {
  docs: Doc[];
  todos: Todo[];
  blocks: Record<string, Block[]>;
  exams: Exam[];
  lib: Record<string, LibSetting>;
}

export interface LibraryDialog {
  doc: string;
  prev: Doc['status'];
  sel: boolean[];
  derived: boolean;
}

interface Ui {
  /** Expanded folders in the sidebar tree. */
  open: Record<string, boolean>;
  navTab: 'work' | 'files';
  /** Documents moved to "later" in this session. */
  snoozed: string[];
  todoTab: 'open' | 'done';
  todoSub: string;
  todoSel: string | null;
  dialog: LibraryDialog | null;
  toast: { msg: string; actions: ToastAction[] } | null;
}

interface Actions {
  setSettings(p: Partial<Settings>): void;
  setUi(p: Partial<Ui>): void;
  toggleOpen(id: string, value?: boolean): void;
  showToast(msg: string, actions?: ToastAction[]): void;
  undoable(msg: string, undo: () => void): void;
  updDoc(id: string, p: Partial<Doc>): void;
  updTodo(id: string, p: Partial<Todo>): void;
  setBlocks(id: string, fn: (bs: Block[]) => Block[]): void;
  cycleFolderLib(id: string): void;
  cycleDocLib(id: string): void;
  markDone(id: string): void;
  decline(id: string): void;
  later(id: string): void;
  toggleTodo(id: string): void;
  setTodoStatus(id: string, status: TodoStatus): void;
  addTodo(title: string, folderId: string): void;
  scheduleTodo(id: string, day: number, start: number): void;
  newNote(folderId: string): string;
  toggleDialogItem(i: number): void;
  toggleDialogDerived(): void;
  cancelDialog(): void;
  confirmDialog(): void;
  resetDemo(): void;
}

export type AppState = Settings & Content & Ui & Actions;

const seedContent = (): Content => ({
  docs: DOCS,
  todos: TODOS,
  blocks: BLOCKS,
  exams: EXAMS,
  lib: LIB,
});

const defaultSettings: Settings = { navLayout: 'split', folderLayout: 'list', inboxLayout: 'list', dark: false, tint: 'sky' };

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      ...seedContent(),
      open: { y2627: true, maths: true },
      navTab: 'work',
      snoozed: [],
      todoTab: 'open',
      todoSub: 'all',
      todoSel: null,
      dialog: null,
      toast: null,

      setSettings: (p) => set(p),
      setUi: (p) => set(p),
      toggleOpen: (id, value) => set((s) => ({ open: { ...s.open, [id]: value ?? !s.open[id] } })),

      showToast(msg, actions = []) {
        set({ toast: { msg, actions } });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => set({ toast: null }), 3600);
      },
      undoable(msg, undo) {
        get().showToast(msg, [{ label: 'Undo', onClick: () => { undo(); set({ toast: null }); } }]);
      },

      updDoc: (id, p) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
      updTodo: (id, p) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      setBlocks: (id, fn) => set((s) => ({ blocks: { ...s.blocks, [id]: fn(s.blocks[id] || []) } })),

      cycleFolderLib(id) {
        const { v } = libOf(get().lib, id);
        set((s) => ({ lib: { ...s.lib, [id]: LIB_CYCLE[v] } }));
      },
      cycleDocLib(id) {
        const d = get().docs.find((x) => x.id === id);
        if (d) get().updDoc(id, { lib: LIB_CYCLE[docLib(get().lib, d).v] });
      },

      // "Done" starts the library step right away: the AI proposal opens for confirmation.
      markDone(id) {
        const d = get().docs.find((x) => x.id === id);
        if (!d) return;
        get().updDoc(id, { status: 'done' });
        set({ dialog: { doc: id, prev: d.status, sel: proposal(d).add.map(() => true), derived: true } });
      },
      decline(id) {
        const prev = get().docs.find((x) => x.id === id)?.status;
        get().updDoc(id, { status: 'declined' });
        get().undoable('Not added to library', () => get().updDoc(id, { status: prev }));
      },
      later(id) {
        set((s) => ({ snoozed: [...s.snoozed, id] }));
        get().undoable('Moved to later', () => set((s) => ({ snoozed: s.snoozed.filter((x) => x !== id) })));
      },

      toggleTodo(id) {
        const t = get().todos.find((x) => x.id === id);
        if (!t) return;
        const prev = t.status;
        const next = prev === 'done' ? 'open' : 'done';
        get().updTodo(id, { status: next });
        if (next === 'done') get().undoable('Marked as done', () => get().updTodo(id, { status: prev }));
      },
      setTodoStatus: (id, status) => get().updTodo(id, { status }),
      addTodo(title, folderId) {
        const t: Todo = { id: 't' + Date.now(), title, kind: 'Todo', folder: folderId, due: 'No date', bucket: 'none', status: 'open', subs: [] };
        set((s) => ({ todos: [t, ...s.todos], todoTab: 'open' }));
        get().showToast('Added to ' + folder(folderId)?.name);
      },
      scheduleTodo(id, day, start) {
        get().updTodo(id, { sched: { day, start } });
        get().showToast(`Planned for ${DAYS[day]} ${fmtH(start)}`);
      },

      newNote(folderId) {
        const id = 'n' + Date.now();
        const sb = subjectOf(folderId);
        const doc: Doc = { id, title: sb ? 'Lesson notes, ' + sb.name : 'Untitled', kind: sb ? 'Lesson notes' : 'Note', date: TODAY_DATE, edited: 'Just now', folder: folderId, status: 'open' };
        set((s) => ({ docs: [doc, ...s.docs], blocks: { ...s.blocks, [id]: [{ t: 'p', x: PLACEHOLDER }] } }));
        return id;
      },

      toggleDialogItem: (i) => set((s) => (s.dialog ? { dialog: { ...s.dialog, sel: s.dialog.sel.map((y, j) => (j === i ? !y : y)) } } : {})),
      toggleDialogDerived: () => set((s) => (s.dialog ? { dialog: { ...s.dialog, derived: !s.dialog.derived } } : {})),
      cancelDialog() {
        const D = get().dialog;
        if (D) get().updDoc(D.doc, { status: D.prev });
        set({ dialog: null });
      },
      confirmDialog() {
        const s = get();
        const D = s.dialog;
        const d = D && s.docs.find((x) => x.id === D.doc);
        if (!D || !d) return;
        const pr = proposal(d);
        const ex = pr.derived && D.derived && !s.exams.some((e) => e.id === pr.derived!.exam.id) ? pr.derived.exam : null;
        s.updDoc(d.id, { status: 'integrated' });
        set((st) => ({ dialog: null, exams: ex ? [...st.exams, ex] : st.exams }));
        s.undoable(ex ? `Added to library · ${ex.title} created` : 'Added to library', () => {
          get().updDoc(d.id, { status: D.prev });
          if (ex) set((st) => ({ exams: st.exams.filter((e) => e.id !== ex.id) }));
        });
      },

      resetDemo() {
        set({ ...seedContent(), snoozed: [], todoSel: null, dialog: null });
        get().showToast('Demo data restored');
      },
    }),
    {
      name: 'chameleon',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        navLayout: s.navLayout, folderLayout: s.folderLayout, inboxLayout: s.inboxLayout, dark: s.dark, tint: s.tint,
        docs: s.docs, todos: s.todos, blocks: s.blocks, exams: s.exams, lib: s.lib, open: s.open,
      }),
    },
  ),
);
