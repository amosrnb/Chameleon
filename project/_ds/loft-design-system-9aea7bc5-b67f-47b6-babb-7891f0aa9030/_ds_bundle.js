/* @ds-bundle: {"format":4,"namespace":"LoftDesignSystem_9aea7b","components":[{"name":"Orb","sourcePath":"components/brand/Orb.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Pill","sourcePath":"components/core/Pill.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Menu","sourcePath":"components/navigation/Menu.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/brand/Orb.jsx":"1cba36269279","components/core/Badge.jsx":"44d85334a603","components/core/Button.jsx":"0eca51b928f8","components/core/Card.jsx":"916159c2c90e","components/core/IconButton.jsx":"5126b0202d5f","components/core/Logo.jsx":"f95963be9600","components/core/Pill.jsx":"b7d7b0b706c3","components/core/Tag.jsx":"e3baed759d04","components/feedback/Dialog.jsx":"4b319e6a346d","components/feedback/Toast.jsx":"c4810cdb7403","components/feedback/Tooltip.jsx":"ccd1a7d3316e","components/forms/Checkbox.jsx":"746433591570","components/forms/Input.jsx":"ebdc43fe25f0","components/forms/Radio.jsx":"7c39a94ca4d9","components/forms/Select.jsx":"e09bc7f1c72a","components/forms/Switch.jsx":"36b5265514e4","components/navigation/Menu.jsx":"fbbeaddf4c6b","components/navigation/NavBar.jsx":"06e52567044b","components/navigation/Tabs.jsx":"e3b61cf1701a","ui_kits/app/AllNotes.jsx":"f341744c8972","ui_kits/app/Editor.jsx":"7d7f3ccc17df","ui_kits/app/Overlays.jsx":"9e4339892501","ui_kits/app/Sidebar.jsx":"4c0c85f6613b","ui_kits/app/Topbar.jsx":"9e806e2ec7ad","ui_kits/app/data.jsx":"bb33111db201","ui_kits/app/lucide-icon.jsx":"ab7cd65fb2a1","ui_kits/website/Footer.jsx":"7c1d20b72a2d","ui_kits/website/Home.jsx":"aefc757122ad","ui_kits/website/Pages.jsx":"a4d02986003b","ui_kits/website/lucide-icon.jsx":"ab7cd65fb2a1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LoftDesignSystem_9aea7b = window.LoftDesignSystem_9aea7b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Orb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Orb({
  tint = 'accent',
  size = 120,
  float = false,
  style,
  children,
  className = '',
  ...rest
}) {
  const hi = tint === 'accent' ? 'var(--accent-base)' : 'var(--' + tint + '-500)',
    lo = tint === 'accent' ? 'var(--accent)' : 'var(--' + tint + '-700)';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: 'ch-orb ' + className,
    "aria-hidden": children ? undefined : true,
    style: {
      width: size,
      height: size,
      display: 'grid',
      placeItems: 'center',
      position: style && style.position || 'relative',
      background: 'radial-gradient(circle at 35% 30%,#fff 0%,' + hi + ' 45%,' + lo + ' 82%)',
      animation: float ? 'ch-float 9s ease-in-out infinite alternate' : undefined,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Orb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Orb.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  neutral: ['var(--surface-sunken)', 'var(--text-secondary)'],
  accent: ['var(--accent-wash)', 'var(--accent)'],
  success: ['color-mix(in oklch,var(--success) 16%,transparent)', 'var(--success)'],
  warning: ['color-mix(in oklch,var(--warning) 20%,transparent)', 'var(--sand-700)'],
  danger: ['color-mix(in oklch,var(--danger) 14%,transparent)', 'var(--danger)'],
  inverse: ['var(--surface-inverse)', 'var(--text-inverse)']
};
function Badge({
  tone = 'neutral',
  dot = false,
  children,
  style
}) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    className: "ch-badge",
    style: {
      background: bg,
      color: fg,
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'm',
  icon,
  iconRight,
  children,
  className = '',
  ...rest
}) {
  const cls = ['ch-btn', 'ch-btn--' + variant, size !== 'm' && 'ch-btn--' + size, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), icon, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = 'solid',
  interactive = false,
  padding = 24,
  radius,
  children,
  style,
  className = '',
  ...rest
}) {
  const cls = ['ch-card', variant !== 'solid' && 'ch-card--' + variant, interactive && 'ch-card--interactive', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: {
      padding,
      ...(radius != null ? {
        borderRadius: radius
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  variant = 'ghost',
  size = 'm',
  label,
  children,
  className = '',
  ...rest
}) {
  const cls = ['ch-btn', 'ch-btn--icon', 'ch-btn--' + variant, size !== 'm' && 'ch-btn--' + size, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function Logo({
  src = 'assets/logo.svg',
  height = 28,
  withWordmark = false,
  color = 'currentColor',
  label = 'Chameleon',
  style
}) {
  const mark = /*#__PURE__*/React.createElement("span", {
    role: "img",
    "aria-label": label,
    style: {
      display: 'inline-block',
      flex: 'none',
      height,
      width: height * 950 / 550,
      background: color,
      WebkitMask: 'url("' + src + '") center/contain no-repeat',
      mask: 'url("' + src + '") center/contain no-repeat'
    }
  });
  if (!withWordmark) return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      ...style
    }
  }, mark);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: height * 0.4,
      color,
      ...style
    }
  }, mark, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 ' + Math.round(height * 0.82) + 'px/1 var(--font-sans)',
      letterSpacing: '-0.04em'
    }
  }, label));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Pill({
  tone = 'ink',
  size = 'm',
  label,
  meta,
  children,
  style,
  className = '',
  ...rest
}) {
  const cls = ['ch-pill', tone === 'ink' ? 'ch-ink' : tone === 'glass' ? 'ch-glass' : 'ch-frost', size === 's' && 'ch-pill--s', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: style
  }, rest), label && /*#__PURE__*/React.createElement("span", null, label), meta && /*#__PURE__*/React.createElement("span", {
    className: "ch-pill__muted"
  }, meta), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Pill.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  selected = false,
  onToggle,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: "ch-tag",
    "aria-pressed": selected,
    onClick: () => onToggle && onToggle(!selected)
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  children,
  actions,
  onClose,
  inline = false,
  width,
  style
}) {
  if (!open) return null;
  const box = /*#__PURE__*/React.createElement("div", {
    className: "ch-dialog",
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      ...(width ? {
        maxWidth: width
      } : null),
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    className: "ch-dialog__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "ch-dialog__body"
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    className: "ch-dialog__actions"
  }, actions));
  if (inline) return box;
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-dialog-scrim",
    onClick: onClose
  }, box);
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  children,
  actions = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-toast ch-glass",
    role: "status",
    style: style
  }, /*#__PURE__*/React.createElement("span", null, children), actions.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: 'ch-toast__action' + (a.muted ? ' ch-toast__action--muted' : ''),
    onClick: a.onClick
  }, a.label)));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  shortcut,
  open = false,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: 'ch-tooltip' + (open ? ' ch-tooltip--open' : '')
  }, children, /*#__PURE__*/React.createElement("span", {
    className: "ch-tooltip__bubble",
    role: "tooltip"
  }, label, shortcut && /*#__PURE__*/React.createElement("span", {
    className: "ch-tooltip__kbd"
  }, shortcut)));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  strike = false,
  disabled,
  checked,
  ...rest
}) {
  const cls = ['ch-check', disabled && 'ch-check--disabled', strike && checked && 'ch-check--done'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    disabled: disabled,
    checked: checked
  }, rest)), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  shape = 'rounded',
  id,
  className = '',
  ...rest
}) {
  const iid = id || (label ? 'in-' + label.replace(/\W+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("label", {
    className: "ch-field",
    htmlFor: iid
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ch-field__label"
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: iid,
    className: ['ch-input', shape === 'pill' && 'ch-input--pill', error && 'ch-input--error', className].filter(Boolean).join(' ')
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: 'ch-field__hint' + (error ? ' ch-field__hint--error' : '')
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  disabled,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: 'ch-check' + (disabled ? ' ch-check--disabled' : '')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    disabled: disabled
  }, rest)), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  options = [],
  id,
  ...rest
}) {
  const iid = id || (label ? 'sel-' + label.replace(/\W+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("label", {
    className: "ch-field",
    htmlFor: iid
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ch-field__label"
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: iid,
    className: "ch-input ch-select"
  }, rest), options.map(o => {
    const v = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v.value,
      value: v.value
    }, v.label);
  })), hint && /*#__PURE__*/React.createElement("span", {
    className: "ch-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled
}) {
  const btn = /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    className: "ch-switch",
    onClick: () => onChange && onChange(!checked)
  });
  if (!label) return btn;
  return /*#__PURE__*/React.createElement("label", {
    className: 'ch-check' + (disabled ? ' ch-check--disabled' : ''),
    style: {
      justifyContent: 'space-between'
    }
  }, label, btn);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Menu.jsx
