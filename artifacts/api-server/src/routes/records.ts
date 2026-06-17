import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, recordsTable } from "@workspace/db";
import {
  GetRecordParams,
  GetRecordResponse,
  UpdateRecordParams,
  UpdateRecordBody,
  UpdateRecordResponse,
  DeleteRecordParams,
  ListRecordsResponse,
  GetRecordStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type DbRecord = typeof recordsTable.$inferSelect;

function serialize(r: DbRecord) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/records/stats", async (_req, res): Promise<void> => {
  const allRecords = await db.select().from(recordsTable).orderBy(desc(recordsTable.createdAt));
  const total = allRecords.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = allRecords.filter((r) => new Date(r.createdAt) >= today).length;
  const typeCounts: Record<string, number> = {};
  for (const r of allRecords) {
    const t = r.documentType ?? "Unknown";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const documentTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
  const recentActivity = allRecords.slice(0, 5).map(serialize);
  res.json(GetRecordStatsResponse.parse({ total, todayCount, documentTypes, recentActivity }));
});

router.get("/records", async (_req, res): Promise<void> => {
  const records = await db.select().from(recordsTable).orderBy(desc(recordsTable.createdAt));
  res.json(ListRecordsResponse.parse(records.map(serialize)));
});

router.get("/records/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRecordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [record] = await db.select().from(recordsTable).where(eq(recordsTable.id, params.data.id));
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(GetRecordResponse.parse(serialize(record)));
});

router.put("/records/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateRecordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateRecordBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [updated] = await db.update(recordsTable).set(body.data).where(eq(recordsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(UpdateRecordResponse.parse(serialize(updated)));
});

router.delete("/records/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteRecordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [deleted] = await db.delete(recordsTable).where(eq(recordsTable.id, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Record not found" }); return; }
  res.sendStatus(204);
});

export default router;
