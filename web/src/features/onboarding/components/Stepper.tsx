// web/src/features/onboarding/components/Stepper.tsx
import type { OnboardingStep } from '../types/location';

interface StepperProps {
  currentStep: OnboardingStep;
}

const STEPS: { key: OnboardingStep; number: string; label: string }[] = [
  { key: 'welcome', number: '١', label: 'مرحبًا' },
  { key: 'location', number: '٢', label: 'موقعك' },
];

export function Stepper({ currentStep }: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <nav aria-label="مراحل الإعداد" className="mb-9 flex items-center justify-center">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-hidden="true"
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                  isActive
                    ? 'border-gold bg-gold/20 text-gold shadow-[0_0_16px_rgba(201,168,76,.25)]'
                    : isDone
                    ? 'border-success bg-success/15 text-success'
                    : 'border-gold/30 text-text-3',
                ].join(' ')}
              >
                {step.number}
              </div>
              <span
                className={[
                  'whitespace-nowrap text-[10.5px] font-semibold tracking-wide',
                  isActive ? 'text-gold-light' : isDone ? 'text-success' : 'text-text-3',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div className="mx-2 mb-[22px] h-0.5 w-16 overflow-hidden rounded-full bg-gold/15">
                <div
                  className={`h-full bg-gradient-to-r from-gold to-gold-light transition-transform duration-500 ${
                    isDone ? 'scale-x-100' : 'scale-x-0'
                  } origin-right`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
