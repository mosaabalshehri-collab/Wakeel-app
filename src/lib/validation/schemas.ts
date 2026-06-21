import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقين",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "الرمز مطلوب"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقين",
    path: ["confirmPassword"],
  });

export const poaTypeEnum = z.enum([
  "عامة",
  "خاصة",
  "بيع",
  "بيع عقار",
  "إدارة أعمال",
  "أخرى",
]);

export const poaStatusEnum = z.enum(["active", "expired", "cancelled"]);

// رقم الهوية/الإقامة ورقم الجوال: أرقام فقط، 10 خانات على الأقل
const idNumberSchema = z
  .string()
  .min(1, "رقم الهوية / الإقامة مطلوب")
  .regex(/^\d{10,}$/, "رقم الهوية / الإقامة يجب أن يتكون من 10 أرقام على الأقل");

const phoneSchema = z
  .string()
  .min(1, "رقم الجوال مطلوب")
  .regex(/^\d{10,}$/, "رقم الجوال يجب أن يتكون من 10 أرقام على الأقل");

export const createPoaSchema = z
  .object({
    poaNumber: z.string().min(1, "رقم الوكالة مطلوب").max(50),
    poaType: z.string().min(1, "نوع الوكالة مطلوب"),
    principalName: z.string().min(2, "اسم الموكِّل مطلوب").max(150),
    principalIdNumber: idNumberSchema,
    principalPhone: phoneSchema,
    agentName: z.string().min(2, "اسم الوكيل مطلوب").max(150),
    agentIdNumber: idNumberSchema,
    agentPhone: phoneSchema,
    scopeDescription: z.string().max(1000).optional().or(z.literal("")),
    issueDate: z.string().min(1, "تاريخ الإصدار مطلوب"),
    expiryDate: z.string().min(1, "تاريخ الانتهاء مطلوب"),
    status: poaStatusEnum.optional(),
    notes: z.string().max(1000).optional().or(z.literal("")),
    attachmentPath: z.string().max(200).optional(),
    attachmentOriginalName: z.string().max(255).optional(),
  })
  .refine(
    (data) => !data.expiryDate || data.expiryDate >= data.issueDate,
    {
      message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار أو يساويه",
      path: ["expiryDate"],
    }
  );

// ملاحظة: updatePoaSchema لا يستخدم createPoaSchema.partial() مباشرة لأن
// .refine() يُرجع ZodEffects وليس ZodObject، و partial() غير متاحة عليه.
// لذلك نعيد بناء نسخة جزئية من الحقول الأساسية، مع تطبيق نفس تحقق
// التواريخ المتقاطع — لكن فقط عندما يُرسل الحقلان معاً في طلب التعديل
// (PATCH قد يرسل expiryDate بدون issueDate أو العكس، فلا يصح فرض
// الفحص حينها لأننا لا نملك القيمة الأخرى من السياق هنا).
//
// الحقول الإجبارية (تاريخ الانتهاء، أرقام الهوية، أرقام الجوال) تبقى
// اختيارية بمستوى الـ schema هنا أيضاً لنفس السبب: PATCH الجزئي قد لا
// يتضمنها أصلاً إذا كان التعديل يخص حقلاً آخر فقط. لكن عند إرسالها،
// يُطبَّق عليها نفس قيد العشرة أرقام.
const updatePoaBaseSchema = z.object({
  poaNumber: z.string().min(1, "رقم الوكالة مطلوب").max(50).optional(),
  poaType: z.string().min(1, "نوع الوكالة مطلوب").optional(),
  principalName: z.string().min(2, "اسم الموكِّل مطلوب").max(150).optional(),
  principalIdNumber: idNumberSchema.optional(),
  principalPhone: phoneSchema.optional(),
  agentName: z.string().min(2, "اسم الوكيل مطلوب").max(150).optional(),
  agentIdNumber: idNumberSchema.optional(),
  agentPhone: phoneSchema.optional(),
  scopeDescription: z.string().max(1000).optional().or(z.literal("")),
  issueDate: z.string().min(1).optional(),
  expiryDate: z.string().min(1).optional(),
  status: poaStatusEnum.optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
  attachmentPath: z.string().max(200).optional(),
  attachmentOriginalName: z.string().max(255).optional(),
});

export const updatePoaSchema = updatePoaBaseSchema.refine(
  (data) =>
    !data.expiryDate || !data.issueDate || data.expiryDate >= data.issueDate,
  {
    message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار أو يساويه",
    path: ["expiryDate"],
  }
);
