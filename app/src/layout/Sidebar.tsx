import { useLocation, useNavigate } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { FOLDERS } from '../data/seed';
import { Logo, Tabs } from '../ds';
import { reviewDocs, subjectOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';
import { SettingsMenu } from './SettingsMenu';

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: to.inbox(), label: 'Inbox', icon: 'Inbox' },
  { path: to.notes(), label: 'Notes', icon: 'NotebookPen' },
  { path: to.cards(), label: 'Flashcards', icon: 'Layers' },
  { path: to.todos(), label: 'Todos', icon: 'ListChecks' },
  { path: to.calendar(), label: 'Calendar', icon: 'CalendarDays' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const s = useApp();
  const split = s.navLayout !== 'switch';
  const showWork = split || s.navTab === 'work';
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

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <Logo height={20} withWordmark />
      </div>
      {!split && (
        <div style={{ padding: '0 0 12px 4px' }}>
          <Tabs
            items={[{ value: 'work', label: 'Workstation' }, { value: 'files', label: 'Files' }]}
            value={s.navTab}
            onChange={(navTab) => s.setUi({ navTab })}
          />
        </div>
      )}
      {showWork && (
        <>
          {split && <div className="ch-eyebrow sidebar__eyebrow">Workstation</div>}
          {NAV.map((n) => {
            const count = n.path === to.inbox() ? inboxCount : 0;
            return (
              <button key={n.path} className="nav-row" aria-current={pathname.startsWith(n.path) ? 'page' : undefined} onClick={() => navigate(n.path)}>
                <span className="nav-row__icon"><Icon icon={n.icon} /></span>
                <span className="nav-row__label">{n.label}</span>
                {count > 0 && <span className="count">{count}</span>}
              </button>
            );
          })}
        </>
      )}
      {showFiles && (
        <>
          {split && <div className="ch-eyebrow sidebar__eyebrow sidebar__eyebrow--files">Files</div>}
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
                style={{ paddingLeft: 4 + depth * 14 }}
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
        </>
      )}
      <div className="sidebar__foot">
        <SettingsMenu />
      </div>
    </aside>
  );
}
