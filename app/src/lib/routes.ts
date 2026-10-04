export const to = {
  inbox: () => '/inbox',
  notes: () => '/notes',
  note: (id: string) => `/notes/${id}`,
  folder: (id: string) => `/folders/${id}`,
  cards: () => '/cards',
  study: (deckId: string) => `/cards/${deckId}`,
  todos: () => '/todos',
  calendar: () => '/calendar',
  learn: (tool: string) => `/learn/${tool}`,
  settings: () => '/settings',
};
