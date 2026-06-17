import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-main)" }}>
      <Sidebar />
      <div className="main-content">
        {pageTitle && (
          <div className="top-bar">
            <div className="header-left" style={{ paddingLeft: "40px" }}>
              <div className="page-title">{pageTitle}</div>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
