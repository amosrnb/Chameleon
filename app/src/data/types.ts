import type { IconName } from '../components/Icon';

export type Tint = 'sky' | 'sage' | 'sand' | 'lilac' | 'blush';
export const TINTS: Tint[] = ['sky', 'sage', 'sand', 'lilac', 'blush'];

export type FolderType = 'School year' | 'Subject' | 'Folder' | 'Project' | 'Library' | 'Library area';

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  icon: IconName;
  parent: string | null;
  tint?: Tint;
  teacher?: string;
  archived?: boolean;
  /** Library areas point at the workspace subject they collect sources from. */
  linked?: string;
}

/** "Add to library" setting on folders and documents. */
export type LibSetting = 'inherit' | 'yes' | 'no';

export type DocKind = 'Lesson notes' | 'Note' | 'PDF' | 'Deck' | 'Word';
export type DocStatus = 'open' | 'done' | 'integrated' | 'changed' | 'declined';

export interface Doc {
  id: string;
  title: string;
  kind: DocKind;
  date?: string;
  edited: string;
  folder: string;
  status?: DocStatus;
  lib?: LibSetting;
  deck?: string;
}

export type BlockType = 'h2' | 'p' | 'ul' | 'callout' | 'gap';

export interface Block {
  t: BlockType;
  x: string;
  /** gap: suggestion currently shown */
  sugg?: string | null;
  /** gap: what "Suggest" finds in your materials */
  alt?: string;
  src?: string;
  /** paragraph added from an accepted AI suggestion */
  ai?: boolean;
}

export interface Lesson {
  sub: string;
  day: number;
  start: number;
  end: number;
  room: string;
}

export interface Exam {
  id: string;
  title: string;
  sub: string;
  day: number;
}

export interface Proposal {
  topic: string;
  add: string[];
  existing: string[];
  skip: string[];
  derived?: { label: string; exam: Exam };
}

export interface Card {
  q: string;
  a: string;
  sec: string;
}

export interface Deck {
  id: string;
  name: string;
  folder: string;
  due: number;
  cards: Card[];
}

export type TodoStatus = 'open' | 'inprogress' | 'done';
export type TodoBucket = 'overdue' | 'today' | 'upcoming' | 'past' | 'none';

export interface Todo {
  id: string;
  title: string;
  kind: 'Homework' | 'Todo';
  folder: string;
  due: string;
  bucket: TodoBucket;
  status: TodoStatus;
  subs: { x: string; done: boolean }[];
  sched?: { day: number; start: number };
}
