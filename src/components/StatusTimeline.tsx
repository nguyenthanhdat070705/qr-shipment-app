'use client';

import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

export interface TimelineStep {
  key: string;
  label: string;
  color: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  current: string;
}

export default function StatusTimeline({ steps, current }: StatusTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                transition-all duration-200
                ${isDone ? 'bg-emerald-100 text-emerald-700' : ''}
                ${isActive ? `${step.color} ring-2 ring-offset-1 ring-current` : ''}
                ${isFuture ? 'bg-gray-100 text-gray-400' : ''}
              `}
            >
              {isDone ? <CheckCircle size={12} /> : <Circle size={12} />}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight
                size={12}
                className={isDone ? 'text-emerald-400' : 'text-gray-300'}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Pre-defined step configs ──────────────────────────── */

export const PO_STEPS: TimelineStep[] = [
  { key: 'draft',     label: 'Nháp',       color: 'bg-gray-200 text-gray-700' },
  { key: 'submitted', label: 'Đã gửi',     color: 'bg-blue-100 text-blue-700' },
  { key: 'approved',  label: 'Đã duyệt',   color: 'bg-purple-100 text-purple-700' },
  { key: 'received',  label: 'Đã nhận',     color: 'bg-emerald-100 text-emerald-700' },
  { key: 'closed',    label: 'Đóng',        color: 'bg-gray-200 text-gray-600' },
];

export const GR_STEPS: TimelineStep[] = [
  { key: 'pending',    label: 'Chờ xử lý',   color: 'bg-yellow-100 text-yellow-700' },
  { key: 'inspecting', label: 'Đang kiểm',    color: 'bg-blue-100 text-blue-700' },
  { key: 'completed',  label: 'Hoàn tất',     color: 'bg-emerald-100 text-emerald-700' },
];

export const DELIVERY_STEPS: TimelineStep[] = [
  { key: 'pending',    label: 'Chờ',          color: 'bg-yellow-100 text-yellow-700' },
  { key: 'assigned',   label: 'Đã giao việc', color: 'bg-blue-100 text-blue-700' },
  { key: 'in_transit', label: 'Đang giao',    color: 'bg-orange-100 text-orange-700' },
  { key: 'delivered',  label: 'Đã giao',      color: 'bg-emerald-100 text-emerald-700' },
];
