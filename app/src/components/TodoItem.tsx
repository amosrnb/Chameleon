import { useNavigate } from 'react-router';
import type { Tint, Todo } from '../data/types';
import { Button, Checkbox } from '../ds';
import { folder, tintOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';

export function todoInfo(t: Todo, base: Tint) {
  const done = t.status === 'done';
  const late = t.bucket === 'overdue' && !done;
  const f = folder(t.folder);
  return {
    done,
    late,
    tint: tintOf(t.folder, base),
    folderName: f?.name ?? '',
    meta: [t.kind === 'Homework' ? 'Homework' : null, f?.name, t.due].filter(Boolean).join(' · '),
    dueColor: late ? 'var(--danger)' : 'var(--text-muted)',
  };
}

/** Compact todo used in the inbox columns and folder overviews. */
export function TodoItem({ todo, colorDue = false, canMove = false }: { todo: Todo; colorDue?: boolean; canMove?: boolean }) {
  const navigate = useNavigate();
  const s = useApp();
  const info = todoInfo(todo, s.tint);
  const open = () => {
    s.setUi({ todoSel: todo.id, todoTab: info.done ? 'done' : 'open' });
    navigate(to.todos());
  };
  return (
    <div className="todo-item hoverable" data-tint={info.tint}>
      <div className="todo-item__check">
        <Checkbox checked={info.done} onChange={() => s.toggleTodo(todo.id)} aria-label={`Mark “${todo.title}” as done`} />
      </div>
      <div className="todo-item__body" onClick={open}>
        <span className="todo-item__title">{todo.title}</span>
        <span className="todo-item__meta" style={colorDue ? { color: info.dueColor } : undefined}>{info.meta}</span>
      </div>
      {canMove && info.late && (
        <Button variant="ghost" size="s" onClick={() => s.updTodo(todo.id, { bucket: 'today', due: 'Today' })}>To today</Button>
      )}
    </div>
  );
}
