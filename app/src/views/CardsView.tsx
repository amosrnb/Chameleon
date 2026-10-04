import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { DECKS } from '../data/seed';
import { Button, Orb } from '../ds';
import { tintOf, where } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';

export function CardsView() {
  const navigate = useNavigate();
  const tint = useApp((s) => s.tint);
  return (
    <div className="page" style={{ gap: 32 }}>
      <div className="page-head">
        <div className="ch-label">{DECKS.reduce((a, d) => a + d.due, 0)} cards due today</div>
        <h1 className="display-title">Flashcards</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {DECKS.map((d) => (
          <div key={d.id} data-tint={tintOf(d.folder, tint)} style={{ background: 'var(--surface-card)', borderRadius: 28, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Orb tint="accent" size={44}>
              <span className="orb-icon"><Icon icon="Layers" size={18} /></span>
            </Orb>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '600 22px/1.15 var(--font-sans)', letterSpacing: '-0.02em' }}>{d.name}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{where(d.folder)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="ch-label">{d.cards.length} cards · {d.due ? `${d.due} due` : 'none due'}</span>
              <Button variant={d.due ? 'primary' : 'secondary'} size="s" onClick={() => navigate(to.study(d.id))}>Study</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
