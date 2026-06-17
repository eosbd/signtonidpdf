import { Router, type IRouter } from "express";
import { db, settingsTable, serviceConfig } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  [serviceConfig.PRICE_PER_DOWNLOAD]: "50",
  [serviceConfig.SERVICE_ENABLED]: "true",
  [serviceConfig.NOTICE_TEXT]: "স্বাগতম! এনআইডি কার্ড সার্ভিস চালু আছে।",
  [serviceConfig.ADMIN_PASSWORD]: "admin123",
};

async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    if (existing.length === 0) {
      await db.insert(settingsTable).values({ key, value });
    }
  }
}

async function getSetting(key: string): Promise<string> {
  await ensureDefaults();
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return rows[0]?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

async function setSetting(key: string, value: string) {
  await ensureDefaults();
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/settings/public", async (_req, res): Promise<void> => {
  const enabled = await getSetting(serviceConfig.SERVICE_ENABLED);
  const price = await getSetting(serviceConfig.PRICE_PER_DOWNLOAD);
  const notice = await getSetting(serviceConfig.NOTICE_TEXT);
  res.json({ serviceEnabled: enabled === "true", pricePerDownload: parseInt(price, 10) || 50, noticeText: notice });
});

router.get("/settings/admin", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"];
  const adminPass = await getSetting(serviceConfig.ADMIN_PASSWORD);
  if (token !== adminPass) { res.status(401).json({ error: "Unauthorized" }); return; }
  const enabled = await getSetting(serviceConfig.SERVICE_ENABLED);
  const price = await getSetting(serviceConfig.PRICE_PER_DOWNLOAD);
  const notice = await getSetting(serviceConfig.NOTICE_TEXT);
  res.json({ serviceEnabled: enabled === "true", pricePerDownload: parseInt(price, 10) || 50, noticeText: notice });
});

router.post("/settings/admin", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"];
  const adminPass = await getSetting(serviceConfig.ADMIN_PASSWORD);
  if (token !== adminPass) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { serviceEnabled, pricePerDownload, noticeText, newPassword } = req.body;
  if (typeof serviceEnabled === "boolean") await setSetting(serviceConfig.SERVICE_ENABLED, serviceEnabled ? "true" : "false");
  if (typeof pricePerDownload === "number") await setSetting(serviceConfig.PRICE_PER_DOWNLOAD, String(pricePerDownload));
  if (typeof noticeText === "string") await setSetting(serviceConfig.NOTICE_TEXT, noticeText);
  if (typeof newPassword === "string" && newPassword.trim().length > 0) await setSetting(serviceConfig.ADMIN_PASSWORD, newPassword.trim());
  res.json({ success: true });
});

router.post("/settings/admin/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  const adminPass = await getSetting(serviceConfig.ADMIN_PASSWORD);
  if (password === adminPass) {
    res.json({ success: true, token: adminPass });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

export default router;
