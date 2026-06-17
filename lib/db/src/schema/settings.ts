import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
});

export const serviceConfig = {
  PRICE_PER_DOWNLOAD: "price_per_download",
  SERVICE_ENABLED: "service_enabled",
  NOTICE_TEXT: "notice_text",
  ADMIN_PASSWORD: "admin_password",
} as const;
