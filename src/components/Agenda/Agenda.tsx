import { useState } from 'react';
import type { CourseInfo, NormalizedAnnouncement, NormalizedTask } from '../../types';
import { useTasksStore, applyFilters } from '../../hooks/useTasks';
import { formatDueDate } from '../../utils/dateUtils';

interface AgendaProps {
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
  courses: CourseInfo[];
  loading: boolean;
}

interface Bucket {
  key: string;
  label: string;
  tasks: NormalizedTask[];
  tone?: 'urgente';
  openByDefault: boolean;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysFromToday = (d: Date) => Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);

/**
 * Divide as lições pendentes em poucos baldes claros, do mais urgente ao mais distante.
 * Os próximos (atrasadas, hoje, amanhã, esta semana) abrem sozinhos; o resto fica recolhido.
 */
function bucketize(tasks: NormalizedTask[]): Bucket[] {
  const b: Record<string, NormalizedTask[]> = { atrasadas: [], hoje: [], amanha: [], semana: [], depois: [], semdata: [] };
  for (const t of tasks) {
    if (!t.dueDate) { b.semdata.push(t); continue; }
    const d = daysFromToday(t.dueDate);
    if (d < 0) b.atrasadas.push(t);
    else if (d === 0) b.hoje.push(t);
    else if (d === 1) b.amanha.push(t);
    else if (d <= 7) b.semana.push(t);
    else b.depois.push(t);
  }
  const defs: [string, string, boolean, ('urgente' | undefined)?][] = [
    ['atrasadas', 'Atrasadas', true, 'urgente'],
    ['hoje', 'Hoje', true],
    ['amanha', 'Amanhã', true],
    ['semana', 'Esta semana', true],
    ['depois', 'Mais tarde', false],
    ['semdata', 'Sem data', false],
  ];
  return defs
    .filter(([k]) => b[k].length)
    .map(([k, label, openByDefault, tone]) => ({ key: k, label, tasks: b[k], openByDefault, tone }));
}

