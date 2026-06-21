/**
 * شعار "وكيل" — علامة صح بأسلوب مستوحى من شعار منصة ناجز:
 * شكل هندسي بسيط بدرجتين من الأخضر يوحي بـ"التحقق" و"الموثوقية"،
 * مناسب لمنصة تتعامل مع وثائق رسمية (وكالات شرعية).
 */
export default function WakeelLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="شعار وكيل"
    >
      <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
      <path
        d="M11 20.5L17 26.5L29.5 13.5"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31.5" cy="9.5" r="3.5" fill="var(--color-gold)" />
    </svg>
  );
}