try { (() => {
function Menu({
  items = [],
  onSelect,
  activeIndex,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-menu",
    role: "menu",
    style: style
  }, items.map((it, i) => {
    if (it.separator) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "ch-menu__sep"
    });
    if (it.section) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "ch-menu__label"
    }, it.section);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      role: "menuitem",
      className: ['ch-menu__item', it.danger && 'ch-menu__item--danger', i === activeIndex && 'ch-menu__item--active'].filter(Boolean).join(' '),
      onClick: () => onSelect && onSelect(it, i)
    }, it.icon, it.label, it.shortcut && /*#__PURE__*/React.createElement("span", {
      className: "ch-menu__kbd"
    }, it.shortcut));
  }));
}
Object.assign(__ds_scope, { Menu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Menu.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function NavBar({
  brand = 'Chameleon',
  logo,
  links = [],
  active,
  onNavigate,
  action
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'relative',
      zIndex: 40,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 24,
      padding: '24px 40px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22,
      flexWrap: 'wrap'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => onNavigate && onNavigate(l),
    style: {
      all: 'unset',
      cursor: 'pointer',
      font: 'var(--type-label)',
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      textDecoration: l === active ? 'underline' : 'none',
      textUnderlineOffset: 5,
      textDecorationThickness: 1.5
    }
  }, l))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate && onNavigate(null),
    style: {
      all: 'unset',
      cursor: 'pointer',
      font: '600 26px/1 var(--font-sans)',
      letterSpacing: '-0.04em',
      display: 'inline-flex',
      alignItems: 'center'
    }
  }, logo || brand), /*#__PURE__*/React.createElement("div", {
    style: {
      justifySelf: 'end'
    }
  }, action));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-tabs",
    role: "tablist"
  }, items.map(it => {
    const v = typeof it === 'string' ? it : it.value;
    const l = typeof it === 'string' ? it : it.label;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": v === value,
      className: "ch-tab",
      onClick: () => onChange && onChange(v)
    }, l);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AllNotes.jsx
