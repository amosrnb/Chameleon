import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Icon } from '../components/Icon';
import { DECKS } from '../data/seed';
import { Button, IconButton } from '../ds';
import { tintOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';
import { NotFound } from './NotFound';

/** Answer first, then reveal and rate yourself right or wrong. */
export function StudySession() {
  const { deckId = '' } = useParams();
  const deck = DECKS.find((d) => d.id === deckId);
  // Remount on deck change so a new session always starts fresh.
  return deck ? <Session key={deck.id} deckId={deck.id} /> : <NotFound />;
}

function Session({ deckId }: { deckId: string }) {
  const navigate = useNavigate();
  const tint = useApp((s) => s.tint);
  const dk = DECKS.find((d) => d.id === deckId)!;
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState<boolean[]>([]);

  const n = dk.cards.length;
  const finished = i >= n;
  const card = dk.cards[Math.min(i, n - 1)];
  const exit = () => navigate(to.cards());
  const rate = (right: boolean) => {
    setResults((r) => [...r, right]);
    setI((x) => x + 1);
    setRevealed(false);
    setAnswer('');
  };
  const restart = () => {
    setI(0);
    setRevealed(false);
    setAnswer('');
    setResults([]);
  };
  const wrong = dk.cards.filter((_, j) => results[j] === false);

  return (
    <div data-tint={tintOf(dk.folder, tint)} style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <IconButton label="End session" size="s" onClick={exit}><Icon icon="X" /></IconButton>
        <span style={{ font: '600 15px/1 var(--font-sans)' }}>{dk.name}</span>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'var(--accent)', transition: 'width 320ms cubic-bezier(.22,1,.36,1)', width: `${(Math.min(i, n) / n) * 100}%` }} />
        </div>
        <span className="ch-label">{Math.min(i + 1, n)} / {n}</span>
      </div>

      {!finished ? (
        <div style={{ background: 'var(--surface-card)', borderRadius: 36, padding: 44, display: 'flex', flexDirection: 'column', gap: 24, minHeight: 340, boxSizing: 'border-box' }}>
          <span className="ch-label">Question</span>
          <div style={{ font: '600 34px/1.15 var(--font-sans)', letterSpacing: '-0.03em', textWrap: 'pretty' }}>{card.q}</div>
          {!revealed ? (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="ch-input ch-input--pill"
                  placeholder="Type your answer first"
                  aria-label="Your answer"
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setRevealed(true)}
                />
                <Button variant="primary" onClick={() => setRevealed(true)}>Reveal</Button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20 }}>Press Enter to reveal</span>
            </div>
          ) : (
            <>
              <div className="divider-top" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }}>
                <span className="ch-label" style={{ color: 'var(--accent)' }}>Answer</span>
                <div style={{ font: '600 28px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>{card.a}</div>
                {answer.trim() && <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Your answer: {answer}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Icon icon="BookOpen" size={14} />
                  From {card.sec}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <Button variant="secondary" size="l" style={{ flex: 1 }} onClick={() => rate(false)}>Wrong</Button>
                <Button variant="primary" size="l" style={{ flex: 1 }} onClick={() => rate(true)}>Right</Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--surface-card)', borderRadius: 36, padding: 44, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span className="ch-label">Session finished</span>
          <div className="display-title">{results.filter(Boolean).length} of {n} right</div>
          {wrong.length > 0 && (
            <div className="divider-top" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="ch-label">Due again tomorrow</span>
              {wrong.map((w) => <div key={w.q} style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{w.q}</div>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="secondary" onClick={restart}>Study again</Button>
            <Button variant="primary" onClick={exit}>Back to decks</Button>
          </div>
        </div>
      )}
    </div>
  );
}
