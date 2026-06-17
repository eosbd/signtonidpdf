import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { useUploadDocument, useUpdateRecord, getListRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download } from "lucide-react";
import { NidCard } from "@/components/NidCard";

import type { Record } from "@workspace/api-client-react";

const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BENGALI_DIGIT: { [key: string]: string } = {
  "0":"০","1":"১","2":"২","3":"৩","4":"৪","5":"৫","6":"৬","7":"৭","8":"৮","9":"৯",
};

function toBengaliDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BENGALI_DIGIT[d] ?? d);
}

function formatDob(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = EN_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function formatIssueDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    return toBengaliDigits(`${day}/${m}/${y}`);
  }
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return toBengaliDigits(`${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`);
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = String(d.getUTCFullYear());
    return toBengaliDigits(`${day}/${month}/${year}`);
  }
  return raw;
}

function getTodayBengali(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  return toBengaliDigits(`${day}/${month}/${year}`);
}

const processBackImage = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const total = d.length / 4;
      let grayCount = 0;
      let darkCount = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum >= 50 && lum <= 200) grayCount++;
        if (lum < 40) darkCount++;
      }
      if (grayCount / total > 0.2) { resolve(src); return; }
      if (darkCount / total > 0.4) {
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum < 80) { d[i + 3] = 0; }
          else { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255; }
        }
      } else {
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 220 && d[i + 1] > 220 && d[i + 2] > 220) { d[i + 3] = 0; }
          else { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255; }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = src;
  });

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadDoc = useUploadDocument();
  const updateRecord = useUpdateRecord();

  const [recordId, setRecordId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Record>>({ issueDate: getTodayBengali() });
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    uploadDoc.mutate(
      { data: { file } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          setRecordId(res.record.id);
          const rec = res.record;
          const formatted: Partial<Record> = {
            ...rec,
            dateOfBirth: formatDob(rec.dateOfBirth),
            issueDate: formatIssueDate(rec.issueDate) || getTodayBengali(),
          };
          setFormData(formatted);
          if (rec.photoFront) setPhotoFront(rec.photoFront);
          if (rec.photoBack) {
            processBackImage(rec.photoBack).then((processed) => {
              setPhotoBack(processed);
              setFormData((prev) => ({ ...prev, photoBack: processed }));
            });
          }
          toast({ title: "Extraction Complete", description: "Successfully extracted fields from document." });
        },
        onError: (err) => {
          toast({
            title: "Extraction Failed",
            description: (err as { error?: string }).error || "An unknown error occurred.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleInputChange = (field: keyof Record, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const raw = event.target?.result as string;
      const base64 = type === "back" ? await processBackImage(raw) : raw;
      if (type === "front") {
        setPhotoFront(base64);
        setFormData((prev) => ({ ...prev, photoFront: base64 }));
      } else {
        setPhotoBack(base64);
        setFormData((prev) => ({ ...prev, photoBack: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const nidNum = (formData.idNumber ?? "").replace(/\D/g, "").slice(0, 10);
    const filename = nidNum ? `nid-${nidNum}` : "nid-card";
    const prevTitle = document.title;
    const doPrint = () => {
      document.title = filename;
      window.onafterprint = () => {
        document.title = prevTitle;
        window.onafterprint = null;
      };
      setTimeout(() => window.print(), 200);
    };
    if (!recordId) { doPrint(); return; }
    const saveData = { ...formData, photoFront: photoFront ?? undefined, photoBack: photoBack ?? undefined };
    updateRecord.mutate(
      { id: recordId, data: saveData },
      {
        onSuccess: () => doPrint(),
        onError: () => {
          toast({ title: "সংরক্ষণ ব্যর্থ", description: "ডেটা সেভ করতে ব্যর্থ। তবুও প্রিন্ট চেষ্টা করছে।", variant: "destructive" });
          doPrint();
        },
      }
    );
  };

  const inputCls = "bg-slate-800/50 border-slate-700 focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] text-slate-100";

  const cardProps = {
    nameBangla: formData.nameBangla ?? "",
    fullName: formData.fullName ?? "",
    fatherName: formData.fatherName ?? "",
    motherName: formData.motherName ?? "",
    dateOfBirth: formData.dateOfBirth ?? "",
    idNumber: formData.idNumber ?? "",
    pin: formData.pin ?? "",
    address: formData.address ?? "",
    bloodGroup: formData.bloodGroup ?? "",
    birthPlace: formData.birthPlace ?? "",
    issueDate: formData.issueDate ?? "",
    photoFront,
    photoBack,
    gender: formData.gender ?? "",
    maritalStatus: formData.maritalStatus ?? "",
  };

  return (
    <>
      {/* ── Screen UI — hidden during print ── */}
      <div className="no-print">
        <AppLayout>
          <div className="flex-1 overflow-auto bg-[#0f172a] text-slate-100 p-4 md:p-8 dark min-h-full">
            <div className="max-w-3xl mx-auto space-y-6">

              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE SYSTEM ACTIVE
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-['Hind_Siliguri'] mt-4">
                  এনআইডি কার্ড মেইকার
                </h1>
                <p className="text-slate-400 font-['Hind_Siliguri']">
                  পিডিএফ আপলোড করুন অথবা ম্যানুয়ালি ফর্ম পূরণ করুন
                </p>
              </div>

              <Card className="bg-[#1e293b] border-slate-700 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <FileUpload
                    onFileSelect={handleFileUpload}
                    isLoading={uploadDoc.isPending}
                    className="min-h-[160px] bg-[#1e293b]/50 border-dashed border-slate-600 hover:border-[#06b6d4]/50 transition-colors"
                    title="পিডিএফ ফাইল এখানে ছাড়ুন বা ক্লিক করুন"
                    description="পিডিএফ (Max 10MB)"
                    buttonText="ডকুমেন্ট নির্বাচন করুন"
                    loadingText="তথ্য সংগ্রহ করা হচ্ছে..."
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#1e293b] border-slate-700">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri'] font-semibold">ব্যক্তির ছবি</Label>
                      <p className="text-xs text-slate-500 font-['Hind_Siliguri']">পিডিএফ থেকে স্বয়ংক্রিয়ভাবে নেওয়া হয়</p>
                      <Input
                        type="file" accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, "front")}
                        className="bg-slate-800 border-slate-700 text-slate-300 cursor-pointer file:text-slate-300 file:bg-slate-700 file:border-0 file:rounded-md file:px-2 file:mr-2 text-xs"
                        data-testid="input-photo-front"
                      />
                    </div>
                    <div className="w-20 h-24 rounded-md bg-slate-800 border-2 border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {photoFront
                        ? <img src={photoFront} alt="Photo" className="w-full h-full object-cover" />
                        : <span className="text-[10px] text-slate-500 font-['Hind_Siliguri'] text-center px-1">ছবি নেই</span>
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-slate-700">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri'] font-semibold">সিগনেচার / ফিংগারপ্রিন্ট</Label>
                      <p className="text-xs text-slate-500 font-['Hind_Siliguri']">পিডিএফ থেকে স্বয়ংক্রিয়ভাবে নেওয়া হয়</p>
                      <Input
                        type="file" accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, "back")}
                        className="bg-slate-800 border-slate-700 text-slate-300 cursor-pointer file:text-slate-300 file:bg-slate-700 file:border-0 file:rounded-md file:px-2 file:mr-2 text-xs"
                        data-testid="input-photo-back"
                      />
                    </div>
                    <div className="w-20 h-24 rounded-md bg-white border-2 border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {photoBack
                        ? <img src={photoBack} alt="Signature" className="w-full h-full object-contain p-1" />
                        : <span className="text-[10px] text-slate-400 font-['Hind_Siliguri'] text-center px-1">সিগনেচার নেই</span>
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-[#1e293b] border-slate-700 shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">আইডি নাম্বার</Label>
                      <Input value={formData.idNumber ?? ""} onChange={(e) => handleInputChange("idNumber", e.target.value)} className={inputCls} data-testid="input-id-number" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">পিন নাম্বার</Label>
                      <Input value={formData.pin ?? ""} onChange={(e) => handleInputChange("pin", e.target.value)} className={inputCls} data-testid="input-pin" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">নাম (বাংলা)</Label>
                      <Input value={formData.nameBangla ?? ""} onChange={(e) => handleInputChange("nameBangla", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-name-bangla" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">নাম (ইংরেজি)</Label>
                      <Input value={formData.fullName ?? ""} onChange={(e) => handleInputChange("fullName", e.target.value.toUpperCase())} className={`${inputCls} uppercase tracking-wide`} data-testid="input-full-name" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">জন্ম তারিখ</Label>
                      <Input value={formData.dateOfBirth ?? ""} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-dob" placeholder="15 Mar 1985" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">জন্মস্থান</Label>
                      <Input value={formData.birthPlace ?? ""} onChange={(e) => handleInputChange("birthPlace", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-birth-place" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">রক্তের গ্রুপ</Label>
                      <Input value={formData.bloodGroup ?? ""} onChange={(e) => handleInputChange("bloodGroup", e.target.value)} className={`${inputCls} uppercase`} data-testid="input-blood-group" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">বাবার নাম</Label>
                      <Input value={formData.fatherName ?? ""} onChange={(e) => handleInputChange("fatherName", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-father-name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-['Hind_Siliguri']">মায়ের নাম</Label>
                      <Input value={formData.motherName ?? ""} onChange={(e) => handleInputChange("motherName", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-mother-name" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 font-['Hind_Siliguri']">ইস্যু তারিখ</Label>
                    <Input value={formData.issueDate ?? ""} onChange={(e) => handleInputChange("issueDate", e.target.value)} className={`${inputCls} font-['Hind_Siliguri']`} data-testid="input-issue-date" placeholder="২১/০৫/২০২৬" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 font-['Hind_Siliguri']">ঠিকানা</Label>
                    <Textarea
                      value={formData.address ?? ""}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className={`${inputCls} min-h-[80px] font-['Hind_Siliguri']`}
                      data-testid="input-address"
                      placeholder="বাসা/হোল্ডিং: ..., গ্রাম/রাস্তা: ..., ডাকঘর: ..."
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col items-center justify-center pt-4 pb-8 space-y-3">
                <div className="text-sm text-slate-400 font-['Hind_Siliguri'] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  সার্ভিস চার্জ: ৮২
                </div>
                <Button
                  onClick={handleDownload}
                  disabled={!recordId || updateRecord.isPending}
                  className="w-full max-w-xs bg-[#06b6d4] hover:bg-[#0891b2] text-white py-6 text-lg font-bold rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-2 font-['Hind_Siliguri'] border-none"
                  data-testid="button-download"
                >
                  {updateRecord.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  ডাউনলোড কার্ড
                </Button>
              </div>
            </div>
          </div>
        </AppLayout>
      </div>

      {/* ── Print-only NID card — outside .no-print so it shows when printing ── */}
      <div className="nid-a4-page">
        <NidCard {...cardProps} />
      </div>
    </>
  );
}
