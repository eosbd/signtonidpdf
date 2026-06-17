import { useState } from "react";
import { Link, useLocation } from "wouter";

interface SidebarProps {
  onNavigate?: () => void;
}

const menuItems = [
  { href: "/", label: "Sign To Need PDF", icon: "fa-solid fa-id-card" },
  { href: "/my-files", label: "My Files", icon: "fa-solid fa-folder-open" },
  { href: "/admin", label: "Admin Panel", icon: "fa-solid fa-sliders" },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleNav = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? " active" : ""}`}
        onClick={() => setIsOpen(false)}
      />
      <div className={`sidebar${isOpen ? " open" : ""}`} id="sidebar">
        <div className="brand">
          <i className="fa-solid fa-bolt" />
          <span>E Online Service BD</span>
        </div>
        <ul className="menu-list">
          {menuItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <li
                  className={`menu-item${isActive ? " active" : ""}`}
                  onClick={handleNav}
                >
                  <i className={item.icon} />
                  {item.label}
                </li>
              </Link>
            );
          })}
        </ul>
      </div>

      <button
        className="menu-toggle"
        style={{ position: "fixed", top: "15px", left: "15px", zIndex: 200, background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--accent)", display: "block" }}
        onClick={() => setIsOpen(!isOpen)}
        id="menuToggleBtn"
      >
        <i className="fa-solid fa-bars" />
      </button>
    </>
  );
}
