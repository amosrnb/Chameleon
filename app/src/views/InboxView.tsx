import { Icon, type IconName } from '../components/Icon';
import { TodoItem } from '../components/TodoItem';
import { TODAY_LABEL } from '../data/seed';
import type { Doc, Tint, TodoBucket } from '../data/types';
import { Badge, Button } from '../ds';
import { docMeta, reviewDocs, subjectOf } from '../lib/model';
import { useOpenDoc } from '../lib/useOpenDoc';
import { useApp } from '../store/app';

const COLUMNS: { bucket: TodoBucket; label: string; color: string }[] = [
  { bucket: 'overdue', label: 'Overdue', color: 'var(--danger)' },
  { bucket: 'today', label: 'Today', color: 'var(--text-primary)' },
  { bucket: 'upcoming', label: 'This week', color: 'var(--text-muted)' },
];

export function InboxView() {
  const s = useApp();
  const openTodos = s.todos.filter((t) => t.status !== 'done');
  const review = reviewDocs(s.docs, s.lib, s.snoozed);

  const groups = new Map<string, { name: string; icon: IconName; tint: Tint; items: Doc[] }>();
  review.forEach((d) => {
    const sb = subjectOf(d.folder);
    const k = sb?.id ?? 'x';
    if (!groups.has(k)) groups.set(k, { name: sb?.name ?? 'Other', icon: sb?.icon ?? 'Folder', tint: sb?.tint ?? s.tint, items: [] });
    groups.get(k)!.items.push(d);
  });

  return (
    <div className="page" style={{ gap: 48 }}>
      <div className="page-head">
        <div className="ch-label">{TODAY_LABEL}</div>
        <h1 className="display-title">Inbox</h1>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Due</h2>
          <span className="ch-label">{openTodos.filter((t) => t.bucket !== 'none').length} open</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
          {COLUMNS.map((c) => {
            const items = openTodos.filter((t) => t.bucket === c.bucket);
            return (
              <div key={c.bucket} className="panel" style={{ minHeight: 120 }}>
                <div className="panel__head">
                  <span className="ch-label" style={{ color: c.color }}>{c.label}</span>
                  <span className="ch-label">{items.length}</span>
                </div>
                {items.map((t) => <TodoItem key={t.id} todo={t} canMove />)}
                {!items.length && <div className="empty">Nothing here</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>To review</h2>
          <span className="ch-label">{review.length} for the library</span>
        </div>
        {!review.length && (
          <div style={{ background: 'var(--surface-card)', borderRadius: 20, padding: 28, color: 'var(--text-secondary)', fontSize: 15 }}>
            Nothing to review. New lesson notes wait here until you mark them as done.
          </div>
        )}
        {s.inboxLayout !== 'focus'
          ? [...groups.entries()].map(([k, g]) => (
              <div key={k} data-tint={g.tint} style={{ background: 'var(--surface-card)', borderRadius: 20, padding: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 8px' }}>
                  <span className="icon-tile icon-tile--s"><Icon icon={g.icon} size={14} /></span>
                  <span style={{ font: '600 14px/1 var(--font-sans)' }}>{g.name}</span>
                  <span className="ch-label">{g.items.length}</span>
                </div>
                {g.items.map((d) => <ReviewRow key={d.id} doc={d} />)}
              </div>
            ))
          : review[0] && <FocusCard doc={review[0]} total={review.length} />}
      </section>
    </div>
  );
}

function ReviewRow({ doc }: { doc: Doc }) {
  const s = useApp();
  const openDoc = useOpenDoc();
  const m = docMeta(doc, s.tint);
  return (
    <div className="hoverable" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '6px 10px', borderRadius: 12 }}>
      <span style={{ color: 'var(--text-muted)', display: 'grid' }}><Icon icon={m.icon} /></span>
      <div onClick={() => openDoc(doc)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer' }}>
        <span style={{ font: '500 15px/1.25 var(--font-sans)' }}>{doc.title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.where} · {m.meta}</span>
      </div>
      {m.status && <Badge tone={m.status.tone}>{m.status.label}</Badge>}
      <div style={{ display: 'flex', gap: 4 }}>
        <Button variant="ghost" size="s" onClick={() => s.later(doc.id)}>Later</Button>
        <Button variant="ghost" size="s" onClick={() => s.decline(doc.id)}>Decline</Button>
        <Button variant="primary" size="s" onClick={() => s.markDone(doc.id)}>Done</Button>
      </div>
    </div>
  );
}

/** Inbox "focus" layout: one document at a time on a tilted card. */
function FocusCard({ doc, total }: { doc: Doc; total: number }) {
  const s = useApp();
  const openDoc = useOpenDoc();
  const m = docMeta(doc, s.tint);
  const preview = (s.blocks[doc.id] ?? []).filter((b) => b.t !== 'h2' && b.t !== 'gap').slice(0, 3);
  return (
    <div data-tint={m.tint} style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 24px' }}>
      <div style={{ width: '100%', maxWidth: 640, background: 'var(--surface-card)', borderRadius: 36, padding: 40, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 20, transform: 'rotate(-1.5deg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ch-label" style={{ color: 'var(--accent)' }}>{subjectOf(doc.folder)?.name ?? ''}</span>
          <span className="ch-label">1 of {total}</span>
        </div>
        <h2 style={{ font: '600 44px/1 var(--font-sans)', letterSpacing: '-0.04em', margin: 0 }}>{doc.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          {m.status && <Badge tone={m.status.tone}>{m.status.label}</Badge>}
          <span>{m.where} · {m.meta}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          {preview.map((b, i) => (
            <p key={i} style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.55 }}>{b.x}</p>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => openDoc(doc)}>Open</Button>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => s.later(doc.id)}>Later</Button>
          <Button variant="secondary" onClick={() => s.decline(doc.id)}>Decline</Button>
          <Button variant="primary" onClick={() => s.markDone(doc.id)}>Done</Button>
        </div>
      </div>
    </div>
  );
}
