import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { DECKS } from '../data/seed';
import { Badge, Toast } from '../ds';
import { path, tintOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';
import { LibraryDialog } from './LibraryDialog';
import { Sidebar } from './Sidebar';

const SECTION_LABEL: Record<string, string> = { inbox: 'Inbox', notes: 'Notes', cards: 'Flashcards', todos: 'Todos', calendar: 'Calendar' };

export function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { dark, tint, docs, toast } = useApp();

  const folderId = useMatch('/folders/:id')?.params.id;
  const noteId = useMatch('/notes/:id')?.params.id;
  const deckId = useMatch('/cards/:deckId')?.params.deckId;
  const note = noteId ? docs.find((d) => d.id === noteId) : undefined;

  // The page carries the base tint; the main area takes the tint of whatever subject is in view.
  const ctx = folderId ?? note?.folder ?? DECKS.find((d) => d.id === deckId)?.folder;
  const screenTint = ctx ? tintOf(ctx, tint) : tint;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = dark ? 'dark' : 'light';
    html.dataset.tint = tint;
  }, [dark, tint]);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);

  const folderCrumbs = (id: string) => path(id).map((f) => ({ label: f.name, onClick: () => navigate(to.folder(f.id)) }));
  const crumbs = folderId
    ? folderCrumbs(folderId)
    : note
      ? [...folderCrumbs(note.folder), { label: note.title, onClick: () => {} }]
      : [{ label: SECTION_LABEL[pathname.split('/')[1]] ?? '', onClick: () => {} }];

  return (
    <div className="app">
      <Sidebar />
      <main ref={mainRef} className="main dotted-edge" data-tint={screenTint}>
        <header className="topbar dotted-edge">
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span className="crumbs__sep">/</span>}
                <button className="crumbs__item" onClick={c.onClick} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</button>
              </span>
            ))}
          </nav>
          <div className="topbar__end">
            <Badge tone="success" dot>Synced</Badge>
          </div>
        </header>
        <Outlet />
      </main>
      <LibraryDialog />
      {toast && (
        <div className="toast-host">
          <Toast actions={toast.actions}>{toast.msg}</Toast>
        </div>
      )}
    </div>
  );
}
