'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Calendar, Maximize2, Filter, Layers,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════ */
export interface GanttTask {
  id: string;
  name: string;
  category: string;
  startDate: Date;
  endDate: Date;
  color: string;
  progress?: number;   // 0–100
  subLabel?: string;
  tooltip?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  title?: string;
  categories?: { key: string; label: string; color: string }[];
}

/* ═══════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════ */
const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const MONTH_SHORT = [
  'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
  'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12',
];

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const ROW_HEIGHT = 48;
const LABEL_WIDTH = 220;
const MIN_DAY_WIDTH = 18;
const MAX_DAY_WIDTH = 80;
const DEFAULT_DAY_WIDTH = 36;

/* ═══════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════ */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  const msDay = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / msDay);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
export default function GanttChart({ tasks, title, categories }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; task: GanttTask } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const today = useMemo(() => startOfDay(new Date()), []);

  /* ── Filtered tasks ── */
  const filteredTasks = useMemo(() => {
    if (filterCategory === 'all') return tasks;
    return tasks.filter(t => t.category === filterCategory);
  }, [tasks, filterCategory]);

  /* ── Date range ── */
  const { viewStart, viewEnd, totalDays } = useMemo(() => {
    if (filteredTasks.length === 0) {
      const s = addDays(today, -7);
      const e = addDays(today, 30);
      return { viewStart: s, viewEnd: e, totalDays: diffDays(s, e) + 1 };
    }

    let minDate = filteredTasks[0].startDate;
    let maxDate = filteredTasks[0].endDate;
    filteredTasks.forEach(t => {
      if (t.startDate < minDate) minDate = t.startDate;
      if (t.endDate > maxDate) maxDate = t.endDate;
    });

    // Add padding
    const s = addDays(startOfMonth(minDate), 0);
    const e = addDays(maxDate, 7);
    return { viewStart: s, viewEnd: e, totalDays: diffDays(s, e) + 1 };
  }, [filteredTasks, today]);

  /* ── Month headers ── */
  const monthHeaders = useMemo(() => {
    const months: { label: string; startCol: number; span: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(viewStart, i);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        months.push({
          label: `${MONTH_NAMES_VI[d.getMonth()]} ${d.getFullYear()}`,
          startCol: i,
          span: 1,
        });
        currentMonth = d.getMonth();
        currentYear = d.getFullYear();
      } else {
        months[months.length - 1].span++;
      }
    }
    return months;
  }, [viewStart, totalDays]);

  /* ── Day columns ── */
  const dayColumns = useMemo(() => {
    const cols: { date: Date; day: number; isWeekend: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(viewStart, i);
      cols.push({
        date: d,
        day: d.getDate(),
        isWeekend: isWeekend(d),
        isToday: isSameDay(d, today),
      });
    }
    return cols;
  }, [viewStart, totalDays, today]);

  /* ── Today index ── */
  const todayIndex = useMemo(() => diffDays(viewStart, today), [viewStart, today]);

  /* ── Sync scroll ── */
  const handleScroll = useCallback(() => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);

  /* ── Scroll to today ── */
  const scrollToToday = useCallback(() => {
    if (scrollRef.current) {
      const todayPos = todayIndex * dayWidth - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, todayPos), behavior: 'smooth' });
    }
  }, [todayIndex, dayWidth]);

  useEffect(() => {
    // Auto-scroll to today on mount
    const timer = setTimeout(scrollToToday, 300);
    return () => clearTimeout(timer);
  }, [scrollToToday]);

  /* ── Zoom ── */
  const zoomIn = () => setDayWidth(w => Math.min(MAX_DAY_WIDTH, w + 8));
  const zoomOut = () => setDayWidth(w => Math.max(MIN_DAY_WIDTH, w - 8));

  /* ── Bar position ── */
  const getBarStyle = (task: GanttTask) => {
    const startOffset = Math.max(0, diffDays(viewStart, task.startDate));
    const duration = Math.max(1, diffDays(task.startDate, task.endDate) + 1);
    const clampedStart = Math.max(0, startOffset);
    const clampedEnd = Math.min(totalDays, startOffset + duration);
    const width = Math.max(dayWidth * 0.6, (clampedEnd - clampedStart) * dayWidth - 4);
    
    return {
      left: clampedStart * dayWidth + 2,
      width,
      top: 10,
      height: ROW_HEIGHT - 20,
    };
  };

  /* ── Unique categories ── */
  const uniqueCategories = useMemo(() => {
    const catSet = new Map<string, string>();
    tasks.forEach(t => {
      if (!catSet.has(t.category)) {
        catSet.set(t.category, t.color);
      }
    });
    return Array.from(catSet.entries()).map(([key, color]) => ({
      key,
      label: categories?.find(c => c.key === key)?.label || key,
      color,
    }));
  }, [tasks, categories]);

  const timelineWidth = totalDays * dayWidth;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
            <Calendar size={18} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              {title || 'Biểu đồ Gantt'}
            </h3>
            <p className="text-[11px] text-gray-400">
              {filteredTasks.length} công việc · {MONTH_NAMES_VI[today.getMonth()]} {today.getFullYear()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none pl-8 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 cursor-pointer hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">Tất cả loại</option>
              {uniqueCategories.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 text-gray-500 transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut size={14} />
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 text-gray-500 transition-colors"
              title="Phóng to"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Go to today */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Maximize2 size={12} />
            Hôm nay
          </button>
        </div>
      </div>

      {/* ═══ Legend ═══ */}
      {uniqueCategories.length > 1 && (
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Layers size={11} className="inline mr-1" />
            Chú thích:
          </span>
          {uniqueCategories.map(c => (
            <button
              key={c.key}
              onClick={() => setFilterCategory(filterCategory === c.key ? 'all' : c.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filterCategory === c.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span
                className="w-3 h-3 rounded-[3px] flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Chart Area ═══ */}
      <div className="flex" style={{ height: Math.max(300, filteredTasks.length * ROW_HEIGHT + 80) }}>
        {/* ── Left: Task Labels ── */}
        <div
          className="flex-shrink-0 border-r border-gray-100 bg-white z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div className="h-[68px] border-b border-gray-100 flex items-end px-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Công việc
            </span>
          </div>

          {/* Task names */}
          <div className="overflow-hidden">
            {filteredTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center gap-2.5 px-4 border-b border-gray-50 transition-colors ${
                  hoveredTask === task.id ? 'bg-orange-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                }`}
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <span
                  className="w-3 h-3 rounded-[4px] flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: task.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                    {task.name}
                  </p>
                  {task.subLabel && (
                    <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                      {task.subLabel}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Timeline ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Month + Day headers */}
          <div
            ref={headerScrollRef}
            className="flex-shrink-0 overflow-hidden border-b border-gray-100"
            style={{ height: 68 }}
          >
            <div style={{ width: timelineWidth, position: 'relative' }}>
              {/* Month row */}
              <div className="flex h-[34px] border-b border-gray-100">
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[11px] font-extrabold text-gray-700 border-r border-gray-100 bg-gradient-to-b from-white to-gray-50/50"
                    style={{ width: m.span * dayWidth, flexShrink: 0 }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Day row */}
              <div className="flex h-[34px]">
                {dayColumns.map((col, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-[10px] font-bold border-r border-gray-50 flex-shrink-0 transition-colors ${
                      col.isToday
                        ? 'bg-orange-100 text-orange-700'
                        : col.isWeekend
                          ? 'bg-red-50/40 text-red-300'
                          : 'text-gray-400'
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {dayWidth > 24 ? (
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[8px] text-gray-300 font-semibold">
                          {DAY_NAMES[col.date.getDay()]}
                        </span>
                        <span>{col.day}</span>
                      </div>
                    ) : (
                      col.day
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task bars area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={handleScroll}
            style={{ scrollbarWidth: 'thin' }}
          >
            <div
              className="relative"
              style={{
                width: timelineWidth,
                height: filteredTasks.length * ROW_HEIGHT,
              }}
            >
              {/* Grid lines */}
              {dayColumns.map((col, i) => (
                <div
                  key={`grid-${i}`}
                  className={`absolute top-0 bottom-0 border-r ${
                    col.isToday
                      ? 'border-transparent'
                      : col.isWeekend
                        ? 'border-red-50'
                        : 'border-gray-50'
                  }`}
                  style={{
                    left: i * dayWidth,
                    width: dayWidth,
                    backgroundColor: col.isWeekend ? 'rgba(254,226,226,0.15)' : undefined,
                  }}
                />
              ))}

              {/* Row backgrounds */}
              {filteredTasks.map((task, idx) => (
                <div
                  key={`row-${task.id}`}
                  className={`absolute left-0 right-0 border-b border-gray-50/80 transition-colors ${
                    hoveredTask === task.id ? 'bg-orange-50/30' : idx % 2 === 0 ? '' : 'bg-gray-50/20'
                  }`}
                  style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Today marker */}
              {todayIndex >= 0 && todayIndex < totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ left: todayIndex * dayWidth + dayWidth / 2 - 1 }}
                >
                  <div className="w-0.5 h-full bg-orange-500/60" />
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-300/50" />
                </div>
              )}

              {/* Task bars */}
              {filteredTasks.map((task, idx) => {
                const bar = getBarStyle(task);
                const isHovered = hoveredTask === task.id;
                return (
                  <div
                    key={`bar-${task.id}`}
                    className="absolute z-10 group cursor-pointer"
                    style={{
                      left: bar.left,
                      top: idx * ROW_HEIGHT + bar.top,
                      width: bar.width,
                      height: bar.height,
                    }}
                    onMouseEnter={(e) => {
                      setHoveredTask(task.id);
                      setTooltipInfo({
                        x: e.clientX,
                        y: e.clientY,
                        task,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredTask(null);
                      setTooltipInfo(null);
                    }}
                    onMouseMove={(e) => {
                      if (tooltipInfo?.task.id === task.id) {
                        setTooltipInfo({
                          x: e.clientX,
                          y: e.clientY,
                          task,
                        });
                      }
                    }}
                  >
                    {/* Bar body */}
                    <div
                      className={`w-full h-full rounded-lg transition-all duration-200 ${
                        isHovered ? 'scale-y-110 shadow-lg' : 'shadow-sm'
                      }`}
                      style={{
                        backgroundColor: task.color,
                        boxShadow: isHovered
                          ? `0 4px 15px ${task.color}40`
                          : `0 1px 3px ${task.color}30`,
                      }}
                    >
                      {/* Progress overlay */}
                      {task.progress !== undefined && task.progress < 100 && (
                        <div
                          className="absolute top-0 left-0 h-full rounded-lg bg-black/10"
                          style={{ width: `${100 - task.progress}%`, right: 0, left: 'auto' }}
                        />
                      )}

                      {/* Inline label (only if bar is wide enough) */}
                      {bar.width > 60 && (
                        <div className="absolute inset-0 flex items-center px-2.5 overflow-hidden">
                          <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">
                            {task.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Tooltip ═══ */}
      {tooltipInfo && (
        <div
          className="fixed z-[999] pointer-events-none"
          style={{
            left: tooltipInfo.x + 16,
            top: tooltipInfo.y - 10,
          }}
        >
          <div className="bg-[#0f172a] text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[200px] max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: tooltipInfo.task.color }}
              />
              <span className="text-xs font-bold truncate">{tooltipInfo.task.name}</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-white/60">
              <div className="flex justify-between gap-4">
                <span>Loại</span>
                <span className="font-semibold text-white/80">{tooltipInfo.task.category}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Bắt đầu</span>
                <span className="font-semibold text-white/80">
                  {tooltipInfo.task.startDate.toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Kết thúc</span>
                <span className="font-semibold text-white/80">
                  {tooltipInfo.task.endDate.toLocaleDateString('vi-VN')}
                </span>
              </div>
              {tooltipInfo.task.progress !== undefined && (
                <div className="flex justify-between gap-4">
                  <span>Tiến độ</span>
                  <span className="font-semibold text-white/80">{tooltipInfo.task.progress}%</span>
                </div>
              )}
              {tooltipInfo.task.tooltip && (
                <p className="pt-1.5 border-t border-white/10 text-white/50 leading-relaxed">
                  {tooltipInfo.task.tooltip}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Footer ═══ */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Hôm nay: {today.toLocaleDateString('vi-VN')}
          </span>
          <span>·</span>
          <span>{filteredTasks.length} công việc</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>Zoom: {Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
