import { execFile } from "child_process";
import { readdir, readFile, rm, mkdir } from "fs/promises";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

const PDFIMAGES = "/nix/store/29bwm71lzx4b0my95bm494crhnsakj5x-replit-runtime-path/bin/pdfimages";

export interface PdfImages {
  photo: string | null;
  signature: string | null;
}

export async function extractPdfImages(buffer: Buffer): Promise<PdfImages> {
  const id = randomBytes(8).toString("hex");
  const tmpPdf = join(tmpdir(), `pdf_${id}.pdf`);
  const outDir = join(tmpdir(), `pdfimgs_${id}`);

  try {
    await mkdir(outDir, { recursive: true });
    await writeFile(tmpPdf, buffer);

    await new Promise<void>((resolve, reject) => {
      execFile(PDFIMAGES, ["-png", tmpPdf, join(outDir, "img")], (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`pdfimages failed: ${stderr || err.message}`));
        } else {
          resolve();
        }
      });
    });

    const files = (await readdir(outDir))
      .filter((f) => f.endsWith(".png"))
      .sort();

    if (files.length === 0) {
      return { photo: null, signature: null };
    }

    const toDataUrl = async (filename: string): Promise<string> => {
      const data = await readFile(join(outDir, filename));
      return `data:image/png;base64,${data.toString("base64")}`;
    };

    const photo = files.length >= 1 ? await toDataUrl(files[0]) : null;
    const signature = files.length >= 2 ? await toDataUrl(files[files.length - 1]) : null;

    return { photo, signature };
  } catch {
    return { photo: null, signature: null };
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
    await rm(tmpPdf).catch(() => {});
  }
}
