import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AdminSettings {
  serviceEnabled: boolean;
  pricePerDownload: number;
  noticeText: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("admin_token"));
  const [loginPass, setLoginPass] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [settings, setSettings] = useState<AdminSettings>({
    serviceEnabled: true,
    pricePerDownload: 50,
    noticeText: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) loadSettings();
  }, [token]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/settings/admin`, {
        headers: { "x-admin-token": token! },
      });
      if (!res.ok) { setToken(null); sessionStorage.removeItem("admin_token"); return; }
      const data = await res.json();
      setSettings(data);
    } catch {
      toast({ title: "ত্রুটি", description: "সেটিংস লোড হয়নি।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const res = await fetch(`${BASE}/api/settings/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPass }),
      });
      if (!res.ok) {
        toast({ title: "লগইন ব্যর্থ", description: "পাসওয়ার্ড ভুল।", variant: "destructive" });
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("admin_token", data.token);
      setToken(data.token);
    } catch {
      toast({ title: "ত্রুটি", description: "সার্ভার সংযোগ ব্যর্থ।", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        serviceEnabled: settings.serviceEnabled,
        pricePerDownload: settings.pricePerDownload,
        noticeText: settings.noticeText,
      };
      if (newPassword.trim()) body.newPassword = newPassword.trim();
      const res = await fetch(`${BASE}/api/settings/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token! },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "সংরক্ষিত হয়েছে", description: "সেটিংস আপডেট হয়েছে।" });
      setNewPassword("");
    } catch {
      toast({ title: "ত্রুটি", description: "সেটিংস সেভ হয়নি।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(null);
  };

  if (!token) {
    return (
      <AppLayout pageTitle="Admin Panel">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "30px", width: "90%", maxWidth: "380px" }}>
            <h2 style={{ color: "var(--accent)", textAlign: "center", marginBottom: "20px", fontSize: "1.2rem" }}>
              <i className="fa-solid fa-lock" style={{ marginRight: "8px" }} />
              Admin Login
            </h2>
            <div className="form-group">
              <label>পাসওয়ার্ড</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Admin password"
              />
            </div>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleLogin}
              disabled={loginLoading}
              style={{ marginTop: "8px" }}
            >
              {loginLoading ? <><i className="fa-solid fa-spinner fa-spin" /> লোড হচ্ছে...</> : <><i className="fa-solid fa-right-to-bracket" /> লগইন করুন</>}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Admin Panel">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
        <button className="btn btn-danger btn-sm" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket" /> Logout
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem" }} />
          <p style={{ marginTop: "10px" }}>লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: "20px" }}>
            <div className="stat-card">
              <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.serviceEnabled ? "var(--success)" : "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}>
                <i className={`fa-solid ${settings.serviceEnabled ? "fa-circle-check" : "fa-circle-xmark"}`} />
              </div>
              <div className="stat-info">
                <span className="stat-value" style={{ color: settings.serviceEnabled ? "#4ade80" : "#f87171" }}>
                  {settings.serviceEnabled ? "চালু" : "বন্ধ"}
                </span>
                <span className="stat-label">সার্ভিস স্ট্যাটাস</span>
              </div>
            </div>
            <div className="stat-card">
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}>
                <i className="fa-solid fa-bangladeshi-taka-sign" />
              </div>
              <div className="stat-info">
                <span className="stat-value">৳{settings.pricePerDownload}</span>
                <span className="stat-label">ডাউনলোড মূল্য</span>
              </div>
            </div>
          </div>

          {/* Service Toggle */}
          <div className="data-box">
            <div className="box-header">
              <h3><i className="fa-solid fa-power-off" style={{ marginRight: "8px", color: "var(--accent)" }} />সার্ভিস চালু / বন্ধ</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", padding: "10px 0" }}>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.serviceEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, serviceEnabled: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
              <div>
                <div style={{ fontWeight: 600, color: settings.serviceEnabled ? "#4ade80" : "#f87171" }}>
                  {settings.serviceEnabled ? "✓ সার্ভিস চালু আছে" : "✗ সার্ভিস বন্ধ আছে"}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px" }}>
                  {settings.serviceEnabled
                    ? "User দের কাছে সার্ভিস দৃশ্যমান এবং ব্যবহারযোগ্য।"
                    : "User দেখতে পাবে সার্ভিস বর্তমানে বন্ধ আছে।"}
                </div>
              </div>
            </div>
          </div>

          {/* Price Management */}
          <div className="data-box">
            <div className="box-header">
              <h3><i className="fa-solid fa-bangladeshi-taka-sign" style={{ marginRight: "8px", color: "var(--warning)" }} />ডাউনলোড মূল্য নির্ধারণ</h3>
            </div>
            <div className="form-group" style={{ maxWidth: "300px" }}>
              <label>প্রতিটি কার্ড ডাউনলোড মূল্য (টাকা)</label>
              <input
                type="number"
                min="0"
                value={settings.pricePerDownload}
                onChange={(e) => setSettings((s) => ({ ...s, pricePerDownload: parseInt(e.target.value) || 0 }))}
                placeholder="যেমন: 50"
              />
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: "5px" }} />
              এই মূল্য User-এর কাছে দেখানো হবে যখন তারা NID কার্ড তৈরি করবে।
            </p>
          </div>

          {/* Notice Text */}
          <div className="data-box">
            <div className="box-header">
              <h3><i className="fa-solid fa-bullhorn" style={{ marginRight: "8px", color: "var(--info)" }} />নোটিশ / ঘোষণা</h3>
            </div>
            <div className="form-group">
              <label>স্ক্রলিং নোটিশ টেক্সট</label>
              <textarea
                rows={3}
                value={settings.noticeText}
                onChange={(e) => setSettings((s) => ({ ...s, noticeText: e.target.value }))}
                placeholder="User দের জন্য নোটিশ লিখুন..."
              />
            </div>
          </div>

          {/* Password Change */}
          <div className="data-box">
            <div className="box-header">
              <h3><i className="fa-solid fa-key" style={{ marginRight: "8px", color: "var(--danger)" }} />পাসওয়ার্ড পরিবর্তন</h3>
            </div>
            <div className="form-group" style={{ maxWidth: "300px" }}>
              <label>নতুন পাসওয়ার্ড (খালি রাখলে পরিবর্তন হবে না)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড"
              />
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "30px" }}>
            <button
              className="btn btn-success btn-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin" /> সংরক্ষণ হচ্ছে...</>
                : <><i className="fa-solid fa-floppy-disk" /> সেটিংস সংরক্ষণ করুন</>}
            </button>
          </div>
        </>
      )}
    </AppLayout>
  );
}
