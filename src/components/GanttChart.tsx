'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Calendar, Maximize2, Filter, Layers, Search
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

const ROW_HEIGHT = 60;
const LABEL_WIDTH = 280;
const MIN_DAY_WIDTH = 32;
const MAX_DAY_WIDTH = 120;
const DEFAULT_DAY_WIDTH = 56;

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
  const [filterMonthStr, setFilterMonthStr] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const today = useMemo(() => startOfDay(new Date()), []);

  /* ── Filter Month Options ── */
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(`${today.getFullYear()}-${today.getMonth()}`); // Tránh trường hợp tháng này không có task
    tasks.forEach(t => {
      let current = startOfMonth(t.startDate);
      const end = startOfMonth(t.endDate);
      while (current <= end) {
        monthsSet.add(`${current.getFullYear()}-${current.getMonth()}`);
        current = addDays(current, 32); 
        current = startOfMonth(current); 
      }
    });

    const arr = Array.from(monthsSet).map(val => {
      const [y, m] = val.split('-').map(Number);
      return { value: val, label: `Tháng ${m + 1} - ${y}`, date: new Date(y, m, 1) };
    });
    arr.sort((a, b) => a.date.getTime() - b.date.getTime());
    return arr;
  }, [tasks, today]);

  useEffect(() => {
    // Luôn ưu tiên hiển thị tháng hiện tại lúc đầu
    if (filterMonthStr === 'all') {
      setFilterMonthStr(`${today.getFullYear()}-${today.getMonth()}`);
    }
  }, [today, filterMonthStr]);

  /* ── Date range ── */
  const { viewStart, viewEnd, totalDays } = useMemo(() => {
    const [y, m] = (filterMonthStr === 'all' ? `${today.getFullYear()}-${today.getMonth()}` : filterMonthStr).split('-').map(Number);
    const s = new Date(y, m, 1);
    const e = new Date(y, m + 1, 0); // last day of month
    return { viewStart: s, viewEnd: e, totalDays: diffDays(s, e) + 1 };
  }, [filterMonthStr, today]);

  /* ── Filtered tasks ── */
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(q) || 
        (t.subLabel && t.subLabel.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    }
    // Chỉ hiển thị các task nằm trong tháng hiện tại
    filtered = filtered.filter(t => {
      return !(t.endDate < viewStart || t.startDate > viewEnd);
    });
    return filtered;
  }, [tasks, filterCategory, searchQuery, viewStart, viewEnd]);



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

  /* ── Month headers ── */
  const monthHeaders = useMemo(() => {
    const months: { label: string; startCol: number; span: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(viewStart, i);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        months.push({
          label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
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
    // Correct overlap calculation
    const taskStart = task.startDate < viewStart ? viewStart : task.startDate;
    const taskEnd = task.endDate > viewEnd ? viewEnd : task.endDate;
    
    // If task is outside view completely, width = 0
    if (taskEnd < viewStart || taskStart > viewEnd) {
      return { left: 0, width: 0, top: 0, height: 0, hidden: true };
    }

    const startOffset = diffDays(viewStart, taskStart);
    const durationDays = diffDays(taskStart, taskEnd) + 1;
    const width = Math.max(dayWidth * 0.5, durationDays * dayWidth - 8);
    
    return {
      left: startOffset * dayWidth + 6,
      width,
      top: 14,
      height: ROW_HEIGHT - 28,
      hidden: false,
      isCutStart: task.startDate < viewStart,
      isCutEnd: task.endDate > viewEnd,
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
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden">
      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 border border-orange-200/50 shadow-inner">
            <Calendar size={22} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
              {title || 'Biểu đồ Gantt'}
            </h3>
            <p className="text-[12px] font-medium text-slate-400 mt-0.5">
              {filteredTasks.length} nhiệm vụ hiển thị trong tháng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Thanh tìm kiếm */}
          <div className="relative group mr-2 hidden sm:block">
            <input
              type="text"
              placeholder="Tìm kiếm nhiệm vụ, mã đám..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 hover:border-slate-300 transition-all shadow-sm"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
          </div>

          {/* Month filter */}
          {availableMonths.length > 0 && (
            <div className="relative">
              <select
                value={filterMonthStr}
                onChange={(e) => setFilterMonthStr(e.target.value)}
                className="appearance-none pl-11 pr-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
            </div>
          )}

          {/* Category filter */}
          <div className="relative hidden sm:block">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
            >
              <option value="all">Tất cả nhãn</option>
              {uniqueCategories.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hidden md:flex">
            <button
              onClick={zoomOut}
              className="p-2.5 hover:bg-slate-50 text-slate-500 transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut size={16} />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={zoomIn}
              className="p-2.5 hover:bg-slate-50 text-slate-500 transition-colors"
              title="Phóng to"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Go to today */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            <Maximize2 size={14} />
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
      <div className="flex" style={{ height: Math.max(400, filteredTasks.length * ROW_HEIGHT + 120) }}>
        {/* ── Left: Task Labels ── */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-white z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div className="h-[76px] border-b border-slate-200 flex items-center px-6 bg-[#f8fafc]">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-slate-500">
              Nhiệm vụ / Hạng mục
            </span>
          </div>

          {/* Task names */}
          <div className="overflow-hidden">
            {filteredTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-6 border-b border-slate-100 transition-all ${
                  hoveredTask === task.id ? 'bg-orange-50/80 shadow-sm z-10 relative' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color, boxShadow: `0 0 8px ${task.color}80` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">
                    {task.name}
                  </p>
                  {task.subLabel && (
                    <p className="text-[11px] font-medium text-slate-400 truncate leading-tight mt-0.5">
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
            className="flex-shrink-0 overflow-hidden border-b border-slate-200 bg-[#f8fafc] shadow-sm z-10"
            style={{ height: 86 }}
          >
            <div style={{ width: timelineWidth + LABEL_WIDTH, position: 'relative' }}>
              
              {/* Row: Months */}
              <div className="flex h-[26px] border-b border-slate-200/60 bg-slate-100/50">
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[11px] font-extrabold text-slate-500 uppercase tracking-widest border-r border-slate-200/50"
                    style={{ width: m.span * dayWidth, flexShrink: 0 }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Row: Days */}
              <div className="flex h-[60px]">
                {dayColumns.map((col, i) => {
                  const isCurrent = col.isToday;
                  const isWeeKEnd = col.isWeekend;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r border-slate-200/50 flex-shrink-0 transition-colors py-1 ${
                        isWeeKEnd ? 'bg-red-50/30' : 'bg-transparent'
                      }`}
                      style={{ width: dayWidth }}
                    >
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${
                        isCurrent ? 'text-orange-500' : 
                        isWeeKEnd ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {DAY_NAMES[col.date.getDay()]}
                      </span>
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-extrabold transition-all duration-200 ${
                        isCurrent 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-100' 
                          : 'text-slate-700'
                      }`}>
                        {col.day}
                      </div>
                    </div>
                  );
                })}
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
                        ? 'border-red-50/50'
                        : 'border-slate-100/60'
                  }`}
                  style={{
                    left: i * dayWidth,
                    width: dayWidth,
                    backgroundColor: col.isToday ? 'rgba(249,115,22,0.03)' : col.isWeekend ? 'rgba(254,226,226,0.1)' : undefined,
                  }}
                />
              ))}

              {/* Row backgrounds */}
              {filteredTasks.map((task, idx) => (
                <div
                  key={`row-${task.id}`}
                  className={`absolute left-0 right-0 border-b border-slate-100/80 transition-colors ${
                    hoveredTask === task.id ? 'bg-orange-50/30' : idx % 2 === 0 ? '' : 'bg-slate-50/30'
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
                  <div className="w-0.5 h-full bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                  <div className="absolute -top-1 left-[1px] -translate-x-1/2 w-[11px] h-[11px] rounded-full bg-orange-500 border-2 border-white shadow-sm shadow-orange-500/50" />
                </div>
              )}

              {/* Task bars */}
              {filteredTasks.map((task, idx) => {
                const bar = getBarStyle(task);
                if (bar.hidden) return null;

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
                      className={`w-full h-full transition-all duration-200 relative flex items-center ${
                        isHovered ? 'shadow-lg scale-y-[1.08] z-20' : 'shadow-sm'
                      } ${bar.isCutStart ? 'rounded-r-[6px] border-l-2 border-l-white/60' : ''} ${bar.isCutEnd ? 'rounded-l-[6px] border-r-2 border-r-white/60' : ''} ${!bar.isCutStart && !bar.isCutEnd ? 'rounded-[6px]' : ''}`}
                      style={{
                        backgroundColor: task.color,
                        boxShadow: isHovered
                          ? `0 6px 12px -2px ${task.color}50`
                          : `0 2px 4px -1px ${task.color}40`,
                      }}
                    >
                      {/* Striped overlay for cut ends */}
                      {bar.isCutStart && (
                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none rounded-l-sm" />
                      )}
                      {bar.isCutEnd && (
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none rounded-r-sm" />
                      )}

                      {/* Progress overlay */}
                      {task.progress !== undefined && task.progress < 100 && (
                        <div
                          className={`absolute top-0 left-0 h-full bg-black/15 pointer-events-none ${!bar.isCutStart && !bar.isCutEnd ? 'rounded-[6px]' : ''}`}
                          style={{ width: `${100 - task.progress}%`, right: 0, left: 'auto' }}
                        />
                      )}

                      {/* Inline label (only if bar is wide enough) */}
                      {bar.width > 60 && (
                        <div className="absolute inset-0 flex items-center px-2.5 overflow-hidden pointer-events-none">
                          <span className="text-[11px] font-bold text-white truncate drop-shadow-md tracking-wide">
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
