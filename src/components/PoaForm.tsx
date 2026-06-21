"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PowerOfAttorney } from "@/types";
import { ArrowLeftIcon, CheckCircleIcon } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";

const POA_TYPES = ["عامة", "خاصة", "بيع", "بيع عقار", "إدارة أعمال", "أخرى"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 ميجابايت
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

interface FormState {
  poaNumber: string;
  poaType: string;
  principalName: string;
  principalIdNumber: string;
  principalPhone: string;
  agentName: string;
  agentIdNumber: string;
  agentPhone: string;
  scopeDescription: string;
  issueDate: string;
  expiryDate: string;
  status: "active" | "expired" | "cancelled";
  notes: string;
  attachmentPath: string;
  attachmentOriginalName: string;
}

function toFormState(poa?: PowerOfAttorney): FormState {
  return {
    poaNumber: poa?.poaNumber ?? "",
    poaType: poa?.poaType ?? "عامة",
    principalName: poa?.principalName ?? "",
    principalIdNumber: poa?.principalIdNumber ?? "",
    principalPhone: poa?.principalPhone ?? "",
    agentName: poa?.agentName ?? "",
    agentIdNumber: poa?.agentIdNumber ?? "",
    agentPhone: poa?.agentPhone ?? "",
    scopeDescription: poa?.scopeDescription ?? "",
    issueDate: poa?.issueDate ?? new Date().toISOString().slice(0, 10),
    expiryDate: poa?.expiryDate ?? "",
    status: poa?.status ?? "active",
    notes: poa?.notes ?? "",
    attachmentPath: poa?.attachmentPath ?? "",
    attachmentOriginalName: poa?.attachmentOriginalName ?? "",
  };
}

export default function PoaForm({ poa }: { poa?: PowerOfAttorney }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(poa);
  // الحالة الأولية تُحسب مرة واحدة فقط (useState lazy initializer) ولا
  // تتغير بعدها، عشان نقارنها بالحالة الحالية لمعرفة هل المستخدم عدّل
  // أي حقل فعلياً (isDirty)
  const [initialForm] = useState<FormState>(() => toFormState(poa));
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isDirty = useMemo(
    () => !submitted && JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm, submitted]
  );

  // يحذّر فقط من إغلاق التبويب/تحديث الصفحة؛ التنقل الداخلي (زر
  // "إلغاء" أدناه) يُعالَج يدوياً عبر handleCancel لأن Next.js App
  // Router لا يوفر واجهة لاعتراض التنقل الداخلي (راجع تعليق الـ hook)
  useUnsavedChangesWarning(isDirty);

  function handleCancel() {
    if (isDirty && !window.confirm("لديك تعديلات غير محفوظة. هل تريد المغادرة بدون حفظها؟")) {
      return;
    }
    router.back();
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("حجم الملف يجب ألا يتجاوز 5 ميجابايت");
      e.target.value = "";
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError("نوع الملف غير مدعوم. الأنواع المسموحة: PDF، JPG، PNG");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/poa/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFileError(data.error ?? "تعذر رفع الملف");
        return;
      }
      update("attachmentPath", data.attachmentPath);
      update("attachmentOriginalName", data.originalName);
    } catch {
      setFileError("تعذر الاتصال بالخادم أثناء رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment() {
    update("attachmentPath", "");
    update("attachmentOriginalName", "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = isEdit ? `/api/poa/${poa!.id}` : "/api/poa";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        showToast(data.error ?? "حدث خطأ، حاول مرة أخرى", "error");
        return;
      }
      showToast(isEdit ? "تم حفظ التعديلات بنجاح" : "تمت إضافة الوكالة بنجاح");
      setSubmitted(true);
      router.push("/poa");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            color: "var(--color-status-expired)",
            backgroundColor: "var(--color-status-expired-bg)",
          }}
        >
          {error}
        </div>
      )}

      {/* بيانات الوكالة */}
      <Section title="بيانات الوكالة" step={1}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="رقم الوكالة" required>
            <input
              required
              value={form.poaNumber}
              onChange={(e) => update("poaNumber", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="مثال: 123456789"
            />
          </Field>
          <Field label="نوع الوكالة" required>
            <select
              value={form.poaType}
              onChange={(e) => update("poaType", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
            >
              {POA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ الإصدار" required>
            <input
              type="date"
              required
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </Field>
          <Field label="تاريخ الانتهاء" required>
            <input
              type="date"
              required
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </Field>
        </div>
        <Field label="نطاق الصلاحيات / الوصف">
          <textarea
            value={form.scopeDescription}
            onChange={(e) => update("scopeDescription", e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)" }}
            placeholder="مثال: إدارة شؤون عقارية، بيع وشراء..."
          />
        </Field>
        {isEdit && (
          <Field label="الحالة">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as FormState["status"])}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none sm:w-60"
              style={{ borderColor: "var(--color-border)" }}
            >
              <option value="active">سارية</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </Field>
        )}
      </Section>

      {/* بيانات الموكِّل */}
      <Section title="بيانات الموكِّل" step={2}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الاسم" required>
            <input
              required
              value={form.principalName}
              onChange={(e) => update("principalName", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </Field>
          <Field label="رقم الهوية / الإقامة" required>
            <input
              required
              inputMode="numeric"
              minLength={10}
              value={form.principalIdNumber}
              onChange={(e) => update("principalIdNumber", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="10 أرقام على الأقل"
            />
          </Field>
          <Field label="رقم الجوال" required>
            <input
              required
              inputMode="numeric"
              minLength={10}
              value={form.principalPhone}
              onChange={(e) => update("principalPhone", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="05XXXXXXXX"
            />
          </Field>
        </div>
      </Section>

      {/* بيانات الوكيل */}
      <Section title="بيانات الوكيل" step={3}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الاسم" required>
            <input
              required
              value={form.agentName}
              onChange={(e) => update("agentName", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </Field>
          <Field label="رقم الهوية / الإقامة" required>
            <input
              required
              inputMode="numeric"
              minLength={10}
              value={form.agentIdNumber}
              onChange={(e) => update("agentIdNumber", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="10 أرقام على الأقل"
            />
          </Field>
          <Field label="رقم الجوال" required>
            <input
              required
              inputMode="numeric"
              minLength={10}
              value={form.agentPhone}
              onChange={(e) => update("agentPhone", e.target.value)}
              className="tabular w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="05XXXXXXXX"
            />
          </Field>
        </div>
      </Section>

      {/* مرفق الوكالة */}
      <Section title="مرفق الوكالة" step={4} optional>
        {form.attachmentPath ? (
          <div
            className="flex items-center justify-between rounded-lg border px-3 py-2.5"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
              <span>📎</span>
              <a
                href={isEdit ? `/api/poa/${poa!.id}/attachment` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "var(--color-primary-dark)" }}
              >
                {form.attachmentOriginalName || "الملف المرفق"}
              </a>
            </div>
            <button
              type="button"
              onClick={removeAttachment}
              className="text-xs font-medium"
              style={{ color: "var(--color-status-expired)" }}
            >
              إزالة
            </button>
          </div>
        ) : (
          <div>
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition hover:bg-stone-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                {uploading ? "جارٍ الرفع..." : "اضغط لرفع ملف الوكالة"}
              </span>
              <span className="mt-1 text-xs text-stone-400">PDF، JPG، أو PNG — حتى 5 ميجابايت</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {fileError && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--color-status-expired)" }}>
                {fileError}
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="ملاحظات" step={5} optional>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)" }}
          placeholder="أي ملاحظات إضافية..."
        />
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {!loading && <CheckCircleIcon size={16} />}
          {loading ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة الوكالة"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border px-5 py-2.5 text-sm font-medium transition hover:bg-stone-50"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ArrowLeftIcon size={14} />
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  step,
  optional,
  children,
}: {
  title: string;
  step: number;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--color-paper-raised)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary-dark)" }}
        >
          {step}
        </span>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          {title}
        </h2>
        {optional && <span className="text-xs text-stone-400">(اختياري)</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">
        {label} {required && <span style={{ color: "var(--color-status-expired)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
