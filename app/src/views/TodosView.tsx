import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { todoInfo } from '../components/TodoItem';
import { DATES, DAYS, FOLDERS, fmtH } from '../data/seed';
import type { Todo, TodoStatus } from '../data/types';
import { Badge, Button, Checkbox, IconButton, Tabs, Tag } from '../ds';
import { descendants, where } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';

const SUBJECTS = FOLDERS.filter((f) => f.type === 'Subject');
const STATUS_TABS: { value: TodoStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export function TodosView() {
  const s = useApp();
  const [newTodo, setNewTodo] = useState('');
  const openCount = s.todos.filter((t) => t.status !== 'done').length;
  const list = s.todos.filter(
    (t) => (s.todoTab === 'done' ? t.status === 'done' : t.status !== 'done') && (s.todoSub === 'all' || descendants(s.todoSub).includes(t.folder)),
  );
  const selected = s.todos.find((t) => t.id === s.todoSel);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 40px 120px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, flex: '999 1 480px' }}>
        <div className="page-head">
          <div className="ch-label">{openCount} open</div>
          <h1 className="display-title">Todos</h1>
        </div>
        <input
          className="ch-input ch-input--pill"
          placeholder="Add a todo and press Enter"
          aria-label="New todo"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !newTodo.trim()) return;
            s.addTodo(newTodo.trim(), s.todoSub === 'all' ? 'y2627' : s.todoSub);
            setNewTodo('');
          }}
          style={{ background: 'var(--surface-card)' }}
        />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            items={[{ value: 'open', label: 'To do' }, { value: 'done', label: 'Done' }]}
            value={s.todoTab}
            onChange={(todoTab) => s.setUi({ todoTab, todoSel: null })}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag selected={s.todoSub === 'all'} onToggle={() => s.setUi({ todoSub: 'all' })}>All</Tag>
            {SUBJECTS.map((f) => (
              <Tag key={f.id} selected={s.todoSub === f.id} onToggle={() => s.setUi({ todoSub: f.id })}>{f.name}</Tag>
            ))}
          </div>
        </div>
        <div className="list-card">
          {list.map((t) => <TodoRow key={t.id} todo={t} selected={t.id === s.todoSel} />)}
          {!list.length && <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 15 }}>Nothing here</div>}
        </div>
      </div>
      {selected && <TodoDetail key={selected.id} todo={selected} />}
    </div>
  );
}

function TodoRow({ todo: t, selected }: { todo: Todo; selected: boolean }) {
  const s = useApp();
  const info = todoInfo(t, s.tint);
  const done = t.subs.filter((x) => x.done).length;
  return (
    <div
      className="hoverable"
      data-tint={info.tint}
      style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '6px 10px', borderRadius: 14, background: selected ? 'var(--surface-selected)' : undefined }}
    >
      <Checkbox checked={info.done} onChange={() => s.toggleTodo(t.id)} aria-label={`Mark “${t.title}” as done`} />
      <div onClick={() => s.setUi({ todoSel: t.id })} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', alignSelf: 'stretch' }}>
        <span style={{ font: '500 15px/1.3 var(--font-sans)', color: info.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: info.done ? 'line-through' : 'none' }}>{t.title}</span>
        {t.kind === 'Homework' && <Badge>Homework</Badge>}
        {t.status === 'inprogress' && <Badge tone="accent">In progress</Badge>}
        {t.subs.length > 0 && <span className="ch-label">{done}/{t.subs.length}</span>}
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        <span className="dot" />
        {info.folderName}
      </span>
      <span style={{ width: 84, textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap', color: info.dueColor }}>{t.due}</span>
    </div>
  );
}

function TodoDetail({ todo: t }: { todo: Todo }) {
  const s = useApp();
  const navigate = useNavigate();
  const [newSub, setNewSub] = useState('');
  const info = todoInfo(t, s.tint);
  return (
    <div
      data-tint={info.tint}
      style={{ position: 'sticky', top: 76, flex: '1 1 300px', maxWidth: 420, boxSizing: 'border-box', background: 'var(--surface-card)', borderRadius: 28, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>{t.title}</div>
        <IconButton label="Close" size="s" onClick={() => s.setUi({ todoSel: null })}><Icon icon="X" /></IconButton>
      </div>
      <Tabs items={STATUS_TABS} value={t.status} onChange={(status) => s.setTodoStatus(t.id, status)} />
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr)', gap: '10px 12px', fontSize: 14, alignItems: 'center' }}>
        <span className="ch-label">Folder</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" />{where(t.folder)}</span>
        <span className="ch-label">Due</span>
        <span style={{ color: info.dueColor }}>{t.due}</span>
        <span className="ch-label">Kind</span>
        <span>{t.kind}</span>
        <span className="ch-label">Planned</span>
        <span>{t.sched ? `${DAYS[t.sched.day]}, Oct ${DATES[t.sched.day]} · ${fmtH(t.sched.start)}` : 'Not planned'}</span>
      </div>
      <div className="divider-top" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="ch-label">Subtasks</span>
        {t.subs.map((x, i) => (
          <Checkbox
            key={i}
            label={x.x}
            strike
            checked={x.done}
            onChange={() => s.updTodo(t.id, { subs: t.subs.map((y, j) => (j === i ? { ...y, done: !y.done } : y)) })}
          />
        ))}
        <input
          className="ch-input"
          placeholder="Add a subtask"
          aria-label="New subtask"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !newSub.trim()) return;
            s.updTodo(t.id, { subs: [...t.subs, { x: newSub.trim(), done: false }] });
            setNewSub('');
          }}
          style={{ height: 34, fontSize: 14 }}
        />
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          if (t.sched) navigate(to.calendar());
          else s.scheduleTodo(t.id, 0, 15);
        }}
      >
        {t.sched ? 'Show in calendar' : 'Plan for today, 15:00'}
      </Button>
    </div>
  );
}
