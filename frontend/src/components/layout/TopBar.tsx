import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const companyName = user?.company?.name ?? "Waitino";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-semibold text-gray-700">{companyName}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="hidden text-sm text-gray-600 sm:block">
            {user?.firstName} {user?.lastName}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Odjava">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
