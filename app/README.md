# Chameleon app

Desktop web prototype of Chameleon, a study app for school pupils. It implements the Claude Design handoff in
`../project/Chameleon App.dc.html` (see `../chats/` for the design conversation and `../project/uploads/chameleon.md`
for the product concept).

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## Stack

Vite, React 19, TypeScript, Zustand (persisted to `localStorage`), react-router, lucide-react.
Styling is the Loft design system's CSS (tokens and `ch-*` classes), copied verbatim into `src/design-system/`;
`src/app.css` holds the app layout.

## Structure

- `src/ds/` typed React ports of the design-system components (Button, Badge, Tabs, Menu, Toast, …)
- `src/data/` types and the demo dataset (week of Mon, Oct 5 2026)
- `src/store/app.ts` app state and actions; content and settings persist, UI state does not
- `src/lib/model.ts` folder tree, tint and "add to library" rules
- `src/layout/` sidebar, top bar, settings popover, "Add to library" dialog
- `src/views/` Inbox, Folder, Notes, Note editor, Flashcards, Study session, Todos, Calendar

## Prototype notes

- AI suggestions (filling gaps, library proposals) are simulated from the demo data; there is no backend or sync.
- **Settings** (sidebar, bottom) switches the design's layout variants: sidebar split/switch, folder list/grid,
  inbox list/focus, tint and dark mode. **Reset demo data** restores the seed content.
- PDFs and Word files don't open; the app shows a toast instead.
