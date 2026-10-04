import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import './design-system/colors.css';
import './design-system/typography.css';
import './design-system/spacing.css';
import './design-system/effects.css';
import './design-system/base.css';
import './design-system/components.css';
import './app.css';
import { AppShell } from './layout/AppShell';
import { CalendarView } from './views/CalendarView';
import { CardsView } from './views/CardsView';
import { FolderView } from './views/FolderView';
import { InboxView } from './views/InboxView';
import { NotFound } from './views/NotFound';
import { NotesView } from './views/NotesView';
import { NoteView } from './views/NoteView';
import { StudySession } from './views/StudySession';
import { TodosView } from './views/TodosView';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', element: <InboxView /> },
      { path: 'notes', element: <NotesView /> },
      { path: 'notes/:id', element: <NoteView /> },
      { path: 'folders/:id', element: <FolderView /> },
      { path: 'cards', element: <CardsView /> },
      { path: 'cards/:deckId', element: <StudySession /> },
      { path: 'todos', element: <TodosView /> },
      { path: 'calendar', element: <CalendarView /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
