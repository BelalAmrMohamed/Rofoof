// web/src/features/onboarding/Onboarding.tsx
import { useState } from 'react';
import { Stepper } from './components/Stepper';
import { WelcomeStep } from './components/WelcomeStep';
import { LocationStep } from './components/LocationStep';
import { CompletionOverlay } from './components/CompletionOverlay';
import type { GeoPoint, LocationSource, OnboardingResult, OnboardingStep, UserLocation } from './types/location';

interface OnboardingProps {
  initialGovernorate?: string | null;
  initialCity?: string | null;
  onComplete: (result: OnboardingResult) => void;
}

export function Onboarding({ initialGovernorate = null, initialCity = null, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [source, setSource] = useState<LocationSource | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const buildLocation = (overrideSource: LocationSource): UserLocation => ({
    point: overrideSource === 'skipped' ? null : point,
    source: overrideSource,
    governorate: initialGovernorate,
    city: initialCity,
  });

  const finish = (finalSource: LocationSource) => {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete({ location: buildLocation(finalSource) });
    }, 1400);
  };

  const handleSetPoint = (nextPoint: GeoPoint, nextSource: LocationSource) => {
    setPoint(nextPoint);
    setSource(nextSource);
  };

  const handleFinish = () => {
    if (!point || !source) return;
    finish(source);
  };

  const handleSkip = () => {
    finish('skipped');
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0A2E1E] font-[Cairo,sans-serif]" dir="rtl">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-64 -right-40 h-[700px] w-[700px] rounded-full opacity-40 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,.22), transparent 60%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 -left-24 h-[520px] w-[520px] rounded-full opacity-40 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(42,112,80,.4), transparent 60%)' }}
      />

      <CompletionOverlay visible={isCompleting} />

      <div className="stage relative z-10 flex min-h-dvh items-center justify-center px-4 py-6">
        <main
          role="main"
          className="relative w-full max-w-[500px] overflow-hidden rounded-[28px] border border-gold/20 bg-[rgba(12,36,24,0.72)] px-10 pb-10 pt-11 shadow-[0_40px_100px_rgba(0,0,0,.6)] backdrop-blur-xl"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

          <Stepper currentStep={step} />

          {step === 'welcome' && <WelcomeStep onContinue={() => setStep('location')} />}

          {step === 'location' && (
            <LocationStep
              point={point}
              source={source}
              onBack={() => setStep('welcome')}
              onSetPoint={handleSetPoint}
              onFinish={handleFinish}
              onSkip={handleSkip}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default Onboarding;
