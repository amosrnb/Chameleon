import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { todoInfo } from '../components/TodoItem';
import { DATES, DAYS, DAY_END, DAY_START, HOUR_PX, LESSONS, fmtH } from '../data/seed';
import { IconButton, Tabs } from '../ds';
import { folder, tintOf } from '../lib/model';
import { to } from '../lib/routes';
import { useApp } from '../store/app';

const GRID_H = (DAY_END - DAY_START) * HOUR_PX;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

export function CalendarView() {
  const s = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [day, setDay] = useState(0);
  const dragId = useRef<string | null>(null);

  const days = mode === 'week' ? [0, 1, 2, 3, 4, 5, 6] : [day];
  const cols = `52px repeat(${days.length},minmax(0,1fr))`;
  const openTodos = s.todos.filter((t) => t.status !== 'done');
  const unscheduled = openTodos.filter((t) => !t.sched);

  const startDrag = (id: string) => (e: DragEvent) => {
    dragId.current = id;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  // Drops snap to the half hour under the pointer.
  const drop = (di: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = dragId.current;
    if (!id) return;
    const r = e.currentTarget.getBoundingClientRect();
    let start = DAY_START + Math.floor(((e.clientY - r.top) / HOUR_PX) * 2) / 2;
    start = Math.max(DAY_START, Math.min(DAY_END - 1, start));
    s.scheduleTodo(id, di, start);
    dragId.current = null;
  };

  return (
    <div style={{ padding: '40px 32px 64px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, flex: '999 1 560px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div className="page-head" style={{ flex: 1 }}>
            <div className="ch-label">{mode === 'week' ? 'Oct 5 – 11, 2026' : `${DAYS[day]}, Oct ${DATES[day]}, 2026`}</div>
            <h1 className="display-title">Calendar</h1>
          </div>
          {mode === 'day' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <IconButton label="Previous day" size="s" onClick={() => setDay((d) => Math.max(0, d - 1))}><Icon icon="ChevronLeft" /></IconButton>
              <IconButton label="Next day" size="s" onClick={() => setDay((d) => Math.min(6, d + 1))}><Icon icon="ChevronRight" /></IconButton>
            </div>
          )}
          <Tabs items={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} value={mode} onChange={setMode} />
        </div>

        <div style={{ background: 'var(--surface-card)', borderRadius: 24, padding: '12px 12px 16px', overflowX: 'auto' }}>
          <div style={{ minWidth: 620 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols }}>
              <div />
              {days.map((di) => {
                const today = di === 0;
                return (
                  <button key={di} className="cal-head" style={{ color: today ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => { setMode('day'); setDay(di); }}>
                    <span>{DAYS[di]}</span>
                    <span style={{ minWidth: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', fontWeight: 600, background: today ? 'var(--accent)' : 'transparent', color: today ? 'var(--on-accent)' : 'inherit' }}>{DATES[di]}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: cols, minHeight: 36, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span className="ch-label" style={{ fontSize: 11, paddingTop: 6 }}>All day</span>
              {days.map((di) => (
                <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 3px' }}>
                  {s.exams.filter((e) => e.day === di).map((e) => (
                    <div key={e.id} className="exam-pill" data-tint={tintOf(e.sub, s.tint)}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-soft)', flex: 'none' }} />
                      {e.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: cols, paddingTop: 8 }}>
              <div style={{ position: 'relative', height: GRID_H }}>
                {HOURS.map((h) => (
                  <span key={h} className="ch-label" style={{ position: 'absolute', left: 0, fontSize: 11, lineHeight: 1, top: (h - DAY_START) * HOUR_PX }}>{h}:00</span>
                ))}
              </div>
              {days.map((di) => (
                <div
                  key={di}
                  className="cal-col"
                  style={{ height: GRID_H, backgroundColor: di > 4 ? 'var(--surface-raised)' : 'transparent' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={drop(di)}
                >
                  {LESSONS.filter((l) => l.day === di).map((l, i) => {
                    const f = folder(l.sub)!;
                    return (
                      <div
                        key={'l' + i}
                        className="cal-event"
                        data-tint={f.tint}
                        style={{ top: (l.start - DAY_START) * HOUR_PX, height: (l.end - l.start) * HOUR_PX - 3, background: 'var(--accent-wash)' }}
                        onClick={() => navigate(to.folder(f.id))}
                      >
                        <EventText title={f.name} meta={`${fmtH(l.start)}–${fmtH(l.end)} · ${l.room}`} />
                      </div>
                    );
                  })}
                  {openTodos.filter((t) => t.sched?.day === di).map((t) => (
                    <div
                      key={t.id}
                      className="cal-event"
                      draggable
                      onDragStart={startDrag(t.id)}
                      data-tint={tintOf(t.folder, s.tint)}
                      style={{ top: (t.sched!.start - DAY_START) * HOUR_PX, height: HOUR_PX - 3, background: 'var(--surface-card)', boxShadow: 'inset 0 0 0 1.5px var(--accent-soft)' }}
                      onClick={() => {
                        s.setUi({ todoSel: t.id, todoTab: 'open' });
                        navigate(to.todos());
                      }}
                    >
                      <EventText title={t.title} meta={`${fmtH(t.sched!.start)} · ${folder(t.folder)?.name ?? ''}`} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 220px', maxWidth: '100%' }}>
        <span className="ch-label">Not planned yet</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>Drag a todo onto the calendar to plan it.</span>
        {unscheduled.map((t) => {
          const info = todoInfo(t, s.tint);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={startDrag(t.id)}
              data-tint={info.tint}
              style={{ background: 'var(--surface-card)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'grab' }}
            >
              <span className="dot" style={{ marginTop: 5 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ font: '500 13px/1.3 var(--font-sans)' }}>{t.title}</span>
                <span style={{ fontSize: 12, color: info.dueColor }}>{info.folderName} · {t.due}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventText({ title, meta }: { title: string; meta: string }) {
  return (
    <>
      <span style={{ font: '600 12px/1.2 var(--font-sans)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      <span style={{ font: '500 11px/1.2 var(--font-sans)', color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</span>
    </>
  );
}
