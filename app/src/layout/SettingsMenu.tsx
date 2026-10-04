import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { TINTS } from '../data/types';
import { Button, Switch, Tabs, Tag } from '../ds';
import { useApp } from '../store/app';

/** Layout variants from the design, exposed so testers can compare them. */
export function SettingsMenu() {
  const s = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref}>
      {open && (
        <div className="ch-menu settings-pop" role="dialog" aria-label="Settings">
          <div className="settings-pop__row">
            <span className="ch-label">Sidebar</span>
            <Tabs items={[{ value: 'split', label: 'Split' }, { value: 'switch', label: 'Switch' }]} value={s.navLayout} onChange={(navLayout) => s.setSettings({ navLayout })} />
          </div>
          <div className="settings-pop__row">
            <span className="ch-label">Folders</span>
            <Tabs items={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} value={s.folderLayout} onChange={(folderLayout) => s.setSettings({ folderLayout })} />
          </div>
          <div className="settings-pop__row">
            <span className="ch-label">Inbox</span>
            <Tabs items={[{ value: 'list', label: 'List' }, { value: 'focus', label: 'Focus' }]} value={s.inboxLayout} onChange={(inboxLayout) => s.setSettings({ inboxLayout })} />
          </div>
          <div className="settings-pop__row">
            <span className="ch-label">Tint</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TINTS.map((t) => (
                <Tag key={t} selected={s.tint === t} onToggle={() => s.setSettings({ tint: t })}>{t}</Tag>
              ))}
            </div>
          </div>
          <Switch label="Dark mode" checked={s.dark} onChange={(dark) => s.setSettings({ dark })} />
          <div className="divider-top">
            <Button variant="ghost" size="s" onClick={() => { s.resetDemo(); setOpen(false); }}>
              <Icon icon="RotateCcw" size={14} />
              Reset demo data
            </Button>
          </div>
        </div>
      )}
      <button className="nav-row" style={{ width: '100%' }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="nav-row__icon"><Icon icon="Settings2" /></span>
        <span className="nav-row__label">Settings</span>
      </button>
    </div>
  );
}
