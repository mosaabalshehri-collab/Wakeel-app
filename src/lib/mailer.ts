/**
 * وحدة إرسال البريد الإلكتروني.
 *
 * المشروع حالياً قيد البناء بدون خدمة بريد فعلية مربوطة. هذا الملف
 * مبني بحيث يعمل فوراً بمجرد إضافة مفتاح API لخدمة Resend
 * (https://resend.com) عبر متغير البيئة RESEND_API_KEY — لا حاجة
 * لتعديل أي كود آخر في المشروع.
 *
 * في حال عدم وجود المفتاح (وضع التطوير الحالي)، الرسائل تُطبع في
 * console بدلاً من إرسالها فعلياً، حتى يمكن اختبار تدفقي تأكيد
 * البريد واسترجاع كلمة المرور كاملين محلياً دون أي اعتماد خارجي.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "وكيل <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!RESEND_API_KEY) {
    // وضع التطوير: نطبع الرسالة بدل إرسالها، عشان يقدر المطوّر يتابع
    // الرابط (رمز التحقق / استرجاع كلمة المرور) من الطرفية مباشرة
    console.log("\n========== [DEV] محاكاة إرسال بريد إلكتروني ==========");
    console.log("إلى:", to);
    console.log("الموضوع:", subject);
    console.log("المحتوى:\n", html);
    console.log("========================================================\n");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`فشل إرسال البريد الإلكتروني: ${response.status} ${errorBody}`);
  }
}

export function buildVerificationEmail(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: "تأكيد بريدك الإلكتروني - وكيل",
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #00754A;">تأكيد بريدك الإلكتروني</h2>
        <p>أهلاً بك في وكيل. اضغط الرابط التالي لتأكيد بريدك الإلكتروني:</p>
        <p>
          <a href="${verifyUrl}" style="background: #00754A; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
            تأكيد البريد الإلكتروني
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">إذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.</p>
      </div>
    `,
  };
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "استرجاع كلمة المرور - وكيل",
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #00754A;">استرجاع كلمة المرور</h2>
        <p>وصلنا طلب لاسترجاع كلمة المرور لحسابك. اضغط الرابط التالي لتعيين كلمة مرور جديدة:</p>
        <p>
          <a href="${resetUrl}" style="background: #00754A; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
            تعيين كلمة مرور جديدة
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">
          هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب استرجاع كلمة المرور، يمكنك تجاهل هذه الرسالة.
        </p>
      </div>
    `,
  };
}