try { (() => {
const {
  Tabs: ATabs,
  Tag: ATag,
  Card: ACard,
  Button: AB,
  Orb: AOrb
} = window.LoftDesignSystem_9aea7b;
function AllNotes({
  pages,
  go,
  newPage
}) {
  const [view, setView] = React.useState('Gallery');
  const [f, setF] = React.useState('All');
  const list = pages.filter(p => f === 'All' || p.tags.includes(f));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: '0 auto',
      padding: '64px 32px 120px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--fw-display) 72px/.95 var(--font-display)',
      letterSpacing: 'var(--tracking-display)',
      margin: '0 0 28px'
    }
  }, "All notes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      marginBottom: 28
    }
  }, ['All', 'Journal', 'Projects', 'Reading', 'Ideas'].map(x => /*#__PURE__*/React.createElement(ATag, {
    key: x,
    selected: f === x,
    onToggle: () => setF(x)
  }, x)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ATabs, {
    items: ['Gallery', 'List'],
    value: view,
    onChange: setView
  }), /*#__PURE__*/React.createElement(AB, {
    variant: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "Plus"
    }),
    onClick: newPage
  }, "New page"))), view === 'Gallery' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))',
      gap: 16
    }
  }, list.map(p => /*#__PURE__*/React.createElement(ACard, {
    key: p.id,
    interactive: true,
    variant: "window",
    padding: 0,
    radius: 28,
    onClick: () => go(p.id),
    style: {
      position: 'relative',
      height: 200
    }
  }, /*#__PURE__*/React.createElement(AOrb, {
    tint: p.tint,
    size: 130,
    style: {
      position: 'absolute',
      right: -24,
      top: -24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ch-label"
  }, p.edited), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-display) 26px/1 var(--font-display)',
      letterSpacing: 0,
      marginTop: 8
    }
  }, p.title))))) : /*#__PURE__*/React.createElement("div", null, list.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => go(p.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 48,
      borderBottom: '1px solid var(--border-subtle)',
      cursor: 'pointer',
      padding: '0 4px'
    }
  }, /*#__PURE__*/React.createElement(AOrb, {
    tint: p.tint,
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 15px/1 var(--font-sans)'
    }
  }, p.title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 6
    }
  }, p.tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "ch-badge",
    style: {
      background: 'var(--surface-sunken)',
      color: 'var(--text-secondary)'
    }
  }, t))), /*#__PURE__*/React.createElement("span", {
    className: "ch-label",
    style: {
      width: 110,
      textAlign: 'right'
    }
  }, p.edited)))));
}
window.AllNotes = AllNotes;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AllNotes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Editor.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Checkbox: ECheck,
  Tag: ETag,
  Menu: EMenu,
  IconButton: EIB,
  Pill: EPill,
  Orb: EOrb
} = window.LoftDesignSystem_9aea7b;
const INSERT = [{
  section: 'Basic blocks'
}, {
  label: 'Text',
  value: 'p',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "Type"
  })
}, {
  label: 'Heading',
  value: 'h2',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "Heading2"
  }),
  shortcut: '##'
}, {
  label: 'Bulleted list',
  value: 'ul',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "List"
  }),
  shortcut: '-'
}, {
  label: 'To-do',
  value: 'todo',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "SquareCheck"
  }),
  shortcut: '[]'
}, {
  label: 'Quote',
  value: 'quote',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "Quote"
  }),
  shortcut: '>'
}, {
  label: 'Code',
  value: 'code',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "Code"
  }),
  shortcut: '```'
}, {
  label: 'Image',
  value: 'img',
  icon: /*#__PURE__*/React.createElement(Icon, {
    name: "Image"
  })
}];
function Block({
  b,
  onToggle
}) {
  const ed = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    style: {
      outline: 'none'
    }
  };
  switch (b.t) {
    case 'h2':
      return /*#__PURE__*/React.createElement("h2", _extends({}, ed, {
        style: {
          ...ed.style,
          font: '600 22px/1.3 var(--font-sans)',
          letterSpacing: '-0.015em',
          margin: '28px 0 4px'
        }
      }), b.x);
    case 'ul':
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 10,
          padding: '3px 0'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--text-primary)',
          marginTop: 11,
          flex: 'none'
        }
      }), /*#__PURE__*/React.createElement("div", ed, b.x));
    case 'todo':
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '4px 0'
        }
      }, /*#__PURE__*/React.createElement(ECheck, {
        label: b.x,
        strike: true,
        checked: b.done,
        onChange: onToggle
      }));
    case 'quote':
      return /*#__PURE__*/React.createElement("div", _extends({}, ed, {
        style: {
          ...ed.style,
          font: '500 22px/1.4 var(--font-sans)',
          letterSpacing: '-0.015em',
          color: 'var(--text-muted)',
          margin: '20px 0'
        }
      }), b.x);
    case 'code':
      return /*#__PURE__*/React.createElement("pre", _extends({}, ed, {
        style: {
          ...ed.style,
          font: 'var(--type-mono)',
          background: 'var(--surface-sunken)',
          borderRadius: 12,
          padding: '14px 16px',
          margin: '10px 0',
          whiteSpace: 'pre-wrap'
        }
      }), b.x);
    case 'img':
      return /*#__PURE__*/React.createElement("div", {
        style: {
          aspectRatio: '16/8',
          margin: '14px 0',
          borderRadius: 'var(--radius-l)',
          background: 'linear-gradient(180deg,var(--accent-wash),var(--accent-soft))',
          display: 'grid',
          placeItems: 'end start',
          padding: 14,
          boxSizing: 'border-box'
        }
      }, /*#__PURE__*/React.createElement(EPill, {
        size: "s",
        label: b.x,
        meta: "Image"
      }));
    default:
      return /*#__PURE__*/React.createElement("p", _extends({}, ed, {
        style: {
          ...ed.style,
          margin: '4px 0',
          minHeight: '1.55em'
        }
      }), b.x);
  }
}
function Editor({
  page,
  update,
  toast
}) {
  const [menu, setMenu] = React.useState(false);
  const setBlocks = fn => update({
    ...page,
    blocks: fn(page.blocks)
  });
  return /*#__PURE__*/React.createElement("div", {
    "data-tint": page.tint,
    style: {
      maxWidth: 'var(--measure)',
      margin: '0 auto',
      padding: '72px 32px 160px'
    }
  }, /*#__PURE__*/React.createElement(EOrb, {
    tint: "accent",
    size: 56,
    style: {
      marginBottom: 24,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: page.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      marginBottom: 12
    }
  }, "Edited ", page.edited), /*#__PURE__*/React.createElement("h1", {
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: e => update({
      ...page,
      title: e.target.textContent || 'Untitled'
    }),
    style: {
      font: 'var(--fw-display) 72px/.95 var(--font-display)',
      letterSpacing: 'var(--tracking-display)',
      margin: '0 0 16px',
      outline: 'none'
    }
  }, page.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 28
    }
  }, page.tags.map(t => /*#__PURE__*/React.createElement(ETag, {
    key: t,
    selected: true
  }, t)), /*#__PURE__*/React.createElement(ETag, {
    onClick: () => toast('Tags are a demo here')
  }, "+ Tag")), page.blocks.map((b, i) => /*#__PURE__*/React.createElement(Block, {
    key: page.id + i,
    b: b,
    onToggle: () => setBlocks(bs => bs.map((x, j) => j === i ? {
      ...x,
      done: !x.done
    } : x))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenu(m => !m),
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--text-muted)',
      font: '500 14px/1 var(--font-sans)',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus"
  }), "Add a block"), menu && /*#__PURE__*/React.createElement(EMenu, {
    style: {
      position: 'absolute',
      top: 36,
      left: 0,
      zIndex: 10
    },
    items: INSERT,
    onSelect: it => {
      setMenu(false);
      setBlocks(bs => [...bs, {
        t: it.value,
        x: it.value === 'img' ? 'new-image.jpg' : it.value === 'todo' ? 'New to-do' : it.value === 'h2' ? 'Heading' : 'Start typing…',
        done: false
      }]);
    }
  })));
}
window.Editor = Editor;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Editor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Overlays.jsx
try { (() => {
const {
  Dialog: ODialog,
  Menu: OMenu,
  Tabs: OTabs,
  Switch: OSwitch,
  Button: OB,
  Orb: OOrb
} = window.LoftDesignSystem_9aea7b;
function Palette({
  pages,
  go,
  close,
  openSettings,
  newPage
}) {
  const [q, setQ] = React.useState('');
  const [i, setI] = React.useState(1);
  const hits = pages.filter(p => p.title.toLowerCase().includes(q.toLowerCase()));
  const items = [{
    section: 'Pages'
  }, ...hits.map(p => ({
    label: p.title,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: p.icon
    }),
    shortcut: p.edited,
    id: p.id
  })), {
    separator: true
  }, {
    section: 'Actions'
  }, {
    label: 'New page',
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "SquarePen"
    }),
    shortcut: '⌘N',
    act: newPage
  }, {
    label: 'Appearance…',
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "Palette"
    }),
    act: openSettings
  }];
  const sel = it => {
    close();
    if (it.id) go(it.id);else if (it.act) it.act();
  };
  const pickable = items.map((x, k) => x.label ? k : null).filter(k => k !== null);
  const onKey = e => {
    const pos = pickable.indexOf(i);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setI(pickable[Math.min(pos + 1, pickable.length - 1)]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setI(pickable[Math.max(pos - 1, 0)]);
    }
    if (e.key === 'Enter' && items[i]) sel(items[i]);
    if (e.key === 'Escape') close();
  };
  React.useEffect(() => {
    setI(pickable[0]);
  }, [q]);
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-dialog-scrim",
    style: {
      placeItems: 'start center',
      paddingTop: '14vh'
    },
    onClick: close
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 560,
      borderRadius: 36,
      background: 'var(--window-bg)',
      backdropFilter: 'var(--blur-window)',
      WebkitBackdropFilter: 'var(--blur-window)',
      boxShadow: 'var(--shadow-window)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 18px',
      height: 56,
      borderBottom: '1px solid var(--border-subtle)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Search",
    size: 18
  }), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: q,
    onChange: e => setQ(e.target.value),
    onKeyDown: onKey,
    placeholder: "Search pages or run a command",
    style: {
      flex: 1,
      border: 0,
      outline: 'none',
      background: 'transparent',
      font: '500 17px/1 var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ch-kbd"
  }, "esc")), /*#__PURE__*/React.createElement(OMenu, {
    items: items,
    activeIndex: i,
    onSelect: sel,
    style: {
      boxShadow: 'none',
      borderRadius: 0,
      padding: 8,
      maxHeight: 360,
      overflow: 'auto',
      background: 'transparent'
    }
  })));
}
function Settings({
  theme,
  setTheme,
  tint,
  setTint,
  close
}) {
  const [spell, setSpell] = React.useState(true);
  const [wide, setWide] = React.useState(false);
  return /*#__PURE__*/React.createElement(ODialog, {
    title: "Appearance",
    onClose: close,
    width: 440,
    style: {
      background: 'var(--window-bg)',
      backdropFilter: 'var(--blur-window)',
      WebkitBackdropFilter: 'var(--blur-window)',
      boxShadow: 'var(--shadow-window)',
      borderRadius: 36
    },
    actions: /*#__PURE__*/React.createElement(OB, {
      variant: "primary",
      onClick: close
    }, "Done")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 22,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-ui)'
    }
  }, "Theme"), /*#__PURE__*/React.createElement(OTabs, {
    items: ['Light', 'Dark'],
    value: theme === 'dark' ? 'Dark' : 'Light',
    onChange: v => setTheme(v.toLowerCase())
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-ui)'
    }
  }, "Accent"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, TINTS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    "aria-label": t,
    onClick: () => setTint(t),
    style: {
      all: 'unset',
      cursor: 'pointer',
      borderRadius: '50%',
      boxShadow: tint === t ? '0 0 0 2px var(--surface-card),0 0 0 4px var(--text-primary)' : 'none',
      transition: 'box-shadow var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement(OOrb, {
    tint: t,
    size: 30
  }))))), /*#__PURE__*/React.createElement(OSwitch, {
    checked: spell,
    onChange: setSpell,
    label: "Spellcheck"
  }), /*#__PURE__*/React.createElement(OSwitch, {
    checked: wide,
    onChange: setWide,
    label: "Full-width pages"
  })));
}
Object.assign(window, {
  Palette,
  Settings
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Overlays.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Sidebar.jsx
try { (() => {
const {
  Tooltip,
  IconButton: SIB
} = window.LoftDesignSystem_9aea7b;
function SideRow({
  icon,
  label,
  active,
  depth = 0,
  onClick,
  caret,
  open,
  onCaret,
  tint,
  right
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 32,
      padding: '0 8px 0 ' + (8 + depth * 16) + 'px',
      borderRadius: 10,
      cursor: 'pointer',
      background: active ? 'var(--surface-selected)' : h ? 'var(--surface-hover)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      font: '500 14px/1 var(--font-sans)'
    }
  }, caret ? /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onCaret && onCaret();
    },
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 16,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: open ? 'ChevronDown' : 'ChevronRight',
    size: 14
  })) : depth > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    "data-tint": tint,
    style: {
      color: tint ? 'var(--accent)' : 'var(--text-muted)',
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, label), right);
}
function Sidebar({
  current,
  go,
  openPalette,
  openSettings,
  newPage,
  pages
}) {
  const [open, setOpen] = React.useState({
    journal: true,
    projects: true
  });
  const roots = pages.filter(p => !p.parent);
  const tree = (p, d) => [/*#__PURE__*/React.createElement(SideRow, {
    key: p.id,
    icon: p.icon,
    tint: p.tint,
    label: p.title,
    depth: d,
    active: current === p.id,
    caret: !!p.children,
    open: open[p.id],
    onCaret: () => setOpen(o => ({
      ...o,
      [p.id]: !o[p.id]
    })),
    onClick: () => go(p.id)
  }), ...(p.children && open[p.id] ? p.children.map(c => tree(pages.find(x => x.id === c), d + 1)) : [])];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-w)',
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '14px 10px',
      boxSizing: 'border-box',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px 14px'
    }
  }, /*#__PURE__*/React.createElement(LogoMark, {
    height: 20,
    withWordmark: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronsUpDown",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    label: "New page",
    shortcut: "\u2318N"
  }, /*#__PURE__*/React.createElement(SIB, {
    label: "New page",
    size: "s",
    onClick: newPage
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "SquarePen"
  }))))), /*#__PURE__*/React.createElement(SideRow, {
    icon: "Search",
    label: "Search",
    onClick: openPalette,
    right: /*#__PURE__*/React.createElement("span", {
      className: "ch-kbd"
    }, "\u2318K")
  }), /*#__PURE__*/React.createElement(SideRow, {
    icon: "LayoutGrid",
    label: "All notes",
    active: current === 'home',
    onClick: () => go('home')
  }), /*#__PURE__*/React.createElement("div", {
    className: "ch-eyebrow",
    style: {
      padding: '18px 8px 8px',
      fontSize: 12
    }
  }, "Pages"), roots.map(p => tree(p, 0)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(SideRow, {
    icon: "Trash2",
    label: "Trash",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(SideRow, {
    icon: "Settings2",
    label: "Settings",
    onClick: openSettings
  })));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Topbar.jsx
try { (() => {
const {
  Button: TB,
  IconButton: TIB,
  Badge: TBadge,
  Tooltip: TT
} = window.LoftDesignSystem_9aea7b;
function Topbar({
  page,
  pages,
  go,
  onShare,
  onMore
}) {
  const parent = page && page.parent && pages.find(p => p.id === page.parent);
  const crumb = p => /*#__PURE__*/React.createElement("button", {
    onClick: () => go(p.id),
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: '4px 6px',
      borderRadius: 8
    }
  }, p.title);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 52,
      padding: '0 14px',
      position: 'sticky',
      top: 0,
      zIndex: 5,
      borderRadius: '28px 28px 0 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      font: 'var(--type-label)',
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)'
    }
  }, page ? /*#__PURE__*/React.createElement(React.Fragment, null, parent && /*#__PURE__*/React.createElement(React.Fragment, null, crumb(parent), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "/")), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 6px',
      color: 'var(--text-primary)'
    }
  }, page.title)) : /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 6px',
      color: 'var(--text-primary)'
    }
  }, "All notes")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, page && /*#__PURE__*/React.createElement("span", {
    className: "ch-eyebrow",
    style: {
      fontSize: 12,
      marginRight: 6
    }
  }, "Edited ", page.edited), /*#__PURE__*/React.createElement(TBadge, {
    tone: "success",
    dot: true
  }, "Synced"), /*#__PURE__*/React.createElement(TB, {
    size: "s",
    variant: "ghost",
    onClick: onShare
  }, "Share"), /*#__PURE__*/React.createElement(TT, {
    label: "More"
  }, /*#__PURE__*/React.createElement(TIB, {
    label: "More",
    size: "s",
    onClick: onMore
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Ellipsis"
  })))));
}
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.jsx
try { (() => {
const TINTS = ['sky', 'sage', 'sand', 'lilac', 'blush'];
const PAGES = [{
  id: 'inbox',
  title: 'Inbox',
  icon: 'Inbox',
  tint: 'sky',
  edited: 'Just now',
  tags: [],
  blocks: [{
    t: 'p',
    x: 'Quick captures land here. Sort them on Fridays.'
  }, {
    t: 'todo',
    x: 'Book dentist',
    done: false
  }, {
    t: 'todo',
    x: 'Reply to Ana about the garden plan',
    done: true
  }, {
    t: 'todo',
    x: 'Renew library card',
    done: false
  }]
}, {
  id: 'journal',
  title: 'Journal',
  icon: 'BookOpen',
  tint: 'sand',
  edited: 'Yesterday',
  tags: ['Journal'],
  children: ['w40', 'w39'],
  blocks: [{
    t: 'p',
    x: 'One page per week. Three questions, short answers.'
  }]
}, {
  id: 'w40',
  title: 'Week 40',
  icon: 'CalendarDays',
  tint: 'sand',
  parent: 'journal',
  edited: '2 min ago',
  tags: ['Journal'],
  blocks: [{
    t: 'h2',
    x: 'What moved'
  }, {
    t: 'ul',
    x: 'Shipped the first draft of the reading list'
  }, {
    t: 'ul',
    x: 'Walked the canal path three mornings'
  }, {
    t: 'h2',
    x: 'What stalled'
  }, {
    t: 'p',
    x: 'The garden plan is waiting on soil test results. Nothing to do until they arrive.'
  }, {
    t: 'quote',
    x: 'Small notes, kept often, beat long notes kept rarely.'
  }, {
    t: 'h2',
    x: 'Next week'
  }, {
    t: 'todo',
    x: 'Call the nursery about hedges',
    done: false
  }, {
    t: 'todo',
    x: 'Finish chapter four',
    done: true
  }, {
    t: 'todo',
    x: 'Back up photos',
    done: false
  }]
}, {
  id: 'w39',
  title: 'Week 39',
  icon: 'CalendarDays',
  tint: 'sand',
  parent: 'journal',
  edited: 'Sep 27',
  tags: ['Journal'],
  blocks: [{
    t: 'p',
    x: 'Quiet week. Mostly reading.'
  }]
}, {
  id: 'projects',
  title: 'Projects',
  icon: 'FolderOpen',
  tint: 'sage',
  edited: 'Sep 30',
  tags: ['Projects'],
  children: ['garden', 'reading'],
  blocks: [{
    t: 'p',
    x: 'Active projects. Archive when done.'
  }]
}, {
  id: 'garden',
  title: 'Garden redesign',
  icon: 'Sprout',
  tint: 'sage',
  parent: 'projects',
  edited: 'Sep 30',
  tags: ['Projects'],
  blocks: [{
    t: 'p',
    x: 'Replace the lawn strip with low hedges and a gravel path.'
  }, {
    t: 'img',
    x: 'site-plan.jpg'
  }, {
    t: 'code',
    x: 'bed A  2.4 × 1.2 m\nbed B  3.0 × 1.2 m\npath   0.9 m wide'
  }, {
    t: 'todo',
    x: 'Soil test',
    done: true
  }, {
    t: 'todo',
    x: 'Order gravel',
    done: false
  }]
}, {
  id: 'reading',
  title: 'Reading list',
  icon: 'Library',
  tint: 'lilac',
  parent: 'projects',
  edited: 'Sep 22',
  tags: ['Reading'],
  blocks: [{
    t: 'ul',
    x: 'The Overstory'
  }, {
    t: 'ul',
    x: 'A Pattern Language'
  }, {
    t: 'ul',
    x: 'Braiding Sweetgrass'
  }]
}, {
  id: 'ideas',
  title: 'Ideas',
  icon: 'Lightbulb',
  tint: 'blush',
  edited: 'Sep 18',
  tags: ['Ideas'],
  blocks: [{
    t: 'p',
    x: 'Loose threads. No pressure to finish any of them.'
  }]
}];
window.TINTS = TINTS;
window.PAGES = PAGES;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/lucide-icon.jsx
try { (() => {
function Icon({
  name,
  size = 16,
  stroke = 1.75,
  style
}) {
  const node = window.lucide && window.lucide.icons && window.lucide.icons[name] || [];
  const kids = (node[0] === 'svg' ? node[2] : node) || [];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    }
  }, kids.map(([t, a], i) => React.createElement(t, {
    key: i,
    ...a
  })));
}
window.Icon = Icon;
function LogoMark({
  height = 28,
  withWordmark = false
}) {
  const m = /*#__PURE__*/React.createElement("span", {
    role: "img",
    "aria-label": "Chameleon",
    style: {
      display: 'inline-block',
      flex: 'none',
      height,
      width: height * 950 / 550,
      background: 'currentColor',
      WebkitMask: 'url("../../assets/logo.svg") center/contain no-repeat',
      mask: 'url("../../assets/logo.svg") center/contain no-repeat'
    }
  });
  return withWordmark ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: height * 0.4
    }
  }, m, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 ' + Math.round(height * 0.82) + 'px/1 var(--font-sans)',
      letterSpacing: '-0.04em'
    }
  }, "Chameleon")) : m;
}
window.LogoMark = LogoMark;
function LocalDotRule({
  size = 6,
  color,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "separator",
    className: "ch-dotrule",
    style: {
      '--h': size + 'px',
      ...(color ? {
        color
      } : null),
      ...style
    }
  });
}
function LocalDotField({
  cols = 24,
  rows = 6,
  fade = 'none',
  ratio = .9,
  color = 'currentColor',
  style
}) {
  const o = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    let f = 1;
    const u = cols > 1 ? i / (cols - 1) : 0,
      v = rows > 1 ? j / (rows - 1) : 0;
    if (fade === 'right') f = 1 - u;else if (fade === 'left') f = u;else if (fade === 'down') f = 1 - v;else if (fade === 'up') f = v;else if (fade === 'radial') {
      f = 1 - Math.min(1, Math.hypot(u - .5, v - .5) * 2);
    }
    const r = .5 * ratio * Math.pow(f, .6);
    if (r > .05) o.push(/*#__PURE__*/React.createElement("circle", {
      key: i + '-' + j,
      cx: i + .5,
      cy: j + .5,
      r: r
    }));
  }
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 ' + cols + ' ' + rows,
    width: "100%",
    style: {
      display: 'block',
      color,
      ...style
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor"
  }, o));
}
function LocalDotLoader({
  size = 6,
  color = 'currentColor'
}) {
  const ord = [0, 1, 2, 5, 8, 7, 6, 3, 4];
  return /*#__PURE__*/React.createElement("span", {
    className: "ch-dotloader",
    role: "status",
    style: {
      '--s': size + 'px',
      color
    }
  }, Array.from({
    length: 9
  }, (_, k) => /*#__PURE__*/React.createElement("i", {
    key: k,
    style: {
      animationDelay: ord.indexOf(k) * .11 + 's'
    }
  })));
}
(function () {
  const NS = window.LoftDesignSystem_9aea7b = window.LoftDesignSystem_9aea7b || {};
  NS.DotRule = NS.DotRule || LocalDotRule;
  NS.DotField = NS.DotField || LocalDotField;
  NS.DotLoader = NS.DotLoader || LocalDotLoader;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/lucide-icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function Footer({
  go
}) {
  const col = (h, items) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10,
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ch-label"
  }, h), items.map(([l, a]) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => {
      e.preventDefault();
      a && go(a);
    },
    style: {
      textDecoration: 'none',
      font: '500 16px/1.3 var(--font-sans)'
    }
  }, l)));
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      position: 'relative',
      padding: '0 40px 0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1.5px solid var(--text-primary)',
      paddingTop: 28,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
      gap: 32
    }
  }, col('Product', [['Overview', 'product'], ['Pricing', 'pricing'], ['Download', 'download']]), col('Studio', [['Changelog'], ['Press kit'], ['hello@chameleon.app']]), col('Elsewhere', [['Mastodon'], ['GitHub'], ['YouTube']]), /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      textAlign: 'right',
      alignSelf: 'end'
    }
  }, "\xA9 2026 \xB7 Privacy \xB7 Terms")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 clamp(80px,19vw,280px)/.8 var(--font-sans)',
      letterSpacing: '-0.07em',
      textAlign: 'center',
      margin: '56px 0 -0.12em',
      whiteSpace: 'nowrap'
    }
  }, "Chameleon"));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