export function Agenda({ tasks, announcements, courses, loading }: AgendaProps) {
  const filters = useTasksStore((s) => s.filters);
  const setFilters = useTasksStore((s) => s.setFilters);
  const completedIds = useTasksStore((s) => s.completedIds);

  const visible = applyFilters(tasks, { ...filters, status: 'todos' });
  const done = visible.filter((t) => t.status === 'entregue' || completedIds.includes(t.id));
  const pending = visible.filter((t) => !done.includes(t));
  const buckets = bucketize(pending);
  const count = (k: string) => buckets.find((b) => b.key === k)?.tasks.length ?? 0;
  const atrasadas = count('atrasadas');
  const hoje = count('hoje');

  return (
    <div className="max-w-2xl mx-auto">
      {/* resumo: o aluno entende a situação numa olhada */}
      {!loading && pending.length > 0 && (
        <p className="text-texto mb-6">
          {atrasadas > 0 && <><span className="font-bold text-urgente">{atrasadas}</span> {atrasadas === 1 ? 'atrasada' : 'atrasadas'}</>}
          {atrasadas > 0 && hoje > 0 && <span className="text-texto-suave"> · </span>}
          {hoje > 0 && <><span className="font-bold">{hoje}</span> para hoje</>}
          {atrasadas === 0 && hoje === 0 && <span className="text-texto-suave">Nada atrasado nem para hoje. Em dia!</span>}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Buscar lição"
          aria-label="Buscar lição"
          className="flex-1 min-w-[12rem] bg-transparent border-b border-borda py-1.5 text-texto placeholder:text-texto-suave focus:outline-none focus:border-texto"
        />
        {courses.length > 0 && (
          <select
            value={filters.courseId}
            onChange={(e) => setFilters({ courseId: e.target.value })}
            aria-label="Turma"
            className="bg-transparent border-b border-borda py-1.5 text-sm text-texto-suave focus:outline-none focus:border-texto"
          >
            <option value="todas">Todas as turmas</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-texto-suave py-10">Carregando…</p>
      ) : buckets.length === 0 && done.length === 0 ? (
        <p className="text-texto-suave py-10">Nada por aqui. Suas lições do Classroom aparecem nesta agenda.</p>
      ) : (
        <div className="divide-y divide-borda border-y border-borda">
          {buckets.map((b) => (
            <Section key={b.key} label={b.label} count={b.tasks.length} tone={b.tone} defaultOpen={b.openByDefault}>
              {b.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </Section>
          ))}
          {done.length > 0 && (
            <Section label="Feitas" count={done.length} defaultOpen={false} muted>
              {done.map((t) => <TaskRow key={t.id} task={t} done />)}
            </Section>
          )}
        </div>
      )}

      {announcements.length > 0 && <Avisos announcements={announcements} />}
    </div>
  );
}

/** Seção recolhível: o cabeçalho é o botão, mostra rótulo + quantos, e um sinal de aberto/fechado. */
function Section({
  label, count, tone, muted, defaultOpen, children,
}: { label: string; count: number; tone?: 'urgente'; muted?: boolean; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = tone === 'urgente' ? 'text-urgente' : muted ? 'text-texto-suave' : 'text-texto';
  return (
    <section>
      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 py-3 text-left"
        >
          <span aria-hidden="true" className={`text-texto-suave transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          <span className={`font-display text-xl font-semibold ${color}`}>{label}</span>
          <span className="ml-auto text-sm text-texto-suave tabular-nums">{count}</span>
        </button>
      </h2>
      {open && <ul className="pb-2">{children}</ul>}
    </section>
  );
}

/** Texto curto de quando a lição é, à direita da linha. */
function whenLabel(task: NormalizedTask): { text: string; urgent: boolean } {
  if (task.status === 'entregue') return { text: 'entregue', urgent: false };
  if (!task.dueDate) return { text: '', urgent: false };
  const d = daysFromToday(task.dueDate);
  if (d < 0) return { text: 'atrasada', urgent: true };
  const hm = `${task.dueDate.getHours()}h${String(task.dueDate.getMinutes()).padStart(2, '0')}`;
  if (d === 0) return { text: `hoje, ${hm}`, urgent: true };
  if (d === 1) return { text: `amanhã, ${hm}`, urgent: false };
  return { text: new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(task.dueDate), urgent: false };
}

/** Uma lição: linha enxuta; clicar abre descrição, materiais, anotação e o link do Classroom. */
function TaskRow({ task, done }: { task: NormalizedTask; done?: boolean }) {
  const isCompleted = useTasksStore((s) => s.isCompleted(task.id));
  const toggleCompleted = useTasksStore((s) => s.toggleCompleted);
  const note = useTasksStore((s) => s.notes[task.id] ?? '');
  const setNote = useTasksStore((s) => s.setNote);
  const [open, setOpen] = useState(false);
  const hasDetails = !!(task.description || task.materials.length || task.fromAnnouncement);
  const when = whenLabel(task);

  return (
    <li className="pl-7">
      <div className="flex items-start gap-3 py-2.5">
        <input
          type="checkbox"
          checked={isCompleted || task.status === 'entregue'}
          disabled={task.status === 'entregue'}
          onChange={() => toggleCompleted(task.id)}
          aria-label={`Marcar "${task.title}" como feita`}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-primaria cursor-pointer disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => hasDetails && setOpen((v) => !v)}
          aria-expanded={hasDetails ? open : undefined}
          className={`min-w-0 flex-1 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="flex items-baseline gap-3">
            <span className={`flex-1 leading-snug ${done ? 'line-through text-texto-suave' : 'text-texto'}`}>{task.title}</span>
            {when.text && <span className={`shrink-0 text-sm ${when.urgent ? 'text-urgente' : done ? 'text-ok' : 'text-texto-suave'}`}>{when.text}</span>}
          </span>
          <span className="block text-sm text-texto-suave mt-0.5">
            {task.courseName}{task.teacherName && ` · ${task.teacherName}`}
          </span>
        </button>
      </div>

      {open && hasDetails && (
        <div className="pb-4 pr-2 space-y-3 text-sm">
          {task.dueDate && <p className="text-texto-suave">Entrega: {formatDueDate(task.dueDate)}</p>}
          {task.fromAnnouncement && <p className="text-texto-suave">Encontrada num aviso do professor.</p>}
          {task.description && <p className="text-texto leading-relaxed whitespace-pre-wrap">{task.description}</p>}
          {task.materials.length > 0 && (
            <ul className="space-y-1">
              {task.materials.map((m) => (
                <li key={m.url}>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-primaria underline underline-offset-2">{m.title}</a>
                </li>
              ))}
            </ul>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(task.id, e.target.value)}
            rows={2}
            placeholder="Anotação…"
            aria-label="Anotação"
            className="w-full bg-transparent border border-borda rounded-lg p-2 text-texto placeholder:text-texto-suave focus:outline-none focus:border-texto resize-y"
          />
          <a href={task.alternateLink} target="_blank" rel="noopener noreferrer" className="inline-block font-bold text-primaria hover:underline">Abrir no Classroom</a>
        </div>
      )}
    </li>
  );
}

/** Avisos dos professores, numa seção quieta no fim da agenda. */
function Avisos({ announcements }: { announcements: NormalizedAnnouncement[] }) {
  const sorted = [...announcements].sort((a, b) => (b.creationTime?.getTime() ?? 0) - (a.creationTime?.getTime() ?? 0));
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-texto pb-2 mb-1 border-b border-borda">Avisos</h2>
      <ul>
        {sorted.map((a) => (
          <li key={a.id} className="py-3 border-b border-borda/60 last:border-0">
            <p className="text-sm text-texto-suave">{a.courseName}{a.teacherName && ` · ${a.teacherName}`}</p>
            <p className="text-texto leading-relaxed mt-0.5">{a.text}</p>
            <a href={a.alternateLink} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-primaria hover:underline mt-1">Ver no Classroom</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
