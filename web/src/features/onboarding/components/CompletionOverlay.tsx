// web/src/features/onboarding/components/CompletionOverlay.tsx
interface CompletionOverlayProps {
  visible: boolean;
}

export function CompletionOverlay({ visible }: CompletionOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0A2E1E]/95 backdrop-blur-md"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path
            d="M10 20 L17 28 L30 13"
            stroke="#C9A84C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="font-serif text-lg text-gold">على رفوف المساجد</div>
      <div className="h-px w-10 bg-gold/30" />
      <div className="text-center text-2xl font-bold leading-snug text-text">
        أهلاً بك
        <br />
        في المنصة
      </div>
      <div className="text-sm text-text-3">جارٍ الانتقال إلى صفحة التصفح…</div>
    </div>
  );
}
