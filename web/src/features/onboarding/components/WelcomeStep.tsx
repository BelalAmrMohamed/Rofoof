// web/src/features/onboarding/components/WelcomeStep.tsx
interface WelcomeStepProps {
  onContinue: () => void;
}

const FEATURE_PILLS = [
  { icon: '📚', label: 'تصفّح الكتب' },
  { icon: '🕌', label: 'اكتشف المساجد' },
  { icon: '✍️', label: 'سجّل كتاباً' },
];

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <section aria-labelledby="s1-heading" className="flex flex-col">
      <div className="mb-6 flex justify-center">
        <div className="relative flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-[20px] border border-gold/25 bg-gradient-to-br from-[#112a1c] to-[#1a4530] shadow-[0_12px_32px_rgba(0,0,0,.5),inset_0_1px_0_rgba(201,168,76,.2)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(201,168,76,.35),transparent_65%)]" />
          <span className="relative font-serif text-3xl text-gold [text-shadow:0_0_20px_rgba(201,168,76,.5)]">
            ر
          </span>
        </div>
      </div>

      <div className="mb-3.5 inline-flex w-fit items-center gap-1.5 self-center rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[11.5px] font-bold text-gold-light">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
        تم إنشاء حسابك بنجاح
      </div>

      <h1 id="s1-heading" className="mb-3.5 text-center font-serif text-[36px] font-bold leading-[1.4] text-text">
        أهلاً بك في
        <em className="block not-italic text-gold-light">على رفوف المساجد</em>
      </h1>

      <p className="mb-7 text-center text-sm leading-[1.85] text-text-2">
        منصة مجتمعية لفهرسة الكتب في مكتبات المساجد — تصفّح، اكتشف، وساهم في نشر المعرفة الإسلامية.
      </p>

      <ul aria-label="مميزات المنصة" className="mb-8 flex flex-wrap justify-center gap-2">
        {FEATURE_PILLS.map((pill) => (
          <li
            key={pill.label}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12.5px] font-medium text-text-2 transition-colors hover:border-gold/35 hover:bg-gold/5 hover:text-text"
          >
            <span aria-hidden="true" className="text-[15px] leading-none">
              {pill.icon}
            </span>
            {pill.label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onContinue}
        aria-label="المتابعة إلى تحديد الموقع"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-[15px] font-bold text-[#0A2E1E] transition-transform active:scale-[0.98]"
      >
        التالي — حدّد موقعك
        <span aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M13 9H5M8 5L4 9L8 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </section>
  );
}
