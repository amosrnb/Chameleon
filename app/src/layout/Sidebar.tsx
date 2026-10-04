import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { FOLDERS } from '../data/seed';
import { Button, Logo, Menu, Tabs } from '../ds';
import { reviewDocs, subjectOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';

const TOOLS: { path: string; label: string; icon: IconName }[] = [
  { path: to.inbox(), label: 'Inbox', icon: 'Inbox' },
  { path: to.notes(), label: 'Notes', icon: 'NotebookPen' },
  { path: to.todos(), label: 'Todos', icon: 'ListChecks' },
  { path: to.calendar(), label: 'Calendar', icon: 'CalendarDays' },
];

const LEARN: { path: string; label: string; icon: IconName }[] = [
  { path: to.cards(), label: 'Flashcards', icon: 'Layers' },
  { path: to.learn('test'), label: 'Test', icon: 'ClipboardCheck' },
  { path: to.learn('dump'), label: 'Dump', icon: 'Brain' },
  { path: to.learn('tutor'), label: 'AI Tutor', icon: 'Bot' },
  { path: to.learn('summary'), label: 'AI Summary', icon: 'Sparkles' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const s = useApp();
  const split = s.navLayout !== 'switch';
  const showTools = split || s.navTab === 'tools';
  const showFiles = split || s.navTab === 'files';

  const inboxCount =
    reviewDocs(s.docs, s.lib, s.snoozed).length + s.todos.filter((t) => t.status !== 'done' && (t.bucket === 'today' || t.bucket === 'overdue')).length;

  const tree: { id: string; depth: number }[] = [];
  const walk = (pid: string | null, depth: number) =>
    FOLDERS.filter((f) => f.parent === pid).forEach((f) => {
      tree.push({ id: f.id, depth });
      if (s.open[f.id]) walk(f.id, depth + 1);
    });
  walk(null, 0);

  const navRow = (n: { path: string; label: string; icon: IconName }, count = 0, sub = false) => (
    <button
      key={n.path}
      className={'nav-row' + (sub ? ' nav-row--sub' : '')}
      aria-current={pathname.startsWith(n.path) ? 'page' : undefined}
      onClick={() => navigate(n.path)}
    >
      <span className="nav-row__icon"><Icon icon={n.icon} /></span>
      <span className="nav-row__label">{n.label}</span>
      {count > 0 && <span className="count">{count}</span>}
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <Logo height={20} withWordmark />
      </div>

      <CreateButton />

      {!split && (
        <div className="sidebar__switch">
          <Tabs
            items={[{ value: 'tools', label: 'Tools' }, { value: 'files', label: 'Files' }]}
            value={s.navTab}
            onChange={(navTab) => s.setUi({ navTab })}
          />
        </div>
      )}

      {showTools && (
        <>
          <div className="sidebar__group">
            {TOOLS.map((n) => navRow(n, n.path === to.inbox() ? inboxCount : 0))}
          </div>

          <Section id="learn" label="Learn" icon="GraduationCap">
            {LEARN.map((n) => navRow(n, 0, true))}
          </Section>
        </>
      )}

      {showFiles && (
        <Section id="files" label="File manager" icon="FolderTree" collapsible={split}>
          {tree.map(({ id, depth }) => {
            const f = FOLDERS.find((x) => x.id === id)!;
            const hasKids = FOLDERS.some((c) => c.parent === id);
            const sb = subjectOf(id);
            const active = pathname === `/folders/${id}`;
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                className={'tree-row' + (f.archived ? ' tree-row--archived' : '')}
                aria-current={active ? 'page' : undefined}
                style={{ paddingLeft: 12 + depth * 14 }}
                onClick={() => {
                  s.toggleOpen(id, true);
                  navigate(to.folder(id));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    s.toggleOpen(id, true);
                    navigate(to.folder(id));
                  }
                }}
              >
                {hasKids ? (
                  <span
                    className="caret"
                    aria-label={s.open[id] ? 'Collapse' : 'Expand'}
                    onClick={(e) => {
                      e.stopPropagation();
                      s.toggleOpen(id);
                    }}
                  >
                    <Icon icon={s.open[id] ? 'ChevronDown' : 'ChevronRight'} size={14} />
                  </span>
                ) : (
                  <span className="caret caret--none" />
                )}
                <span data-tint={sb?.tint ?? s.tint} style={{ display: 'grid', color: sb ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <Icon icon={f.icon} />
                </span>
                <span className="tree-row__name">{f.name}</span>
              </div>
            );
          })}
        </Section>
      )}

      <div className="sidebar__foot">
        <button className="account-row" aria-current={pathname.startsWith(to.settings()) ? 'page' : undefined} onClick={() => navigate(to.settings())}>
          <span className="avatar" aria-hidden>{initials(s.profileName)}</span>
          <span className="account-row__name">{s.profileName}</span>
          <span className="nav-row__icon"><Icon icon="Settings2" /></span>
        </button>
      </div>
    </aside>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Collapsible sidebar group; collapsed state persists. Non-collapsible groups render their children without a header. */
function Section({ id, label, icon, collapsible = true, children }: { id: string; label: string; icon: IconName; collapsible?: boolean; children: ReactNode }) {
  const collapsed = useApp((s) => !!s.navCollapsed[id]);
  const setUi = useApp((s) => s.setUi);
  const navCollapsed = useApp((s) => s.navCollapsed);
  if (!collapsible) return <div className="sidebar__group">{children}</div>;
  return (
    <div className="sidebar__group">
      <button className="nav-row" aria-expanded={!collapsed} onClick={() => setUi({ navCollapsed: { ...navCollapsed, [id]: !collapsed } })}>
        <span className="nav-row__icon"><Icon icon={icon} /></span>
        <span className="nav-row__label">{label}</span>
        <span className="nav-row__icon"><Icon icon={collapsed ? 'ChevronRight' : 'ChevronDown'} size={14} /></span>
      </button>
      {!collapsed && children}
    </div>
  );
}

function CreateButton() {
  const navigate = useNavigate();
  const newNote = useApp((s) => s.newNote);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="sidebar__create">
      <Button variant="primary" size="s" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} style={{ width: '100%' }}>
        <Icon icon="Plus" size={14} />
        Create
      </Button>
      {open && (
        <Menu
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30 }}
          items={[
            { label: 'New note', value: 'note', icon: <Icon icon="NotebookPen" /> },
            { label: 'New todo', value: 'todo', icon: <Icon icon="ListChecks" /> },
          ]}
          onSelect={(v) => {
            setOpen(false);
            navigate(v === 'note' ? to.note(newNote('y2627')) : to.todos());
          }}
        />
      )}
    </div>
  );
}
