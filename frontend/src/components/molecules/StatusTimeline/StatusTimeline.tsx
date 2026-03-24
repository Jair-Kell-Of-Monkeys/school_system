import { Check, Clock, XCircle, AlertCircle } from 'lucide-react';

export interface TimelineStep {
  id: string;
  label: string;
  /**
   * completed  → green  (step done)
   * processing → pulsing blue (actively waiting / in progress)
   * current    → static blue (current step, e.g. payment pending)
   * warning    → amber  (needs attention, e.g. docs rejected)
   * rejected   → red    (final rejection outcome)
   * pending    → gray   (future step not yet reached)
   */
  status: 'completed' | 'processing' | 'current' | 'warning' | 'rejected' | 'pending';
  description?: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
}

const CIRCLE_COLOR: Record<TimelineStep['status'], string> = {
  completed:  'bg-green-500',
  processing: 'bg-blue-500',
  current:    'bg-blue-500',
  warning:    'bg-amber-500',
  rejected:   'bg-red-500',
  pending:    'bg-gray-300',
};

const PING_COLOR: Record<TimelineStep['status'], string> = {
  completed:  '',
  processing: 'bg-blue-400',
  current:    '',
  warning:    '',
  rejected:   '',
  pending:    '',
};

export const StatusTimeline = ({ steps }: StatusTimelineProps) => {
  return (
    <div className="relative">
      {steps.map((step, index) => {
        const isActive = step.status !== 'pending';
        const pingColor = PING_COLOR[step.status];

        return (
          <div key={step.id} className="relative pb-8">
            {/* Connector line */}
            {index !== steps.length - 1 && (
              <div
                className={`absolute left-4 top-8 h-full w-0.5 ${
                  step.status === 'completed' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}

            <div className="relative flex items-start">
              {/* Circle */}
              <div className="relative flex-shrink-0 h-8 w-8">
                {/* Ping ring for processing state */}
                {pingColor && (
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${pingColor}`}
                  />
                )}
                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full ${CIRCLE_COLOR[step.status]}`}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : step.status === 'rejected' ? (
                    <XCircle className="h-5 w-5 text-white" />
                  ) : step.status === 'warning' ? (
                    <AlertCircle className="h-5 w-5 text-white" />
                  ) : step.status === 'processing' || step.status === 'current' ? (
                    <Clock className="h-5 w-5 text-white" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="ml-4 min-w-0">
                <p
                  className={`text-sm ${
                    isActive
                      ? 'font-semibold text-gray-900 dark:text-gray-100'
                      : 'font-medium text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
