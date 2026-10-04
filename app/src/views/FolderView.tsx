import { useNavigate, useParams } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { TodoItem } from '../components/TodoItem';
import { DATES, DAYS, FOLDERS, LESSONS, fmtH } from '../data/seed';
import type { Tint } from '../data/types';
import { Badge, Button, Orb, Tag, type BadgeTone } from '../ds';
import { descendants, docMeta, folder, libLabel, libOf, tintOf } from '../lib/model';
import { to } from '../lib/routes';
import { useOpenDoc } from '../lib/useOpenDoc';
import { useApp } from '../store/app';
import { NotFound } from './NotFound';

interface Item {
  key: string;
  title: string;
  icon: IconName;
  tint: Tint;
  meta: string;
  status?: { label: string; tone: BadgeTone };
  open: () => void;
}

export function FolderView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const openDoc = useOpenDoc();
  const s = useApp();
  const F = folder(id);
  if (!F) return <NotFound />;

  const D = descendants(F.id);
  const isLib = F.type === 'Library' || F.type === 'Library area';
  const lib = libOf(s.lib, F.id);
  const openTodos = s.todos.filter((t) => t.status !== 'done' && D.includes(t.folder));

  const subfolders: Item[] = FOLDERS.filter((c) => c.parent === F.id).map((c) => {
    const n = s.docs.filter((d) => descendants(c.id).includes(d.folder)).length;
    return {
      key: c.id,
      title: c.name,
      icon: c.icon,
      tint: tintOf(c.id, s.tint),
      meta: `${c.type} · ${n} ${n === 1 ? 'file' : 'files'}`,
      open: () => {
        s.toggleOpen(F.id, true);
        navigate(to.folder(c.id));
      },
    };
  });
  // Library areas list the integrated notes of their linked subject as sources (links, not copies).
  const fileDocs = F.linked
    ? s.docs.filter((d) => d.status === 'integrated' && descendants(F.linked!).includes(d.folder))
    : s.docs.filter((d) => d.folder === F.id);
  const files: Item[] = fileDocs.map((d) => {
    const m = docMeta(d, s.tint);
    return { key: d.id, title: d.title, icon: m.icon, tint: m.tint, meta: F.linked ? m.where : m.meta, status: m.status, open: () => openDoc(d) };
  });
  const items = [...subfolders, ...files];

  const events = [
    ...LESSONS.filter((l) => D.includes(l.sub)).map((l) => ({ k: l.day * 100 + l.start, when: `${DAYS[l.day]} ${fmtH(l.start)}`, title: `${folder(l.sub)!.name} · ${l.room}`, isExam: false })),
    ...s.exams.filter((e) => D.includes(e.sub)).map((e) => ({ k: e.day * 100, when: `${DAYS[e.day]} ${DATES[e.day]}`, title: e.title, isExam: true })),
  ]
    .sort((a, b) => a.k - b.k)
    .slice(0, 5);

  const parent = F.parent ? folder(F.parent) : undefined;
  const label =
    F.type === 'Subject'
      ? ['Subject', F.teacher, LESSONS.filter((l) => l.sub === F.id).map((l) => DAYS[l.day]).join(', ')].join(' · ')
      : F.type === 'Library area'
        ? `Library · sources from ${folder(F.linked!)!.name}`
        : F.archived
          ? `${F.type} · archived`
          : parent
            ? `${F.type} in ${parent.name}`
            : F.type;

  return (
    <div className="page" data-tint={tintOf(F.id, s.tint)} style={{ gap: 40 }}>
      <div className="page-head page-head--icon">
        <Orb tint="accent" size={56}>
          <span className="orb-icon"><Icon icon={F.icon} size={22} /></span>
        </Orb>
        <div className="ch-label">{label}</div>
        <h1 className="display-title">{F.name}</h1>
        {!isLib && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <Button variant="primary" size="s" onClick={() => navigate(to.note(s.newNote(F.id)))}>New note</Button>
            <Tag onToggle={() => s.cycleFolderLib(F.id)}>{libLabel(lib)}</Tag>
          </div>
        )}
      </div>

      {!isLib && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
          <div className="panel">
            <div className="panel__head">
              <span className="ch-label">Open todos</span>
              <span className="ch-label">{openTodos.length}</span>
            </div>
            {openTodos.map((t) => <TodoItem key={t.id} todo={t} colorDue />)}
            {!openTodos.length && <div className="empty">No open todos</div>}
          </div>
          <div className="panel">
            <div className="panel__head">
              <span className="ch-label">This week</span>
            </div>
            {events.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px', fontSize: 14 }}>
                <span className="ch-label" style={{ width: 76, flex: 'none' }}>{e.when}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{e.title}</span>
                {e.isExam && <Badge tone="inverse">Exam</Badge>}
              </div>
            ))}
            {!events.length && <div className="empty">No dates this week</div>}
          </div>
        </div>
      )}

      <section className="section" style={{ gap: 12 }}>
        <div className="section-head">
          <h2>{F.linked ? 'Sources' : 'Files'}</h2>
          <span className="ch-label">{items.length}</span>
        </div>
        {items.length > 0 && s.folderLayout === 'list' && (
          <div className="list-card">
            {items.map((d) => (
              <div key={d.key} className="doc-row hoverable" data-tint={d.tint} onClick={d.open}>
                <span className="icon-tile"><Icon icon={d.icon} /></span>
                <span className="doc-row__title">{d.title}</span>
                <span className="doc-row__meta">{d.meta}</span>
                <span className="doc-row__status">{d.status && <Badge tone={d.status.tone}>{d.status.label}</Badge>}</span>
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && s.folderLayout === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            {items.map((d) => (
              <div key={d.key} className="grid-card" data-tint={d.tint} onClick={d.open}>
                <div className="grid-card__media">
                  <Icon icon={d.icon} size={26} />
                  {d.status && (
                    <div style={{ position: 'absolute', left: 8, top: 8 }}>
                      <Badge tone={d.status.tone}>{d.status.label}</Badge>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
                  <span style={{ font: '600 15px/1.25 var(--font-sans)' }}>{d.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.meta}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!items.length && (
          <div style={{ color: 'var(--text-muted)', fontSize: 15, padding: '4px 0' }}>
            {F.linked ? 'Nothing here yet. Notes you add to the library show up here as sources.' : 'This folder is empty.'}
          </div>
        )}
      </section>
    </div>
  );
}
