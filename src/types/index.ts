// أنواع البيانات الأساسية في التطبيق

export type PoaType =
  | "عامة"
  | "خاصة"
  | "بيع"
  | "بيع عقار"
  | "إدارة أعمال"
  | "أخرى";

export type PoaStatus = "active" | "expired" | "cancelled";

export interface PowerOfAttorney {
  id: number;
  userId: number;
  poaNumber: string;
  poaType: string;
  principalName: string;
  principalIdNumber: string | null;
  principalPhone: string | null;
  agentName: string;
  agentIdNumber: string | null;
  agentPhone: string | null;
  scopeDescription: string | null;
  issueDate: string;
  expiryDate: string | null;
  status: PoaStatus;
  notes: string | null;
  attachmentPath: string | null;
  attachmentOriginalName: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoaInput {
  poaNumber: string;
  poaType: string;
  principalName: string;
  principalIdNumber?: string;
  principalPhone?: string;
  agentName: string;
  agentIdNumber?: string;
  agentPhone?: string;
  scopeDescription?: string;
  issueDate: string;
  expiryDate?: string;
  status?: PoaStatus;
  notes?: string;
  attachmentPath?: string;
  attachmentOriginalName?: string;
}

export type UpdatePoaInput = Partial<CreatePoaInput>;

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: number;
  userId: number;
  poaId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
}
