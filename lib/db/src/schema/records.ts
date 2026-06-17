import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recordsTable = pgTable("records", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  nameBangla: text("name_bangla"),
  dateOfBirth: text("date_of_birth"),
  idNumber: text("id_number"),
  pin: text("pin"),
  nationality: text("nationality"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  expiryDate: text("expiry_date"),
  issueDate: text("issue_date"),
  documentType: text("document_type"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  gender: text("gender"),
  religion: text("religion"),
  bloodGroup: text("blood_group"),
  maritalStatus: text("marital_status"),
  birthPlace: text("birth_place"),
  photoFront: text("photo_front"),
  photoBack: text("photo_back"),
  rawText: text("raw_text").notNull().default(""),
  fileName: text("file_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecordSchema = createInsertSchema(recordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof recordsTable.$inferSelect;
