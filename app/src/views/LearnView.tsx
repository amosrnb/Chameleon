import { useParams } from 'react-router';
import { NotFound } from './NotFound';

const TOOLS: Record<string, string> = { test: 'Test', dump: 'Dump', tutor: 'AI Tutor', summary: 'AI Summary' };

/** Placeholder for the learning tools until their behaviour is defined. */
export function LearnView() {
  const { tool = '' } = useParams();
  const title = TOOLS[tool];
  if (!title) return <NotFound />;
  return (
    <div className="page" style={{ gap: 24 }}>
      <div className="page-head">
        <div className="ch-label">Learn</div>
        <h1 className="display-title">{title}</h1>
      </div>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Coming soon.</p>
    </div>
  );
}
