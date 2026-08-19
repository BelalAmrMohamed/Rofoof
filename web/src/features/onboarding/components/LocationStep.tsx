// web/src/features/onboarding/components/LocationStep.tsx
import { useEffect } from 'react';
import { MapPicker } from './MapPicker';
import { useGeolocation } from '../hooks/useGeolocation';
import type { GeoPoint, LocationSource } from '../types/location';

interface LocationStepProps {
  point: GeoPoint | null;
  source: LocationSource | null;
  onBack: () => void;
  onSetPoint: (point: GeoPoint, source: LocationSource) => void;
  onFinish: () => void;
  onSkip: () => void;
}

export function LocationStep({ point, source, onBack, onSetPoint, onFinish, onSkip }: LocationStepProps) {
  const geolocation = useGeolocation();

  const handleAutoDetect = () => {
    geolocation.detect();
  };

  useEffect(() => {
    if (geolocation.status === 'success' && geolocation.point) {
      onSetPoint(geolocation.point, 'auto_detect');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.status, geolocation.point]);

  return (
    <section aria-labelledby="s2-heading" className="flex flex-col">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="العودة إلى الخطوة السابقة"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border border-gold/25 text-text-3 transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="-scale-x-100">
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 id="s2-heading" className="font-serif text-[32px] font-bold leading-[1.3] text-text">
          أين تقيم؟
        </h2>
      </div>

      <p className="mb-6 text-[13.5px] leading-[1.75] text-text-3">
        نعرض لك الكتب القريبة منك أولاً — يمكن تغيير موقعك لاحقاً من ملفك الشخصي. هذه الخطوة اختيارية تمامًا.
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={geolocation.status === 'locating'}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-[13.5px] font-bold text-gold-light transition-colors hover:bg-gold/15 disabled:opacity-50"
        >
          <span aria-hidden="true">📍</span>
          {geolocation.status === 'locating' ? 'جارٍ تحديد موقعك…' : 'تحديد موقعي تلقائيًا'}
        </button>
      </div>

      {geolocation.status === 'error' && geolocation.errorMessage && (
        <p role="alert" className="mb-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {geolocation.errorMessage}
        </p>
      )}

      {geolocation.status === 'unsupported' && geolocation.errorMessage && (
        <p className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-2">
          {geolocation.errorMessage}
        </p>
      )}

      <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-2">
        أو حدّد موقعك يدويًا على الخريطة
      </div>

      <MapPicker
        point={point}
        onPick={(picked) => onSetPoint(picked, 'manual_pin')}
        className="mb-5"
      />

      {point && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3"
        >
          <div aria-hidden="true" className="text-lg">
            📍
          </div>
          <div>
            <div className="text-sm font-bold text-text">
              {source === 'auto_detect' ? 'تم تحديد موقعك تلقائيًا' : 'تم تثبيت الدبوس يدويًا'}
            </div>
            <div className="text-[11.5px] text-text-3">
              موقعك المحدد — يمكن تعديله من صفحة الملف الشخصي
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        disabled={!point}
        aria-disabled={!point}
        className="mb-3 w-full rounded-2xl bg-gold px-6 py-4 text-[15px] font-bold text-[#0A2E1E] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ابدأ التصفح
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full rounded-2xl border border-white/10 px-6 py-3 text-[13.5px] font-semibold text-text-3 transition-colors hover:border-white/20 hover:text-text-2"
      >
        تخطّي هذه الخطوة الآن
      </button>
    </section>
  );
}
