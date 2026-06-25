import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

import { execSync } from "child_process";

function findPdfToText(): string {
  try {
    const found = execSync("which pdftotext 2>/dev/null || ls /nix/store/*/bin/pdftotext 2>/dev/null | head -1", { encoding: "utf8" }).trim().split("\n")[0].trim();
    if (found) return found;
  } catch {}
  return "pdftotext";
}

const PDFTOTEXT = findPdfToText();

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const tmpFile = join(tmpdir(), `pdf_${randomBytes(8).toString("hex")}.pdf`);
  try {
    await writeFile(tmpFile, buffer);
    const raw = await new Promise<string>((resolve, reject) => {
      execFile(PDFTOTEXT, ["-layout", "-enc", "UTF-8", tmpFile, "-"], (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`pdftotext failed: ${stderr || err.message}`));
        } else {
          resolve(stdout);
        }
      });
    });

    // pdftotext -layout sometimes inserts a spurious single space within a Bengali word
    // when a glyph (e.g. a vowel sign + following consonant) is stored at slightly offset
    // X positions. We only remove a space when exactly ONE Bengali character appears
    // isolated between two spaces (or at end-of-line/field), which is the sign of a
    // split-off glyph, not a real word boundary.
    // e.g. "খাতু ন\n"  → "খাতুন\n"  (ন is a lone char at line end → merge)
    // but  "রহিমা খাতুন" stays intact (খাতুন is multi-char, not lone)
    const spuriousSpaceRe = /([\u0980-\u09FF]) ([\u0980-\u09FF])(?=[ \t]{2,}|\n|$)/g;
    let text = raw;
    let prev = "";
    while (prev !== text) {
      prev = text;
      text = text.replace(spuriousSpaceRe, "$1$2");
    }
    return text;
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
