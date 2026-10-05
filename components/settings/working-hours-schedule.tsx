'use client';

import { memo, useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { Clock3, Coffee, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';
import {
  WEEKDAY_LABELS,
  canAddBreak,
  cloneWorkingHours,
  createBreakInterval,
  getWorkingHoursServerSnapshot,
  getWorkingHoursSnapshot,
  resolveTimezone,
  saveWorkingHours,
  subscribeWorkingHours,
  updateDaySchedule,
  validateWorkingHours,
  workingHoursEqual,
  type BreakInterval,
  type DaySchedule,
  type WeekdayId,
  type WorkingHoursSchedule as WorkingHoursDraft,
} from '@/lib/working-hours';

const DayToggle = memo(function DayToggle({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: () => void;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]/70'
      )}
    >
      <span
        className={cn(
          'relative h-7 w-11 rounded-full transition-all duration-200',
          checked
            ? 'bg-[#FF5722] shadow-[0_0_16px_rgba(255,87,34,0.45)]'
            : 'bg-neutral-300 dark:bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
            checked ? 'left-5' : 'left-1'
          )}
        />
      </span>
    </button>
  );
});

const TimeField = memo(function TimeField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="min-w-0 flex-1 space-y-1">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
        {label}
      </span>
      <input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 w-full min-h-11 rounded-xl border px-3 text-sm font-medium',
          'border-neutral-200 bg-white text-neutral-900 caret-neutral-900',
          'transition-all duration-200 focus:border-[#FF5722] focus:outline-none focus:ring-1 focus:ring-[#FF5722]',
          'dark:border-neutral-800 dark:bg-[#1a1a1a] dark:text-white dark:caret-white',
          'scheme-light dark:scheme-dark',
          'disabled:cursor-not-allowed disabled:opacity-40'
        )}
      />
    </label>
  );
});

