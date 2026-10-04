import { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { Button, Checkbox } from '../ds';
import { proposal, tintOf } from '../lib/model';
import { useApp } from '../store/app';

/** "Add to library" confirmation: the AI proposes, the pupil decides. */
export function LibraryDialog() {
  const s = useApp();
  const D = s.dialog;
  const doc = D && s.docs.find((d) => d.id === D.doc);

  useEffect(() => {
    if (!D) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && s.cancelDialog();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [D, s]);

  if (!D || !doc) return null;
  const pr = proposal(doc);

  return (
    <div className="ch-dialog-scrim" onClick={s.cancelDialog} data-tint={tintOf(doc.folder, s.tint)}>
      <div className="ch-dialog" role="dialog" aria-modal="true" aria-labelledby="lib-dialog-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="ch-label" style={{ color: 'var(--accent)' }}>Suggestion · Add to library</span>
          <h2 id="lib-dialog-title" className="ch-dialog__title" style={{ margin: 0 }}>{doc.title}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-sunken)', borderRadius: 12, font: '500 14px/1.3 var(--font-sans)' }}>
          <Icon icon="Library" />
          {pr.topic}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="ch-label">New on the knowledge page</span>
          {pr.add.map((x, i) => (
            <Checkbox key={i} label={x} checked={D.sel[i]} onChange={() => s.toggleDialogItem(i)} />
          ))}
        </div>
        {pr.existing.length > 0 && <TextList label="Already on the page" items={pr.existing} />}
        {pr.skip.length > 0 && <TextList label="Not added" items={pr.skip} />}
        {pr.derived && (
          <div className="divider-top" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="ch-label">Also found</span>
            <Checkbox label={pr.derived.label} checked={D.derived} onChange={s.toggleDialogDerived} />
          </div>
        )}
        <div className="ch-dialog__actions">
          <Button variant="ghost" onClick={s.cancelDialog}>Cancel</Button>
          <Button variant="primary" onClick={s.confirmDialog}>Add to library</Button>
        </div>
      </div>
    </div>
  );
}

function TextList({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="ch-label">{label}</span>
      {items.map((x) => (
        <span key={x} style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{x}</span>
      ))}
    </div>
  );
}
