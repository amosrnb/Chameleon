import { useNavigate } from 'react-router';
import { Button } from '../ds';
import { to } from '../lib/routes';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page" style={{ gap: 24 }}>
      <div className="page-head">
        <div className="ch-label">Not found</div>
        <h1 className="display-title">Nothing here</h1>
      </div>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>This page was moved or deleted.</p>
      <div>
        <Button onClick={() => navigate(to.inbox())}>Back to inbox</Button>
      </div>
    </div>
  );
}
