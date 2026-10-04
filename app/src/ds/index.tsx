// Typed ports of the Loft design system components (see project/_ds/…/_ds_bundle.js).
// Styling lives in src/design-system/components.css; these only map props to ch-* classes.
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type OrbTint = 'accent' | 'sky' | 'sage' | 'sand' | 'lilac' | 'blush';

export function Orb({ tint = 'accent', size = 120, style, children }: { tint?: OrbTint; size?: number; style?: CSSProperties; children?: ReactNode }) {
  const hi = tint === 'accent' ? 'var(--accent-base)' : `var(--${tint}-500)`;
  const lo = tint === 'accent' ? 'var(--accent)' : `var(--${tint}-700)`;
  return (
    <div
      className="ch-orb"
      aria-hidden={children ? undefined : true}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        background: `radial-gradient(circle at 35% 30%,#fff 0%,${hi} 45%,${lo} 82%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'inverse';

const TONES: Record<BadgeTone, [string, string]> = {
  neutral: ['var(--surface-sunken)', 'var(--text-secondary)'],
  accent: ['var(--accent-wash)', 'var(--accent)'],
  success: ['color-mix(in oklch,var(--success) 16%,transparent)', 'var(--success)'],
  warning: ['color-mix(in oklch,var(--warning) 20%,transparent)', 'var(--sand-700)'],
  danger: ['color-mix(in oklch,var(--danger) 14%,transparent)', 'var(--danger)'],
  inverse: ['var(--surface-inverse)', 'var(--text-inverse)'],
};

export function Badge({ tone = 'neutral', dot = false, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  const [bg, fg] = TONES[tone];
  return (
    <span className="ch-badge" style={{ background: bg, color: fg }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'glass';
  size?: 's' | 'm' | 'l';
};

export function Button({ variant = 'primary', size = 'm', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx('ch-btn', `ch-btn--${variant}`, size !== 'm' && `ch-btn--${size}`, className)} {...rest} />;
}

export function IconButton({ variant = 'ghost', size = 'm', label, className, type = 'button', ...rest }: ButtonProps & { label: string }) {
  return (
    <button
      type={type}
      className={cx('ch-btn', 'ch-btn--icon', `ch-btn--${variant}`, size !== 'm' && `ch-btn--${size}`, className)}
      aria-label={label}
      title={label}
      {...rest}
    />
  );
}

export function Logo({ height = 28, withWordmark = false, label = 'Chameleon' }: { height?: number; withWordmark?: boolean; label?: string }) {
  const mark = (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-block',
        flex: 'none',
        height,
        width: (height * 950) / 550,
        background: 'currentColor',
        WebkitMask: 'url("/logo.svg") center/contain no-repeat',
        mask: 'url("/logo.svg") center/contain no-repeat',
      }}
    />
  );
  if (!withWordmark) return <span style={{ display: 'inline-flex' }}>{mark}</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.4 }}>
      {mark}
      <span style={{ font: `600 ${Math.round(height * 0.82)}px/1 var(--font-sans)`, letterSpacing: '-0.04em' }}>{label}</span>
    </span>
  );
}

export function Tag({ selected = false, onToggle, children }: { selected?: boolean; onToggle?: (next: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" className="ch-tag" aria-pressed={selected} onClick={() => onToggle?.(!selected)}>
      {children}
    </button>
  );
}

export type ToastAction = { label: string; onClick: () => void; muted?: boolean };

export function Toast({ children, actions = [] }: { children: ReactNode; actions?: ToastAction[] }) {
  return (
    <div className="ch-toast ch-glass" role="status">
      <span>{children}</span>
      {actions.map((a, i) => (
        <button key={i} type="button" className={cx('ch-toast__action', a.muted && 'ch-toast__action--muted')} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ label, strike = false, disabled, checked, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; strike?: boolean }) {
  return (
    <label className={cx('ch-check', disabled && 'ch-check--disabled', strike && checked && 'ch-check--done')}>
      <input type="checkbox" disabled={disabled} checked={checked} {...rest} />
      {label}
    </label>
  );
}

export function Switch({ checked = false, onChange, label }: { checked?: boolean; onChange?: (next: boolean) => void; label?: ReactNode }) {
  const btn = <button type="button" role="switch" aria-checked={checked} className="ch-switch" onClick={() => onChange?.(!checked)} />;
  if (!label) return btn;
  return (
    <label className="ch-check" style={{ justifyContent: 'space-between' }}>
      {label}
      {btn}
    </label>
  );
}

export type MenuItem<V extends string = string> =
  | { separator: true }
  | { section: string }
  | { label: string; value: V; shortcut?: string; icon?: ReactNode; danger?: boolean };

export function Menu<V extends string>({ items, onSelect, style }: { items: MenuItem<V>[]; onSelect?: (value: V) => void; style?: CSSProperties }) {
  return (
    <div className="ch-menu" role="menu" style={style}>
      {items.map((it, i) => {
        if ('separator' in it) return <div key={i} className="ch-menu__sep" />;
        if ('section' in it) return <div key={i} className="ch-menu__label">{it.section}</div>;
        return (
          <button key={i} type="button" role="menuitem" className={cx('ch-menu__item', it.danger && 'ch-menu__item--danger')} onClick={() => onSelect?.(it.value)}>
            {it.icon}
            {it.label}
            {it.shortcut && <span className="ch-menu__kbd">{it.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<V extends string>({ items, value, onChange }: { items: { value: V; label: string }[]; value: V; onChange?: (v: V) => void }) {
  return (
    <div className="ch-tabs" role="tablist">
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === value} className="ch-tab" onClick={() => onChange?.(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
