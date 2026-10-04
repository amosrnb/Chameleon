import { useLayoutEffect, useRef, type CSSProperties } from 'react';

/**
 * Plain-text contentEditable that commits on blur. The DOM owns the text while editing,
 * so React never re-renders children underneath the caret.
 */
export function Editable({ as: Tag = 'div', value, onCommit, style, className }: {
  as?: 'div' | 'h1' | 'h2' | 'p';
  value: string;
  onCommit: (text: string) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value;
  }, [value]);
  return (
    <Tag
      ref={ref as never}
      className={'editable' + (className ? ' ' + className : '')}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      style={style}
      onBlur={(e) => {
        const text = e.currentTarget.textContent ?? '';
        if (text !== value) onCommit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
