import { Icon } from '../components/Icon';
import { NOTE_KINDS } from '../data/seed';
import { Badge } from '../ds';
import { docMeta } from '../lib/model';
import { useOpenDoc } from '../lib/useOpenDoc';
import { useApp } from '../store/app';

export function NotesView() {
  const s = useApp();
  const openDoc = useOpenDoc();
  const notes = s.docs.filter((d) => NOTE_KINDS.includes(d.kind));
  return (
    <div className="page" style={{ gap: 32 }}>
      <div className="page-head">
        <div className="ch-label">{notes.length} notes</div>
        <h1 className="display-title">Notes</h1>
      </div>
      <div className="list-card">
        {notes.map((d) => {
          const m = docMeta(d, s.tint);
          return (
            <div key={d.id} className="doc-row doc-row--tall hoverable" data-tint={m.tint} onClick={() => openDoc(d)}>
              <span className="icon-tile"><Icon icon={m.icon} /></span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ font: '500 15px/1.2 var(--font-sans)' }}>{d.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.where}</span>
              </div>
              <span className="doc-row__meta">{m.meta}</span>
              <span className="doc-row__status">{m.status && <Badge tone={m.status.tone}>{m.status.label}</Badge>}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
