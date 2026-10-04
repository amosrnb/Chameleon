import { Icon } from '../components/Icon';
import { TINTS } from '../data/types';
import { Button, Switch, Tabs, Tag } from '../ds';
import { useApp } from '../store/app';

export function SettingsView() {
  const s = useApp();
  return (
    <div className="page" style={{ gap: 32 }}>
      <div className="page-head">
        <div className="ch-label">Account</div>
        <h1 className="display-title">Settings</h1>
      </div>

      <div className="panel settings">
        <label className="settings__row">
          <span className="ch-label">Name</span>
          <input className="ch-input" value={s.profileName} onChange={(e) => s.setSettings({ profileName: e.target.value })} />
        </label>
      </div>

      <div className="panel settings">
        <div className="settings__row">
          <span className="ch-label">Sidebar</span>
          <Tabs items={[{ value: 'split', label: 'Split' }, { value: 'switch', label: 'Switch' }]} value={s.navLayout} onChange={(navLayout) => s.setSettings({ navLayout })} />
          <span className="settings__hint">Switch shows a toggle in the sidebar to flip between tools and file manager.</span>
        </div>
        <div className="settings__row">
          <span className="ch-label">Folders</span>
          <Tabs items={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} value={s.folderLayout} onChange={(folderLayout) => s.setSettings({ folderLayout })} />
        </div>
        <div className="settings__row">
          <span className="ch-label">Inbox</span>
          <Tabs items={[{ value: 'list', label: 'List' }, { value: 'focus', label: 'Focus' }]} value={s.inboxLayout} onChange={(inboxLayout) => s.setSettings({ inboxLayout })} />
        </div>
        <div className="settings__row">
          <span className="ch-label">Tint</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TINTS.map((t) => (
              <Tag key={t} selected={s.tint === t} onToggle={() => s.setSettings({ tint: t })}>{t}</Tag>
            ))}
          </div>
        </div>
        <Switch label="Dark mode" checked={s.dark} onChange={(dark) => s.setSettings({ dark })} />
      </div>

      <div>
        <Button variant="ghost" size="s" onClick={s.resetDemo}>
          <Icon icon="RotateCcw" size={14} />
          Reset demo data
        </Button>
      </div>
    </div>
  );
}
