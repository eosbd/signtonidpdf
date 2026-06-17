import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListRecords, useDeleteRecord, getListRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NidCard } from "@/components/NidCard";
import type { Record } from "@workspace/api-client-react";

const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDobDisplay(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = EN_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

interface PrintCardProps {
  record: Record;
}

function PrintCard({ record }: PrintCardProps) {
  return (
    <NidCard
      nameBangla={record.nameBangla ?? ""}
      fullName={record.fullName ?? ""}
      fatherName={record.fatherName ?? ""}
      motherName={record.motherName ?? ""}
      dateOfBirth={formatDobDisplay(record.dateOfBirth)}
      idNumber={record.idNumber ?? ""}
      pin={record.pin ?? ""}
      address={record.address ?? ""}
      bloodGroup={record.bloodGroup ?? ""}
      birthPlace={record.birthPlace ?? ""}
      issueDate={record.issueDate ?? ""}
      photoFront={record.photoFront ?? null}
      photoBack={record.photoBack ?? null}
      gender={record.gender ?? ""}
      maritalStatus={record.maritalStatus ?? ""}
    />
  );
}

export default function MyFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useListRecords();
  const deleteRecord = useDeleteRecord();
  const [search, setSearch] = useState("");
  const [printRecord, setPrintRecord] = useState<Record | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = (records ?? []).filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (r.fullName ?? "").toLowerCase().includes(q) ||
      (r.nameBangla ?? "").toLowerCase().includes(q) ||
      (r.idNumber ?? "").includes(q)
    );
  });

  const handleDownload = (record: Record) => {
    setPrintRecord(record);
    const nidNum = (record.idNumber ?? "").replace(/\D/g, "").slice(0, 10);
    const filename = nidNum ? `nid-${nidNum}` : "nid-card";
    const prevTitle = document.title;
    setTimeout(() => {
      document.title = filename;
      window.onafterprint = () => {
        document.title = prevTitle;
        window.onafterprint = null;
        setPrintRecord(null);
      };
      window.print();
    }, 300);
  };

  const handleDelete = (id: number) => {
    if (!confirm("এই ফাইলটি মুছে ফেলবেন?")) return;
    deleteRecord.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          toast({ title: "মুছে গেছে", description: "ফাইলটি মুছে ফেলা হয়েছে।" });
        },
        onError: () => toast({ title: "ত্রুটি", description: "মুছতে ব্যর্থ হয়েছে।", variant: "destructive" }),
      }
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString("bn-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div className="no-print">
        <AppLayout pageTitle="My Files">
          <div className="notice-banner">
            <span>INFO</span>
            <div className="notice-scroll-container">
              <div className="notice-scroll-text">
                এখানে সংরক্ষিত সমস্ত NID কার্ড দেখতে পাবেন। যেকোনো কার্ড ডাউনলোড বা মুছে ফেলতে পারবেন।
              </div>
            </div>
          </div>

          <div className="data-box">
            <div className="box-header">
              <h3><i className="fa-solid fa-folder-open" style={{ marginRight: "8px", color: "var(--info)" }} />
                সংরক্ষিত ফাইলসমূহ
                <span style={{ marginLeft: "10px", background: "var(--card-light)", padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {filtered.length}টি
                </span>
              </h3>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <div style={{ position: "relative", maxWidth: "360px" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }} />
                <input
                  type="text"
                  placeholder="নাম বা NID নম্বর দিয়ে খুঁজুন..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "8px 10px 8px 32px", background: "var(--bg-dark)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff", fontSize: "0.9rem", width: "100%", outline: "none", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem" }} />
                <p style={{ marginTop: "10px" }}>লোড হচ্ছে...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                <p style={{ marginTop: "10px" }}>কোনো ফাইল পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>নাম (বাংলা)</th>
                      <th>নাম (ইংরেজি)</th>
                      <th>NID নম্বর</th>
                      <th>তারিখ</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                        <td style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>{r.nameBangla || "—"}</td>
                        <td>{r.fullName || "—"}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", background: "var(--card-light)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem" }}>
                            {r.idNumber || "—"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{formatDate(r.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => handleDownload(r)}
                              title="ডাউনলোড করুন"
                            >
                              <i className="fa-solid fa-download" /> ডাউনলোড
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(r.id)}
                              title="মুছুন"
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppLayout>
      </div>

      {/* Print area */}
      {printRecord && (
        <div className="nid-a4-page" ref={printRef}>
          <PrintCard record={printRecord} />
        </div>
      )}
    </>
  );
}