const BreakRow = memo(function BreakRow({
  dayId,
  interval,
  disabled,
  onChange,
  onRemove,
}: {
  dayId: WeekdayId;
  interval: BreakInterval;
  disabled: boolean;
  onChange: (id: string, patch: Partial<Pick<BreakInterval, 'start' | 'end'>>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <TimeField
        id={`${dayId}-break-${interval.id}-start`}
        label="Início do intervalo"
        value={interval.start}
        disabled={disabled}
        onChange={(value) => onChange(interval.id, { start: value })}
      />
      <TimeField
        id={`${dayId}-break-${interval.id}-end`}
        label="Fim do intervalo"
        value={interval.end}
        disabled={disabled}
        onChange={(value) => onChange(interval.id, { end: value })}
      />
      <button
        type="button"
        aria-label="Remover intervalo"
        disabled={disabled}
        onClick={() => onRemove(interval.id)}
        className="inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-all duration-200 hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-zinc-500"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
});

const DayRow = memo(function DayRow({
  day,
  issues,
  onToggle,
  onTimeChange,
  onBreakChange,
  onAddBreak,
  onRemoveBreak,
}: {
  day: DaySchedule;
  issues: string[];
  onToggle: (dayId: WeekdayId) => void;
  onTimeChange: (dayId: WeekdayId, field: 'start' | 'end', value: string) => void;
  onBreakChange: (dayId: WeekdayId, breakId: string, patch: Partial<Pick<BreakInterval, 'start' | 'end'>>) => void;
  onAddBreak: (dayId: WeekdayId) => void;
  onRemoveBreak: (dayId: WeekdayId, breakId: string) => void;
}) {
  const labelId = `schedule-${day.day}`;
  const disabled = !day.active;
  const allowBreak = canAddBreak(day);

  return (
    <article
      className={cn(
        'rounded-2xl border px-3 py-3 transition-all duration-200',
        day.active
          ? 'border-[#FF5722]/30 bg-[#FF5722]/5'
          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-white/5'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all duration-200',
            day.active
              ? 'border-[#FF5722]/50 bg-[#FF5722]/15 text-[#FF5722]'
              : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-white/5 dark:text-zinc-400'
          )}
        >
          <Clock3 className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p id={labelId} className="text-sm font-medium text-neutral-900 dark:text-white">
            {WEEKDAY_LABELS[day.day]}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-500">
            {day.active ? `${day.start} – ${day.end}` : 'Folga'}
          </p>
        </div>
        <DayToggle checked={day.active} labelledBy={labelId} onChange={() => onToggle(day.day)} />
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          day.active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-60'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <TimeField
                id={`${day.day}-start`}
                label="Abertura"
                value={day.start}
                disabled={disabled}
                onChange={(value) => onTimeChange(day.day, 'start', value)}
              />
              <TimeField
                id={`${day.day}-end`}
                label="Fechamento"
                value={day.end}
                disabled={disabled}
                onChange={(value) => onTimeChange(day.day, 'end', value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
                  <Coffee className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Intervalos
                </p>
                <button
                  type="button"
                  disabled={disabled || !allowBreak}
                  onClick={() => onAddBreak(day.day)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[#FF5722] transition-all duration-200 hover:bg-[#FF5722]/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Adicionar
                </button>
              </div>
              {day.breaks.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-zinc-500">Nenhum intervalo neste dia.</p>
              ) : (
                day.breaks.map((interval) => (
                  <BreakRow
                    key={interval.id}
                    dayId={day.day}
                    interval={interval}
                    disabled={disabled}
                    onChange={(id, patch) => onBreakChange(day.day, id, patch)}
                    onRemove={(id) => onRemoveBreak(day.day, id)}
                  />
                ))
              )}
            </div>

            {issues.length > 0 ? (
              <ul className="space-y-1">
                {issues.map((message) => (
                  <li key={message} className="text-xs font-medium text-red-500">
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
});

export const WorkingHoursSchedule = memo(function WorkingHoursSchedule() {
  const persisted = useSyncExternalStore(
    subscribeWorkingHours,
    getWorkingHoursSnapshot,
    getWorkingHoursServerSnapshot
  );
  const [draft, setDraft] = useState<WorkingHoursDraft>(() => cloneWorkingHours(persisted));
  const [hydrated, setHydrated] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  const syncedDraft = useMemo(() => {
    if (!hydrated) return cloneWorkingHours(persisted);
    return draft;
  }, [draft, hydrated, persisted]);

  const issues = useMemo(() => validateWorkingHours(syncedDraft), [syncedDraft]);
  const issuesByDay = useMemo(() => {
    const map = new Map<WeekdayId, string[]>();
    for (const issue of issues) {
      const current = map.get(issue.day) ?? [];
      if (!current.includes(issue.message)) current.push(issue.message);
      map.set(issue.day, current);
    }
    return map;
  }, [issues]);

  const dirty = useMemo(() => !workingHoursEqual(syncedDraft, persisted), [persisted, syncedDraft]);
  const activeDays = syncedDraft.days.filter((day) => day.active).length;

  const ensureHydrated = useCallback(
    (updater: (current: WorkingHoursDraft) => WorkingHoursDraft) => {
      setHydrated(true);
      setDraft((current) => updater(hydrated ? current : cloneWorkingHours(persisted)));
    },
    [hydrated, persisted]
  );

  const handleToggle = useCallback(
    (dayId: WeekdayId) => {
      triggerHaptic('light');
      ensureHydrated((current) => {
        const target = current.days.find((day) => day.day === dayId);
        return updateDaySchedule(current, dayId, { active: !target?.active });
      });
    },
    [ensureHydrated, triggerHaptic]
  );

  const handleTimeChange = useCallback(
    (dayId: WeekdayId, field: 'start' | 'end', value: string) => {
      ensureHydrated((current) => updateDaySchedule(current, dayId, { [field]: value }));
    },
    [ensureHydrated]
  );

  const handleBreakChange = useCallback(
    (dayId: WeekdayId, breakId: string, patch: Partial<Pick<BreakInterval, 'start' | 'end'>>) => {
      ensureHydrated((current) => {
        const target = current.days.find((day) => day.day === dayId);
        if (!target) return current;
        return updateDaySchedule(current, dayId, {
          breaks: target.breaks.map((interval) => (interval.id === breakId ? { ...interval, ...patch } : interval)),
        });
      });
    },
    [ensureHydrated]
  );

  const handleAddBreak = useCallback(
    (dayId: WeekdayId) => {
      triggerHaptic('light');
      ensureHydrated((current) => {
        const target = current.days.find((day) => day.day === dayId);
        if (!target || !canAddBreak(target)) return current;
        return updateDaySchedule(current, dayId, {
          breaks: [...target.breaks, createBreakInterval()],
        });
      });
    },
    [ensureHydrated, triggerHaptic]
  );

  const handleRemoveBreak = useCallback(
    (dayId: WeekdayId, breakId: string) => {
      triggerHaptic('light');
      ensureHydrated((current) => {
        const target = current.days.find((day) => day.day === dayId);
        if (!target) return current;
        return updateDaySchedule(current, dayId, {
          breaks: target.breaks.filter((interval) => interval.id !== breakId),
        });
      });
    },
    [ensureHydrated, triggerHaptic]
  );

  const handleSave = useCallback(() => {
    const nextIssues = validateWorkingHours(syncedDraft);
    if (nextIssues.length > 0) {
      triggerHaptic('heavy');
      toast.error('Revise os horários destacados antes de salvar.');
      return;
    }

    const payload = cloneWorkingHours(syncedDraft);
    payload.timezone = resolveTimezone();
    const saved = saveWorkingHours(payload);
    setDraft(cloneWorkingHours(saved));
    setHydrated(true);
    triggerHaptic('success');
    toast.success('Expediente salvo.', {
      description: `${saved.days.filter((day) => day.active).length} dias ativos neste dispositivo.`,
    });
  }, [syncedDraft, triggerHaptic]);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
        Defina abertura, fechamento e intervalos de segunda a domingo. O expediente fica neste dispositivo, pronto para sincronizar com o banco.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {syncedDraft.days.map((day) => (
          <DayRow
            key={day.day}
            day={day}
            issues={issuesByDay.get(day.day) ?? []}
            onToggle={handleToggle}
            onTimeChange={handleTimeChange}
            onBreakChange={handleBreakChange}
            onAddBreak={handleAddBreak}
            onRemoveBreak={handleRemoveBreak}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={cn(
          'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold',
          'bg-[#FF5722] text-black shadow-[0_0_18px_rgba(255,87,34,0.35)]',
          'transition-all duration-200 hover:bg-[#ff6a3c] active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]/70'
        )}
      >
        <Save className="h-4 w-4" strokeWidth={1.75} />
        Salvar Expediente
      </button>
      <p className="text-center text-[11px] text-neutral-500 dark:text-zinc-500">
        {dirty ? 'Alterações pendentes.' : 'Expediente atualizado.'} {activeDays} dia{activeDays === 1 ? '' : 's'} ativo{activeDays === 1 ? '' : 's'}.
      </p>
    </div>
  );
});
