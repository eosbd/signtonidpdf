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
    const text = await new Promise<string>((resolve, reject) => {
      execFile(PDFTOTEXT, ["-layout", "-enc", "UTF-8", tmpFile, "-"], (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`pdftotext failed: ${stderr || err.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
    return text;
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
