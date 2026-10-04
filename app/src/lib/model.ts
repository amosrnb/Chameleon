// Pure helpers over the folder tree, library settings and documents.
import { FOLDERS, PROPOSALS, STATUS, KIND_ICON } from '../data/seed';
import type { Doc, Folder, LibSetting, Proposal, Tint } from '../data/types';

export const folder = (id: string): Folder | undefined => FOLDERS.find((f) => f.id === id);

/** Nearest ancestor (or self) that carries a tint, i.e. the subject or library area. */
export function subjectOf(id: string): Folder | undefined {
  let f = folder(id);
  while (f && !f.tint) f = f.parent ? folder(f.parent) : undefined;
  return f;
}

export const tintOf = (id: string, base: Tint): Tint => subjectOf(id)?.tint ?? base;

export function path(id: string): Folder[] {
  const p: Folder[] = [];
  let f = folder(id);
  while (f) {
    p.unshift(f);
    f = f.parent ? folder(f.parent) : undefined;
  }
  return p;
}

/** Path without the top-level root, e.g. "Maths / Analysis". */
export const where = (id: string) => path(id).slice(1).map((f) => f.name).join(' / ');

export function descendants(id: string): string[] {
  const out = [id];
  FOLDERS.filter((c) => c.parent === id).forEach((c) => out.push(...descendants(c.id)));
  return out;
}

export interface LibValue {
  v: LibSetting;
  eff: 'yes' | 'no';
}

/** Folder setting and its effective value; root folders that inherit resolve to "no". */
export function libOf(lib: Record<string, LibSetting>, id: string): LibValue {
  const v = lib[id] || 'inherit';
  if (v !== 'inherit') return { v, eff: v };
  const f = folder(id);
  if (!f || !f.parent) return { v, eff: 'no' };
  return { v, eff: libOf(lib, f.parent).eff };
}

/** A document's own setting wins over its folder's. */
export function docLib(lib: Record<string, LibSetting>, d: Doc): LibValue {
  if (d.lib && d.lib !== 'inherit') return { v: d.lib, eff: d.lib };
  return { v: 'inherit', eff: libOf(lib, d.folder).eff };
}

export const libLabel = ({ v, eff }: LibValue) => (v === 'inherit' ? `Library: like parent (${eff})` : `Library: ${v}`);

export function proposal(d: Doc): Proposal {
  if (PROPOSALS[d.id]) return PROPOSALS[d.id];
  const sb = subjectOf(d.folder);
  const area = FOLDERS.find((f) => f.linked === sb?.id);
  const fo = folder(d.folder)!;
  return {
    topic: [area ? area.name : 'Library', fo.type === 'Subject' ? 'General' : fo.name, d.title].join(' / '),
    add: [`Contents of “${d.title}”`],
    existing: [],
    skip: [],
  };
}

/** Documents waiting in the inbox: open or changed, going to the library, not snoozed. */
export const reviewDocs = (docs: Doc[], lib: Record<string, LibSetting>, later: string[]) =>
  docs.filter((d) => (d.status === 'open' || d.status === 'changed') && docLib(lib, d).eff === 'yes' && !later.includes(d.id));

export function docMeta(d: Doc, base: Tint) {
  const st = d.status ? STATUS[d.status] : undefined;
  return {
    icon: KIND_ICON[d.kind] ?? 'File',
    tint: tintOf(d.folder, base),
    meta: `${d.kind} · ${d.edited}`,
    status: st,
    where: where(d.folder),
  };
}
