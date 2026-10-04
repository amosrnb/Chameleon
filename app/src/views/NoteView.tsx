import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Editable } from '../components/Editable';
import { Icon } from '../components/Icon';
import { NEW_BLOCK_TEXT, PLACEHOLDER } from '../data/seed';
import type { Block, BlockType } from '../data/types';
import { Badge, Button, Menu, Orb, Tag, type MenuItem } from '../ds';
import { docLib, docMeta, libLabel, proposal, subjectOf } from '../lib/model';
import { useApp } from '../store/app';
import { NotFound } from './NotFound';

const BLOCK_MENU: MenuItem<BlockType>[] = [
  { section: 'Insert' },
  { label: 'Text', value: 'p' },
  { label: 'Heading', value: 'h2', shortcut: '##' },
  { label: 'Bulleted list', value: 'ul', shortcut: '-' },
  { label: 'Callout', value: 'callout' },
  { label: 'Mark a gap', value: 'gap', shortcut: '??' },
];

const NO_SUGGESTION = 'Couldn’t find this in your materials. Ask a classmate or check the worksheet.';

export function NoteView() {
  const { id = '' } = useParams();
  const s = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [asking, setAsking] = useState<number[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAsking([]);
  }, [id]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const note = s.docs.find((d) => d.id === id);
  if (!note) return <NotFound />;

  const m = docMeta(note, s.tint);
  const dl = docLib(s.lib, note);
  const sb = subjectOf(note.folder);
  const blocks = s.blocks[id] ?? [];
  const label = [note.kind, note.date || note.edited, sb?.name].filter(Boolean).join(' · ');
  const canDone = (note.status === 'open' || note.status === 'changed') && dl.eff === 'yes';

  const setBlock = (i: number, p: Partial<Block>) => s.setBlocks(id, (bs) => bs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const ask = (i: number, b: Block) => {
    setAsking((a) => [...a, i]);
    setTimeout(() => {
      setAsking((a) => a.filter((x) => x !== i));
      setBlock(i, { sugg: b.alt || NO_SUGGESTION });
    }, 900);
  };

  return (
    <div data-tint={m.tint} style={{ maxWidth: 'var(--measure)', margin: '0 auto', padding: '56px 32px 160px' }}>
      <div className="page-head page-head--icon">
        <Orb tint="accent" size={56}>
          <span className="orb-icon"><Icon icon={m.icon} size={22} /></span>
        </Orb>
        <div className="ch-label">{label}</div>
        <Editable
          as="h1"
          value={note.title}
          onCommit={(t) => s.updDoc(id, { title: t.trim() || 'Untitled' })}
          style={{ font: '600 64px/.95 var(--font-sans)', letterSpacing: 'var(--tracking-display)', margin: 0 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0 32px' }}>
        <Badge tone={m.status?.tone ?? 'neutral'}>{m.status?.label ?? 'No status'}</Badge>
        <Tag onToggle={() => s.cycleDocLib(id)}>{libLabel(dl)}</Tag>
        <span style={{ flex: 1 }} />
        {canDone && <Button variant="primary" size="s" onClick={() => s.markDone(id)}>Mark as done</Button>}
        {note.status === 'integrated' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <Icon icon="Library" size={14} />
            In library · {proposal(note).topic}
          </span>
        )}
      </div>

      {blocks.map((b, i) => {
        const commit = (x: string) => setBlock(i, { x });
        switch (b.t) {
          case 'h2':
            return <Editable key={i} as="h2" value={b.x} onCommit={commit} style={{ font: '600 22px/1.3 var(--font-sans)', letterSpacing: '-0.015em', margin: '28px 0 6px' }} />;
          case 'p':
            return (
              <div key={i} style={{ margin: '4px 0' }}>
                <Editable as="p" value={b.x} onCommit={commit} style={{ margin: 0, minHeight: '1.55em', color: b.x === PLACEHOLDER ? 'var(--text-faint)' : 'var(--text-primary)' }} />
                {b.ai && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 8px' }}>
                    <Badge tone="accent">AI-added</Badge>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.src}</span>
                  </div>
                )}
              </div>
            );
          case 'ul':
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '3px 0' }}>
                <span className="note-bullet" />
                <Editable value={b.x} onCommit={commit} />
              </div>
            );
          case 'callout':
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 18px', borderRadius: 16, background: 'var(--accent-wash)', margin: '14px 0' }}>
                <span style={{ color: 'var(--accent)', display: 'grid', paddingTop: 2 }}><Icon icon="Lightbulb" /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="ch-label" style={{ color: 'var(--accent)' }}>Remember</span>
                  <Editable value={b.x} onCommit={commit} style={{ font: '500 16px/1.5 var(--font-sans)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            );
          case 'gap': {
            const isAsking = asking.includes(i);
            return (
              <div key={i} style={{ margin: '14px 0', borderRadius: 16, boxShadow: 'inset 0 0 0 1.5px var(--border-default)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 30 }}>
                  <span style={{ color: 'var(--text-muted)', display: 'grid' }}><Icon icon="CircleHelp" /></span>
                  <span style={{ flex: 1, font: '500 15px/1.3 var(--font-sans)', color: 'var(--text-secondary)' }}>Missing: {b.x}</span>
                  {!b.sugg && !isAsking && <Button variant="ghost" size="s" onClick={() => ask(i, b)}>Suggest</Button>}
                  {isAsking && <span className="ch-label">Reading your materials…</span>}
                </div>
                {b.sugg && (
                  <div style={{ background: 'var(--surface-card)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'var(--shadow-1)' }}>
                    <span className="ch-label" style={{ color: 'var(--accent)' }}>Suggestion</span>
                    <div style={{ font: '500 16px/1.5 var(--font-sans)' }}>{b.sugg}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.src}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="primary"
                        size="s"
                        onClick={() => {
                          setBlock(i, { t: 'p', x: b.sugg!, ai: true, sugg: null });
                          s.showToast('Suggestion added');
                        }}
                      >
                        Accept
                      </Button>
                      <Button variant="ghost" size="s" onClick={() => setBlock(i, { sugg: null, alt: b.alt || b.sugg! })}>Dismiss</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          }
        }
      })}

      <div ref={menuRef} style={{ position: 'relative', marginTop: 16 }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', font: '500 14px/1 var(--font-sans)', padding: '8px 0' }}
        >
          <Icon icon="Plus" />
          Add a block
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 36, left: 0, zIndex: 10 }}>
            <Menu
              items={BLOCK_MENU}
              onSelect={(t) => {
                setMenuOpen(false);
                s.setBlocks(id, (bs) => [...bs, { t, x: NEW_BLOCK_TEXT[t] }]);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
