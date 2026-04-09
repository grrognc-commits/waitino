import { NavLink } from "react-router-dom";
import {
  Map,
  Truck,
  BarChart3,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { useAlertCount } from "@/hooks/useAlertCount";

const navItems = [
  { to: "/", label: "Karta", icon: Map, badge: false },
  { to: "/drivers", label: "Vozači", icon: Truck, badge: false },
  { to: "/analytics", label: "Analitika", icon: BarChart3, badge: false },
  { to: "/alerts", label: "Upozorenja", icon: Bell, badge: true },
  { to: "/settings", label: "Postavke", icon: Settings, badge: false },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { unreadCount } = useAlertCount();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#1e3a5f] transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <span className="text-xl font-bold text-white tracking-tight">
            Waitino
          </span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
              {item.badge && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-xs text-white/40">Waitino v1.0</p>
        </div>
      </aside>
    </>
  );
}
