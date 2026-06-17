import { useState } from "react";
import { Link, useLocation } from "wouter";
import { FolderKanban, UploadCloud, BarChart3, CheckCircle2, MoreVertical, X } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { data: health } = useHealthCheck();

  const links = [
    { href: "/", label: "Extract", icon: UploadCloud },
    { href: "/records", label: "Records", icon: FolderKanban },
    { href: "/stats", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="relative">
      {/* থ্রি-ডট বাটন - যা দিয়ে মেনু কন্ট্রোল হবে */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MoreVertical className="w-6 h-6" />}
      </button>

      {/* মেনু ড্রয়ার */}
      {isOpen && (
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white border-r border-gray-200 shadow-xl z-40 flex flex-col pt-16 transition-all duration-300">
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-primary rounded shadow-sm flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">GovID Extract</span>
            </div>

            <nav className="space-y-1">
              {links.map((link) => {
                const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)} // ক্লিক করলে মেনু হাইড হয়ে যাবে
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? "bg-gray-100 text-black" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 px-2">
              <div className={`w-2 h-2 rounded-full ${health?.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-gray-500">System {health?.status === "ok" ? "Online" : "Offline"}</span>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
