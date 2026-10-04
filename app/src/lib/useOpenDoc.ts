import { useNavigate } from 'react-router';
import { NOTE_KINDS } from '../data/seed';
import type { Doc } from '../data/types';
import { useApp } from '../store/app';
import { to } from './routes';

/** Decks open a study session, notes open the editor; other files have no preview yet. */
export function useOpenDoc() {
  const navigate = useNavigate();
  const showToast = useApp((s) => s.showToast);
  return (d: Doc) => {
    if (d.kind === 'Deck' && d.deck) navigate(to.study(d.deck));
    else if (NOTE_KINDS.includes(d.kind)) navigate(to.note(d.id));
    else showToast('File previews aren’t part of this prototype');
  };
}
