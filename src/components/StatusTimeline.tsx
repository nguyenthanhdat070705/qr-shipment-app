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
  stepOverrides?: Record<string, Partial<TimelineStep>>;
}

export default function StatusTimeline({ steps, current, stepOverrides }: StatusTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex || currentIndex === -1; // If status not found, consider all future
        
        const currentStep = stepOverrides && stepOverrides[step.key]
          ? { ...step, ...stepOverrides[step.key] }
          : step;

        return (
          <div key={currentStep.key} className="flex items-center gap-1">
            <div
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                transition-all duration-200
                ${isDone ? 'bg-emerald-100 text-emerald-700' : ''}
                ${isActive ? `${currentStep.color} ring-2 ring-offset-1 ring-current` : ''}
                ${isFuture ? (currentStep.key === 'completed' && currentStep.label === 'Thiếu hàng' ? currentStep.color : 'bg-gray-100 text-gray-400') : ''}
                ${['Thiếu hàng', 'Đầy đủ', 'Hoàn tất'].includes(currentStep.label) ? 'w-[115px] justify-center whitespace-nowrap' : ''}
              `}
            >
              {isDone ? <CheckCircle size={12} /> : <Circle size={12} />}
              {currentStep.label}
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
  { key: 'confirmed', label: 'Xác nhận',    color: 'bg-purple-100 text-purple-700' },
  { key: 'received',  label: 'Đã nhận',     color: 'bg-emerald-100 text-emerald-700' },
  { key: 'closed',    label: 'Hoàn thành',  color: 'bg-emerald-100 text-emerald-700' },
];

export const GR_STEPS: TimelineStep[] = [
  { key: 'completed',  label: 'Hoàn tất',     color: 'bg-emerald-100 text-emerald-700' },
];

export const DELIVERY_STEPS: TimelineStep[] = [
  { key: 'pending',    label: 'Chờ',          color: 'bg-yellow-100 text-yellow-700' },
  { key: 'assigned',   label: 'Đã giao việc', color: 'bg-blue-100 text-blue-700' },
  { key: 'in_transit', label: 'Đang giao',    color: 'bg-orange-100 text-orange-700' },
  { key: 'delivered',  label: 'Đã giao',      color: 'bg-emerald-100 text-emerald-700' },
];
