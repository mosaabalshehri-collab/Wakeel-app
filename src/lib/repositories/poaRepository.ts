import { db } from "../db";
import { createPoaRepository } from "./createPoaRepository";

export type { PoaStats } from "./createPoaRepository";
export { TRASH_RETENTION_DAYS } from "./createPoaRepository";

/**
 * نسخة الـ repository المرتبطة بقاعدة بيانات التطبيق الفعلية.
 * كل API routes تستورد من هنا مباشرة. للاختبارات، استخدم
 * createPoaRepository(testDb) بدلاً من ذلك.
 */
const repo = createPoaRepository(db);

export const findAllByUser = repo.findAllByUser;
export const findById = repo.findById;
export const findDeletedByUser = repo.findDeletedByUser;
export const findDeletedById = repo.findDeletedById;
export const create = repo.create;
export const update = repo.update;
export const softDelete = repo.softDelete;
export const restore = repo.restore;
export const hardDelete = repo.hardDelete;
export const purgeOldDeleted = repo.purgeOldDeleted;
export const getStats = repo.getStats;
export const existsByNumber = repo.existsByNumber;