const {
  Button: HB,
  Pill: HPill,
  Card: HCard,
  Orb: HOrb,
  Badge: HBadge
} = window.LoftDesignSystem_9aea7b;
const SPACES = [{
  id: 'journal',
  name: 'Journal',
  tint: 'sky',
  date: '02.10.26',
  title: 'Week 40',
  text: 'Shipped the reading list draft. Walked the canal path three mornings.',
  tags: ['Journal', 'Weekly']
}, {
  id: 'garden',
  name: 'Garden',
  tint: 'sage',
  date: '30.09.26',
  title: 'Hedges',
  text: 'Replace the lawn strip with low hedges and a gravel path, 0.9 m wide.',
  tags: ['Project', 'Outdoor']
}, {
  id: 'reading',
  name: 'Reading',
  tint: 'lilac',
  date: '22.09.26',
  title: 'Up next',
  text: 'The Overstory, A Pattern Language, Braiding Sweetgrass.',
  tags: ['List']
}, {
  id: 'ideas',
  name: 'Ideas',
  tint: 'blush',
  date: '18.09.26',
  title: 'Loose threads',
  text: 'No pressure to finish any of them.',
  tags: ['Ideas']
}];
function Window({
  tilt = -2,
  width = 860
}) {
  const [s, setS] = React.useState(SPACES[0]);
  return /*#__PURE__*/React.createElement("div", {
    "data-tint": s.tint,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(HCard, {
    variant: "window",
    padding: 0,
    style: {
      width: 'min(100%,' + width + 'px)',
      height: 420,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      transform: 'rotate(' + tilt + 'deg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      background: 'rgba(255,255,255,.35)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 15px/1 var(--font-sans)',
      marginBottom: 14
    }
  }, "Spaces"), SPACES.map(x => /*#__PURE__*/React.createElement("button", {
    key: x.id,
    "data-tint": x.tint,
    onClick: () => setS(x),
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 34,
      padding: '0 10px',
      borderRadius: 10,
      font: '500 14px/1 var(--font-sans)',
      background: s.id === x.id ? 'rgba(255,255,255,.7)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(HOrb, {
    tint: x.tint,
    size: 12
  }), x.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '44px 52px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      color: 'var(--text-secondary)'
    }
  }, s.name, " \u2014 ", s.date), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-display) 64px/.95 var(--font-display)',
      letterSpacing: 'var(--tracking-display)',
      margin: '14px 0 18px'
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      lineHeight: 1.6,
      color: 'var(--text-secondary)',
      maxWidth: 440
    }
  }, s.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 22
    }
  }, s.tags.map(t => /*#__PURE__*/React.createElement(HBadge, {
    key: t,
    tone: "accent",
    style: {
      height: 30,
      padding: '0 14px',
      fontSize: 13
    }
  }, t))))), /*#__PURE__*/React.createElement(HPill, {
    label: s.name === 'Journal' ? 'Sky' : s.tint[0].toUpperCase() + s.tint.slice(1),
    meta: s.name + ' tint',
    style: {
      position: 'absolute',
      left: '8%',
      top: '62%'
    }
  }), /*#__PURE__*/React.createElement(HPill, {
    label: "\u2318K",
    meta: "Find anything",
    style: {
      position: 'absolute',
      right: '9%',
      top: '88%'
    }
  }));
}
function Hero({
  go
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '40px 0 120px'
    }
  }, /*#__PURE__*/React.createElement(HOrb, {
    tint: "sky",
    size: 520,
    float: true,
    style: {
      position: 'absolute',
      left: -140,
      top: 180
    }
  }), /*#__PURE__*/React.createElement(HOrb, {
    tint: "blush",
    size: 380,
    style: {
      position: 'absolute',
      right: -60,
      top: 20
    }
  }), /*#__PURE__*/React.createElement(HOrb, {
    tint: "sand",
    size: 200,
    float: true,
    style: {
      position: 'absolute',
      right: '24%',
      bottom: 10
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      position: 'relative',
      textAlign: 'center',
      margin: 0,
      font: 'var(--fw-display) clamp(60px,9.6vw,var(--fs-display-l))/var(--lh-tight) var(--font-display)',
      letterSpacing: 'var(--tracking-display)'
    }
  }, "Soft notes", /*#__PURE__*/React.createElement("br", null), "for hard thinking."), /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      margin: '8px 40px 48px',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "v1.4 \xB7 Mac, Windows, Web"), /*#__PURE__*/React.createElement("span", null, "Offline-first \xB7 Five tints")), /*#__PURE__*/React.createElement(Window, null));
}
function Statement() {
  const dot = t => /*#__PURE__*/React.createElement(HOrb, {
    tint: t,
    size: "0.8em",
    style: {
      display: 'inline-block',
      verticalAlign: '-0.08em',
      margin: '0 .12em'
    }
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px var(--gutter)',
      display: 'grid',
      placeItems: 'center',
      gap: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'min(100%,1100px)',
      height: 1,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 clamp(36px,5vw,var(--fs-display-m))/1.05 var(--font-sans)',
      letterSpacing: '-0.05em',
      textAlign: 'center',
      maxWidth: 1100,
      margin: 0,
      textWrap: 'balance',
      order: 2
    }
  }, "Chameleon ", dot('sky'), " is a notes tool that takes the colour ", dot('blush'), " of whatever you're working on ", dot('sage')));
}
const FEATURES = [['01', 'Blocks', 'sky', 'Text, to-dos, code and images. Drag to arrange; type / to insert.'], ['02', 'Tints', 'blush', 'Five colours. A page or a whole space can wear one.'], ['03', 'Offline', 'sand', 'Everything lives on your device first and syncs when it can.']];
function Features() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '40px var(--gutter) 120px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 24
    }
  }, FEATURES.map(([n, h, t, x], i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      position: 'relative',
      paddingTop: 60
    }
  }, /*#__PURE__*/React.createElement(HOrb, {
    tint: t,
    size: 180,
    style: {
      position: 'absolute',
      right: 20,
      top: 0
    }
  }), /*#__PURE__*/React.createElement(HCard, {
    variant: "window",
    padding: 32,
    style: {
      position: 'relative',
      minHeight: 260,
      display: 'flex',
      flexDirection: 'column',
      transform: 'rotate(' + (i - 1) * 1.5 + 'deg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ch-label",
    style: {
      color: 'var(--text-secondary)'
    }
  }, n, " \u2014 ", h), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--fw-display) 48px/.95 var(--font-display)',
      letterSpacing: 'var(--tracking-display)',
      margin: 'auto 0 12px'
    }
  }, h), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--text-secondary)',
      fontSize: 17
    }
  }, x)))));
}
function Tints() {
  const [h, setH] = React.useState('sky');
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '60px var(--gutter) 140px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      color: 'var(--text-primary)',
      marginBottom: 28
    }
  }, "Five tints \xB7 pick one per page"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 'clamp(12px,3vw,40px)',
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, ['sky', 'sage', 'sand', 'lilac', 'blush'].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    onMouseEnter: () => setH(t),
    style: {
      position: 'relative',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(HOrb, {
    tint: t,
    size: h === t ? 190 : 140,
    style: {
      transition: 'width var(--dur-base) var(--ease-out),height var(--dur-base) var(--ease-out)'
    }
  }), h === t && /*#__PURE__*/React.createElement(HPill, {
    size: "s",
    label: t[0].toUpperCase() + t.slice(1),
    style: {
      position: 'absolute',
      left: '50%',
      bottom: -14,
      transform: 'translateX(-50%)'
    }
  })))));
}
function CTA({
  go
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '140px var(--gutter)',
      textAlign: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(HOrb, {
    tint: "lilac",
    size: 340,
    float: true,
    style: {
      position: 'absolute',
      left: '8%',
      top: 30
    }
  }), /*#__PURE__*/React.createElement(HOrb, {
    tint: "sky",
    size: 240,
    style: {
      position: 'absolute',
      right: '10%',
      bottom: -40
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      position: 'relative',
      font: 'var(--fw-display) clamp(56px,8vw,var(--fs-display-l))/var(--lh-tight) var(--font-display)',
      letterSpacing: 'var(--tracking-display)',
      margin: '0 0 36px'
    }
  }, "Start soft."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(HB, {
    size: "l",
    onClick: () => go('download')
  }, "Download Chameleon")));
}
function Home({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Hero, {
    go: go
  }), /*#__PURE__*/React.createElement(Statement, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(Tints, null), /*#__PURE__*/React.createElement(CTA, {
    go: go
  }));
}
Object.assign(window, {
  Home,
  Window,
  Features,
  Tints,
  Statement
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Pages.jsx
try { (() => {
const {
  Button: PB,
  Tabs: PTabs,
  Card: PCard,
  Badge: PBadge,
  Orb: POrb,
  Pill: PPill
} = window.LoftDesignSystem_9aea7b;
function PageHead({
  title,
  label
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      textAlign: 'center',
      padding: '60px var(--gutter) 56px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ch-label",
    style: {
      color: 'var(--text-primary)',
      marginBottom: 20
    }
  }, label), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '600 clamp(64px,10vw,var(--fs-display-l))/var(--lh-tight) var(--font-sans)',
      letterSpacing: 'var(--tracking-display)',
      margin: 0
    }
  }, title));
}
function Product({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
    label: "Product",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Built for", /*#__PURE__*/React.createElement("br", null), "small notes.")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '0 0 80px'
    }
  }, /*#__PURE__*/React.createElement(POrb, {
    tint: "sage",
    size: 420,
    style: {
      position: 'absolute',
      right: -80,
      top: -60
    }
  }), /*#__PURE__*/React.createElement(POrb, {
    tint: "lilac",
    size: 260,
    style: {
      position: 'absolute',
      left: -40,
      bottom: 0
    }
  }), /*#__PURE__*/React.createElement(Window, {
    tilt: 1.5
  })), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(Tints, null));
}
function Pricing({
  go
}) {
  const [b, setB] = React.useState('Yearly');
  const plans = [['Personal', 'Free', 'sand', 'For one person, on every device.', ['Unlimited pages', 'Offline sync', 'Five tints']], ['Pro', b === 'Yearly' ? '€6' : '€8', 'sky', 'For people who write every day.', ['Everything in Personal', 'Version history', 'Publish to the web']], ['Team', b === 'Yearly' ? '€10' : '€12', 'blush', 'Shared spaces for small teams.', ['Everything in Pro', 'Shared spaces', 'Roles']]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
    label: "Pricing",
    title: "Pay for depth."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement(PTabs, {
    items: ['Monthly', 'Yearly'],
    value: b,
    onChange: setB
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1140,
      margin: '0 auto',
      padding: '0 var(--gutter) 120px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: 24
    }
  }, plans.map(([n, p, t, d, f], k) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      position: 'relative',
      paddingTop: 50
    }
  }, /*#__PURE__*/React.createElement(POrb, {
    tint: t,
    size: k === 1 ? 200 : 150,
    style: {
      position: 'absolute',
      right: 10,
      top: 0
    }
  }), /*#__PURE__*/React.createElement(PCard, {
    variant: "window",
    padding: 32,
    style: {
      position: 'relative',
      transform: k === 1 ? 'rotate(-1.5deg)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ch-label",
    style: {
      color: 'var(--text-primary)'
    }
  }, n), k === 1 && /*#__PURE__*/React.createElement(PBadge, {
    tone: "inverse"
  }, "Popular")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 72px/1 var(--font-sans)',
      letterSpacing: '-0.06em',
      margin: '28px 0 8px'
    }
  }, p, /*#__PURE__*/React.createElement("span", {
    className: "ch-label",
    style: {
      marginLeft: 8,
      letterSpacing: '.04em'
    }
  }, p === 'Free' ? '' : '/ mo')), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)',
      margin: '0 0 24px'
    }
  }, d), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 28px',
      display: 'grid',
      gap: 10
    }
  }, f.map(x => /*#__PURE__*/React.createElement("li", {
    key: x,
    "data-tint": t,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(POrb, {
    tint: t,
    size: 10
  }), x))), /*#__PURE__*/React.createElement(PB, {
    variant: k === 1 ? 'primary' : 'secondary',
    style: {
      width: '100%'
    },
    onClick: () => go('download')
  }, k === 0 ? 'Download' : 'Start free trial'))))));
}
function Download() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      minHeight: '78vh',
      display: 'grid',
      placeItems: 'center',
      padding: '40px var(--gutter) 120px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(POrb, {
    tint: "sky",
    size: 640,
    float: true,
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: -320,
      marginTop: -340
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      textAlign: 'center',
      display: 'grid',
      gap: 28,
      justifyItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '600 clamp(64px,10vw,var(--fs-display-l))/var(--lh-tight) var(--font-sans)',
      letterSpacing: 'var(--tracking-display)',
      color: '#fff',
      margin: 0
    }
  }, "Get", /*#__PURE__*/React.createElement("br", null), "Chameleon"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(PB, {
    size: "l",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "Download",
      size: 18
    })
  }, "Download for Mac"), /*#__PURE__*/React.createElement(PB, {
    variant: "secondary",
    size: "l"
  }, "Open in browser")), /*#__PURE__*/React.createElement(PPill, {
    size: "s",
    label: "v1.4",
    meta: "macOS 13 or later"
  })));
}
Object.assign(window, {
  Product,
  Pricing,
  Download
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Pages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/lucide-icon.jsx
try { (() => {
function Icon({
  name,
  size = 16,
  stroke = 1.75,
  style
}) {
  const node = window.lucide && window.lucide.icons && window.lucide.icons[name] || [];
  const kids = (node[0] === 'svg' ? node[2] : node) || [];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    }
  }, kids.map(([t, a], i) => React.createElement(t, {
    key: i,
    ...a
  })));
}
window.Icon = Icon;
function LogoMark({
  height = 28,
  withWordmark = false
}) {
  const m = /*#__PURE__*/React.createElement("span", {
    role: "img",
    "aria-label": "Chameleon",
    style: {
      display: 'inline-block',
      flex: 'none',
      height,
      width: height * 950 / 550,
      background: 'currentColor',
      WebkitMask: 'url("../../assets/logo.svg") center/contain no-repeat',
      mask: 'url("../../assets/logo.svg") center/contain no-repeat'
    }
  });
  return withWordmark ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: height * 0.4
    }
  }, m, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 ' + Math.round(height * 0.82) + 'px/1 var(--font-sans)',
      letterSpacing: '-0.04em'
    }
  }, "Chameleon")) : m;
}
window.LogoMark = LogoMark;
function LocalDotRule({
  size = 6,
  color,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "separator",
    className: "ch-dotrule",
    style: {
      '--h': size + 'px',
      ...(color ? {
        color
      } : null),
      ...style
    }
  });
}
function LocalDotField({
  cols = 24,
  rows = 6,
  fade = 'none',
  ratio = .9,
  color = 'currentColor',
  style
}) {
  const o = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    let f = 1;
    const u = cols > 1 ? i / (cols - 1) : 0,
      v = rows > 1 ? j / (rows - 1) : 0;
    if (fade === 'right') f = 1 - u;else if (fade === 'left') f = u;else if (fade === 'down') f = 1 - v;else if (fade === 'up') f = v;else if (fade === 'radial') {
      f = 1 - Math.min(1, Math.hypot(u - .5, v - .5) * 2);
    }
    const r = .5 * ratio * Math.pow(f, .6);
    if (r > .05) o.push(/*#__PURE__*/React.createElement("circle", {
      key: i + '-' + j,
      cx: i + .5,
      cy: j + .5,
      r: r
    }));
  }
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 ' + cols + ' ' + rows,
    width: "100%",
    style: {
      display: 'block',
      color,
      ...style
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor"
  }, o));
}
function LocalDotLoader({
  size = 6,
  color = 'currentColor'
}) {
  const ord = [0, 1, 2, 5, 8, 7, 6, 3, 4];
  return /*#__PURE__*/React.createElement("span", {
    className: "ch-dotloader",
    role: "status",
    style: {
      '--s': size + 'px',
      color
    }
  }, Array.from({
    length: 9
  }, (_, k) => /*#__PURE__*/React.createElement("i", {
    key: k,
    style: {
      animationDelay: ord.indexOf(k) * .11 + 's'
    }
  })));
}
(function () {
  const NS = window.LoftDesignSystem_9aea7b = window.LoftDesignSystem_9aea7b || {};
  NS.DotRule = NS.DotRule || LocalDotRule;
  NS.DotField = NS.DotField || LocalDotField;
  NS.DotLoader = NS.DotLoader || LocalDotLoader;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/lucide-icon.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Orb = __ds_scope.Orb;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Menu = __ds_scope.Menu;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
