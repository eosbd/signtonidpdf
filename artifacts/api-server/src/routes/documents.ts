import { Router, type IRouter } from "express";
import multer from "multer";
import { db, recordsTable } from "@workspace/db";
import { UploadDocumentResponse } from "@workspace/api-zod";
import { extractPdfText } from "../lib/extractPdfText";
import { extractPdfImages } from "../lib/extractPdfImages";

type DbRecord = typeof recordsTable.$inferSelect;
function serialize(r: DbRecord) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

const upload = multer({ storage: multer.memoryStorage() });
const router: IRouter = Router();

function orNull(v: string | null | undefined): string | null {
  return v && v.trim().length > 0 ? v.trim() : null;
}

const EN_TO_BN: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
};
function toBengali(s: string): string {
  return s.replace(/[0-9]/g, (d) => EN_TO_BN[d] ?? d);
}

function find(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return null;
}
const V = "([^\\n]+?)(?=\\s{3,}|\\n|$)";

function parseAddressBlock(rawAddr: string): {
  homeNo: string | null;
  mouza: string | null;
  road: string | null;
  postOffice: string | null;
  postalCode: string | null;
  upozila: string | null;
  district: string | null;
} {
  const pick = (...patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const v = rawAddr.match(p)?.[1]?.trim();
      if (v && v.length > 0) return v;
    }
    return null;
  };

  const upozila = pick(
    /Upozi?la\s{2,}([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Upozi?la\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const district = pick(
    /District\s{2,}([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
    /District\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const postOffice = pick(
    /Post\s*Office\s{2,}([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Post\s*Office\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const postalCodeRaw =
    rawAddr.match(/Postal\s*Code\s+([0-9০-৯]+)/i)?.[1]?.trim() ??
    rawAddr.match(/Postal\s*Code\s*\n\s*([0-9০-৯]+)/i)?.[1]?.trim() ??
    rawAddr.match(/Postal\s*Code[^\n0-9০-৯]*([0-9০-৯]{4,6})/i)?.[1]?.trim() ??
    null;

  const postalCode = postalCodeRaw
    ? postalCodeRaw.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09E6))
    : null;

  const homeNo = pick(
    /Home\s*\/\s*Holding\s+No\.?\s+([\u0980-\u09FF0-9][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Home\s*\/\s*Holding\s{2,}([\u0980-\u09FF0-9][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Home\s*\/\s*Holding\s+([\u0980-\u09FF0-9][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const mouzaFromAdditional = rawAddr.match(
    /Mouza\/Moholla[^\n]*?Additional\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  )?.[1]?.trim();

  const mouzaDirect = pick(
    /Mouza\/Moholla\s{2,}([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Mouza\/Moholla\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const mouza = mouzaFromAdditional ?? mouzaDirect ?? null;

  const roadFromAdditional = rawAddr.match(
    /Additional\s{2,}([\u0980-\u09FF][^\n]+?)\s{3,}Home\s*\/\s*Holding/i,
  )?.[1]?.trim();

  const roadFallback = pick(
    /Village\s*\/\s*Road\s{2,}([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
    /Village\s*\/\s*Road\s+([\u0980-\u09FF][^\n]*?)(?=\s{3,}|\n|$)/i,
  );

  const road = roadFromAdditional ?? roadFallback ?? null;

  return { homeNo, mouza, road, postOffice, postalCode, upozila, district };
}

const BLOOD_GROUP_RE = /^(A|B|O|AB)[+\-−]$/i;

function validateBloodGroup(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace("−", "-");
  if (BLOOD_GROUP_RE.test(clean)) return clean.toUpperCase();
  return null;
}

const NAME_SUFFIX_RE = /\b(মিয়া|বেগম|শেখ|বিশ্বাস|মোল্লা|সরকার)\b/;

function validatePlace(raw: string | null): string | null {
  if (!raw) return null;
  if (NAME_SUFFIX_RE.test(raw)) return null;
  if (/^(মো\.?|মোঃ|মোছাঃ|md\.|mr\.|mrs\.)/i.test(raw.trim())) return null;
  return raw;
}

function extractFields(text: string) {
  const rawName = find(
    text,
    new RegExp(`Name\\s*\\(English\\)\\s+${V}`, "i"),
    new RegExp(`Name\\s*\\(Eng\\)\\s+${V}`, "i"),
  );
  const fullName = rawName ? rawName.trim().toUpperCase() : null;
  const nameBangla = find(text, new RegExp(`Name\\s*\\(Bangla\\)\\s+${V}`, "i"), new RegExp(`Name\\s*\\(Ban\\)\\s+${V}`, "i"));
  const idNumber = find(text, new RegExp(`National\\s*ID\\s+([0-9]+)`, "i"), new RegExp(`NID\\s*No\\.?\\s*([0-9]+)`, "i"), new RegExp(`ID\\s*No\\.?\\s*([0-9]+)`, "i"));
  const pin = find(text, new RegExp(`\\bPIN\\b\\s+([0-9]+)`, "i"), new RegExp(`PIN\\s*No\\.?\\s+([0-9]+)`, "i"));
  const dateOfBirth = find(text, new RegExp(`Date\\s*Of\\s*Birth\\s+${V}`, "i"), new RegExp(`Date\\s*of\\s*Birth\\s*:\\s*${V}`, "i"), new RegExp(`\\bDOB\\b\\s+${V}`, "i"), new RegExp(`Birth\\s*Date\\s+${V}`, "i"));
  const fatherName = find(text, new RegExp(`Father\\s*(?:'?s)?\\s*Name\\s+${V}`, "i"));
  const motherName = find(text, new RegExp(`Mother\\s*(?:'?s)?\\s*Name\\s+${V}`, "i"));
  const gender = find(text, new RegExp(`\\bGender\\b\\s+${V}`, "i"), new RegExp(`\\bSex\\b\\s+${V}`, "i"));
  const religion = find(text, new RegExp(`\\bReligion\\b\\s+${V}`, "i"));
  const bloodGroupRaw = find(text, new RegExp(`Blood\\s*Group\\s+${V}`, "i"), new RegExp(`Blood\\s*Type\\s+${V}`, "i"));
  const bloodGroup = validateBloodGroup(bloodGroupRaw);
  const maritalStatus = find(text, new RegExp(`Marital\\s*Status\\s+${V}`, "i"), new RegExp(`\\bMarital\\b\\s+${V}`, "i"));
  const birthPlaceRaw = find(text, new RegExp(`Birth\\s*Place\\s+${V}`, "i"), new RegExp(`Place\\s*of\\s*Birth\\s+${V}`, "i"));
  const birthPlace = validatePlace(birthPlaceRaw);
  const phone = find(text, new RegExp(`\\bMobile\\b\\s+${V}`, "i"), new RegExp(`\\bPhone\\b\\s+${V}`, "i"), new RegExp(`\\bTel\\b\\s+${V}`, "i"));
  const email = find(text, new RegExp(`\\bEmail\\b\\s+${V}`, "i"), new RegExp(`E-mail\\s+${V}`, "i"));
  const issueDate = find(text, new RegExp(`Issue\\s*Date\\s+${V}`, "i"), new RegExp(`Date\\s*of\\s*Issue\\s+${V}`, "i"), new RegExp(`Issued\\s*On\\s+${V}`, "i"), new RegExp(`\\bIssued\\b\\s+${V}`, "i"));
  const expiryDate = find(text, new RegExp(`Expiry\\s*Date\\s+${V}`, "i"), new RegExp(`Date\\s*of\\s*Expiry\\s+${V}`, "i"), new RegExp(`Valid\\s*Until\\s+${V}`, "i"));

  let nationality = find(text, new RegExp(`\\bNationality\\b\\s+${V}`, "i"), new RegExp(`\\bCitizenship\\b\\s+${V}`, "i"));

  let documentType: string | null = null;
  const lower = text.toLowerCase();
  if (lower.includes("national id") || lower.includes("nid")) documentType = "National ID";
  else if (lower.includes("passport")) documentType = "Passport";
  else if (lower.includes("driving licen")) documentType = "Driver's License";
  else if (lower.includes("residence permit") || lower.includes("resident card")) documentType = "Residence Permit";
  else if (lower.includes("identity card") || lower.includes("id card")) documentType = "ID Card";

  if (!nationality && documentType === "National ID") nationality = "Bangladeshi";

  let address: string | null = null;
  const addrBlock = text.match(/Present\s*Address\s{1,}([\s\S]+?)(?:Permanent\s*Address|$)/i);
  if (addrBlock) {
    const rawAddr = addrBlock[1];
    const { homeNo, mouza, road, postOffice, postalCode, upozila, district } = parseAddressBlock(rawAddr);
    const postalCodeBn = postalCode ? toBengali(postalCode) : null;
    const gvRoad = mouza && road ? `${mouza}, ${road}` : mouza ? mouza : road ? road : null;
    const parts: string[] = [];
    parts.push(`বাসা/হোল্ডিং: ${homeNo ?? " "}`);
    if (gvRoad) parts.push(`গ্রাম/রাস্তা: ${gvRoad}`);
    if (postOffice) parts.push(`ডাকঘর: ${postOffice}${postalCodeBn ? ` - ${postalCodeBn}` : ""}`);
    if (upozila) parts.push(upozila);
    if (district) parts.push(district);
    if (mouza || road || postOffice || upozila || district || homeNo) {
      address = parts.join(", ");
    } else {
      address = rawAddr.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !/^[A-Z][A-Za-z\/ ]+$/.test(l)).join(", ").slice(0, 400);
    }
  }
  if (!address) {
    address = find(text, /(?:Present\s*)?Address\s+([^\n]+)/i);
  }

  return {
    fullName: orNull(fullName), nameBangla: orNull(nameBangla), dateOfBirth: orNull(dateOfBirth),
    idNumber: orNull(idNumber), pin: orNull(pin), nationality: orNull(nationality),
    address: orNull(address), email: orNull(email), phone: orNull(phone),
    expiryDate: orNull(expiryDate), issueDate: orNull(issueDate), documentType,
    fatherName: orNull(fatherName), motherName: orNull(motherName), gender: orNull(gender),
    religion: orNull(religion), bloodGroup: orNull(bloodGroup), maritalStatus: orNull(maritalStatus),
    birthPlace: orNull(birthPlace),
  };
}

router.post(
  "/documents/upload",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    if (req.file.mimetype !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files are accepted" });
      return;
    }

    let rawText = "";
    try {
      rawText = await extractPdfText(req.file.buffer);
    } catch (err) {
      req.log.warn({ err }, "PDF text extraction failed");
    }

    let photoFront: string | null = null;
    let photoBack: string | null = null;
    try {
      const imgs = await extractPdfImages(req.file.buffer);
      photoFront = imgs.photo;
      photoBack = imgs.signature;
    } catch (err) {
      req.log.warn({ err }, "PDF image extraction failed");
    }

    const fields = extractFields(rawText);

    const [record] = await db
      .insert(recordsTable)
      .values({ ...fields, rawText, fileName: req.file.originalname, photoFront, photoBack })
      .returning();

    res.json(UploadDocumentResponse.parse({ record: serialize(record), rawText }));
  }
);

export default router;
