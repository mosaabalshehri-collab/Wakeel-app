/**
 * عنصر زخرفي هندسي بسيط (دوائر متحدة المركز + خطوط) يوحي بختم رسمي
 * وموثوقية الوثائق، يستخدم لملء الفراغ بصفحات الدخول/التسجيل دون
 * تشتيت الانتباه عن الفورم. موضوع بشكل مطلق خلف المحتوى.
 */
export default function SealPattern({
  className = "",
  side = "right",
}: {
  className?: string;
  side?: "left" | "right";
}) {
  return (
    <svg
      className={className}
      style={{
        position: "absolute",
        [side]: "-120px",
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
      width="420"
      height="420"
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden="true"
    >
      {/* دوائر متحدة المركز بأسلوب ختم رسمي */}
      <circle cx="210" cy="210" r="200" stroke="var(--color-primary)" strokeOpacity="0.07" strokeWidth="1.5" />
      <circle cx="210" cy="210" r="165" stroke="var(--color-primary)" strokeOpacity="0.09" strokeWidth="1.5" />
      <circle cx="210" cy="210" r="130" stroke="var(--color-gold)" strokeOpacity="0.12" strokeWidth="1.5" />
      <circle cx="210" cy="210" r="95" stroke="var(--color-primary)" strokeOpacity="0.1" strokeWidth="1.5" />

      {/* علامة صح مركزية خفيفة، صدى لشعار التطبيق */}
      <path
        d="M165 215L195 245L255 175"
        stroke="var(--color-primary)"
        strokeOpacity="0.14"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* خطوط شعاعية متباعدة بأسلوب وثيقة/أمان */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        // نحدد عدد منازل عشرية ثابت (toFixed) لأن الفروق الدقيقة جداً
        // في حساب الفاصلة العائمة بين بيئة السيرفر والمتصفح كانت تسبب
        // hydration mismatch حقيقي في React (قيم مثل 58.445554337723278
        // مقابل 58.445554337723251)
        const x1 = (210 + 175 * Math.cos(rad)).toFixed(2);
        const y1 = (210 + 175 * Math.sin(rad)).toFixed(2);
        const x2 = (210 + 200 * Math.cos(rad)).toFixed(2);
        const y2 = (210 + 200 * Math.sin(rad)).toFixed(2);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-gold)"
            strokeOpacity="0.18"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
