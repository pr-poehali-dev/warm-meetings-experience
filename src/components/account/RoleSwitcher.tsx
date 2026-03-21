import { useState } from "react";
import { UserRole } from "@/lib/roles-api";

interface RoleSwitcherProps {
  roles: UserRole[];
  activeRole: string;
  onSwitch: (slug: string) => void;
}

export default function RoleSwitcher({ roles, activeRole, onSwitch }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);

  const activeRoles = roles.filter((r) => r.status === "active");
  const current = activeRoles.find((r) => r.slug === activeRole) || activeRoles[0];

  if (activeRoles.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
        <span className="text-lg">{current?.icon}</span>
        <span className="text-sm font-medium">{current?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <span className="text-lg">{current?.icon}</span>
        <span className="text-sm font-medium">{current?.name}</span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-card border rounded-lg shadow-lg min-w-[200px] py-1">
            {activeRoles.map((role) => (
              <button
                key={role.slug}
                onClick={() => {
                  onSwitch(role.slug);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                  role.slug === activeRole ? "bg-primary/5" : ""
                }`}
              >
                <span className="text-lg">{role.icon}</span>
                <div>
                  <div className="text-sm font-medium">{role.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{role.description}</div>
                </div>
                {role.slug === activeRole && (
                  <span className="ml-auto text-primary text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
