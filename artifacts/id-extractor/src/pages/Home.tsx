import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUploadDocument, useUpdateRecord, getListRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NidCard } from "@/components/NidCard";
import type { Record } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      let darkCount = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum < 128) darkCount++;
      }
      const isInverted = darkCount > total * 0.5;
      for (let i = 0; i < d.length; i += 4) {
        if (isInverted) {
          d[i] = 255 - d[i];
          d[i + 1] = 255 - d[i + 1];
          d[i + 2] = 255 - d[i + 2];
        }
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum > 180) {
          d[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = src;
  });

interface PublicSettings {
  serviceEnabled: boolean;
  pricePerDownload: number;
  noticeText: string;
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadDoc = useUploadDocument();
  const updateRecord = useUpdateRecord();

  const [recordId, setRecordId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Record>>({ issueDate: getTodayBengali() });
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [serviceSettings, setServiceSettings] = useState<PublicSettings>({
    serviceEnabled: true,
    pricePerDownload: 50,
    noticeText: "স্বাগতম! এনআইডি কার্ড সার্ভিস চালু আছে।",
  });

  useEffect(() => {
    fetch(`${BASE}/api/settings/public`)
      .then((r) => r.json())
      .then((data) => setServiceSettings(data))
      .catch(() => {});
  }, []);

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      toast({ title: "ভুল ফাইল", description: "শুধুমাত্র PDF ফাইল আপলোড করুন।", variant: "destructive" });
      return;
    }
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
          toast({ title: "সফল!", description: "PDF থেকে তথ্য সংগ্রহ করা হয়েছে।" });
        },
        onError: (err) => {
          toast({
            title: "ব্যর্থ হয়েছে",
            description: (err as { error?: string }).error || "একটি সমস্যা হয়েছে।",
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleGenerateCard = () => {
    const nidNum = (formData.idNumber ?? "").replace(/\D/g, "");
    const filename = nidNum ? `nid-${nidNum}` : "nid-card";
    const prevTitle = document.title;
    const doPrint = () => {
      document.title = filename;
      window.onafterprint = () => {
        setTimeout(() => {
          document.title = prevTitle;
        }, 3000);
        window.onafterprint = null;
      };
      setTimeout(() => window.print(), 500);
    };
    if (!recordId) { doPrint(); return; }
    const saveData = { ...formData, photoFront: photoFront ?? undefined, photoBack: photoBack ?? undefined };
    updateRecord.mutate(
      { id: recordId, data: saveData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          toast({ title: "সংরক্ষিত হয়েছে", description: "কার্ড সেভ হয়েছে। এখন প্রিন্ট হবে।" });
          doPrint();
        },
        onError: () => doPrint(),
      }
    );
  };

  const handleReset = () => {
    setRecordId(null);
    setFormData({ issueDate: getTodayBengali() });
    setPhotoFront(null);
    setPhotoBack(null);
  };

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
      <div className="no-print">
        <AppLayout pageTitle="Sign To Need PDF">

          {/* Notice Banner */}
          {serviceSettings.noticeText && (
            <div className="notice-banner">
              <span>NOTICE</span>
              <div className="notice-scroll-container">
                <div className="notice-scroll-text">{serviceSettings.noticeText}</div>
              </div>
            </div>
          )}

          {/* Service Status */}
          <div className={`service-status-banner ${serviceSettings.serviceEnabled ? "service-status-on" : "service-status-off"}`}>
            <i className={`fa-solid ${serviceSettings.serviceEnabled ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ fontSize: "1.2rem" }} />
            <div>
              {serviceSettings.serviceEnabled
                ? "সার্ভিস চালু আছে — আপনি NID কার্ড তৈরি করতে পারবেন।"
                : "সার্ভিস বর্তমানে বন্ধ আছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।"}
            </div>
            {serviceSettings.serviceEnabled && (
              <div style={{ marginLeft: "auto", background: "rgba(22,163,74,0.2)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 700 }}>
                সার্ভিস চার্জ: ৳{serviceSettings.pricePerDownload}
              </div>
            )}
          </div>

          {!serviceSettings.serviceEnabled ? (
            <div className="data-box" style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="fa-solid fa-ban" style={{ fontSize: "3rem", color: "var(--danger)", opacity: 0.5 }} />
              <h3 style={{ marginTop: "15px", color: "var(--text-muted)" }}>সার্ভিস বন্ধ আছে</h3>
              <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "0.9rem" }}>
                এই সার্ভিসটি বর্তমানে অনুপলব্ধ। পরে আবার চেষ্টা করুন।
              </p>
            </div>
          ) : (
            <>
              {/* PDF Upload Area */}
              <div className="data-box">
                <div className="box-header">
                  <h3><i className="fa-solid fa-file-pdf" style={{ marginRight: "8px", color: "var(--danger)" }} />PDF আপলোড করুন</h3>
                  {recordId && (
                    <button className="btn btn-warning btn-sm" onClick={handleReset}>
                      <i className="fa-solid fa-rotate" /> রিসেট
                    </button>
                  )}
                </div>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => document.getElementById("pdf-upload-input")?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--info)" : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "30px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: isDragging ? "rgba(6,182,212,0.05)" : "var(--card-light)",
                    transition: "all 0.2s",
                  }}
                >
                  {uploadDoc.isPending ? (
                    <div>
                      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--info)" }} />
                      <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>তথ্য সংগ্রহ করা হচ্ছে...</p>
                    </div>
                  ) : recordId ? (
                    <div>
                      <i className="fa-solid fa-circle-check" style={{ fontSize: "2rem", color: "var(--success)" }} />
                      <p style={{ marginTop: "10px", color: "#4ade80", fontWeight: 600 }}>PDF সফলভাবে প্রক্রিয়া হয়েছে!</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>নিচের ফর্মে তথ্য যাচাই করুন</p>
                    </div>
                  ) : (
                    <div>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: "2.5rem", color: "var(--text-muted)" }} />
                      <p style={{ marginTop: "10px", color: "var(--text-main)", fontWeight: 600 }}>PDF ফাইল এখানে ড্র্যাগ করুন বা ক্লিক করুন</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "5px" }}>শুধুমাত্র PDF ফাইল (সর্বোচ্চ 10MB)</p>
                    </div>
                  )}
                </div>
                <input
                  id="pdf-upload-input"
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
                />
              </div>

              {/* Form Fields */}
              <div className="data-box">
                <div className="box-header">
                  <h3><i className="fa-solid fa-pen-to-square" style={{ marginRight: "8px", color: "var(--info)" }} />তথ্য ফর্ম</h3>
                </div>

                {/* Photos */}
                <div className="form-grid" style={{ marginBottom: "15px" }}>
                  <div className="form-group">
                    <label><i className="fa-solid fa-image" style={{ marginRight: "5px" }} />ব্যক্তির ছবি</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: 70, height: 85, borderRadius: 6, background: "var(--card-light)", border: "2px solid var(--border-color)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {photoFront
                          ? <img src={photoFront} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <i className="fa-regular fa-image" style={{ color: "var(--text-muted)", fontSize: "1.5rem" }} />}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "front")} style={{ color: "var(--text-muted)", fontSize: "0.8rem" }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-signature" style={{ marginRight: "5px" }} />সিগনেচার / ফিংগারপ্রিন্ট</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: 70, height: 85, borderRadius: 6, background: "#fff", border: "2px solid var(--border-color)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {photoBack
                          ? <img src={photoBack} alt="Signature" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
                          : <i className="fa-solid fa-pen-nib" style={{ color: "#999", fontSize: "1.2rem" }} />}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "back")} style={{ color: "var(--text-muted)", fontSize: "0.8rem" }} />
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>আইডি নাম্বার</label>
                    <input value={formData.idNumber ?? ""} onChange={(e) => handleInputChange("idNumber", e.target.value)} placeholder="NID Number" />
                  </div>
                  <div className="form-group">
                    <label>পিন নাম্বার</label>
                    <input value={formData.pin ?? ""} onChange={(e) => handleInputChange("pin", e.target.value)} placeholder="PIN" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>নাম (বাংলা)</label>
                    <input value={formData.nameBangla ?? ""} onChange={(e) => handleInputChange("nameBangla", e.target.value)} placeholder="বাংলা নাম" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
                  </div>
                  <div className="form-group">
                    <label>নাম (ইংরেজি)</label>
                    <input value={formData.fullName ?? ""} onChange={(e) => handleInputChange("fullName", e.target.value.toUpperCase())} placeholder="ENGLISH NAME" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>জন্ম তারিখ</label>
                    <input value={formData.dateOfBirth ?? ""} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} placeholder="15 Mar 1985" />
                  </div>
                  <div className="form-group">
                    <label>জন্মস্থান</label>
                    <input value={formData.birthPlace ?? ""} onChange={(e) => handleInputChange("birthPlace", e.target.value)} placeholder="জন্মস্থান" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
                  </div>
                  <div className="form-group">
                    <label>রক্তের গ্রুপ</label>
                    <input value={formData.bloodGroup ?? ""} onChange={(e) => handleInputChange("bloodGroup", e.target.value.toUpperCase())} placeholder="A+" style={{ textTransform: "uppercase" }} />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>বাবার নাম</label>
                    <input value={formData.fatherName ?? ""} onChange={(e) => handleInputChange("fatherName", e.target.value)} placeholder="বাবার নাম" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
                  </div>
                  <div className="form-group">
                    <label>মায়ের নাম</label>
                    <input value={formData.motherName ?? ""} onChange={(e) => handleInputChange("motherName", e.target.value)} placeholder="মায়ের নাম" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>ইস্যু তারিখ</label>
                    <input value={formData.issueDate ?? ""} onChange={(e) => handleInputChange("issueDate", e.target.value)} placeholder="২১/০৫/২০২৬" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>ঠিকানা</label>
                  <textarea
                    value={formData.address ?? ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    rows={3}
                    placeholder="বাসা/হোল্ডিং, গ্রাম/রাস্তা, ডাকঘর..."
                    style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
                  />
                </div>

                {/* Generate Button */}
                <div style={{ display: "flex", justifyContent: "center", paddingTop: "15px", paddingBottom: "5px" }}>
                  <button
                    className="btn btn-info btn-lg"
                    onClick={handleGenerateCard}
                    disabled={updateRecord.isPending}
                    style={{ minWidth: "260px", fontSize: "1rem", padding: "14px 30px", boxShadow: "0 0 20px rgba(6,182,212,0.3)" }}
                  >
                    {updateRecord.isPending
                      ? <><i className="fa-solid fa-spinner fa-spin" /> সংরক্ষণ হচ্ছে...</>
                      : <><i className="fa-solid fa-id-card" /> কার্ড তৈরি ও ডাউনলোড করুন</>}
                  </button>
                </div>
                <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "8px" }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: "4px" }} />
                  কার্ড তৈরির পর My Files সেকশনে সংরক্ষিত হবে
                </p>
              </div>
            </>
          )}
        </AppLayout>
      </div>

      {/* Print-only NID Card */}
      <div className="nid-a4-page">
        <NidCard {...cardProps} />
      </div>
    </>
  );
}
