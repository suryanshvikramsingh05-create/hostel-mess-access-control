"use client";

import { useState, type ReactNode } from "react";
import TopBar from "@/components/ui/TopBar";
import Logo from "@/components/ui/Logo";
import { MenuIcon, XIcon } from "@/components/ui/icons";

export interface DashboardSection {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

export default function DashboardShell({
  roleLabel,
  userName,
  sections,
}: {
  roleLabel: string;
  userName: string;
  sections: DashboardSection[];
}) {
  const [active, setActive] = useState(sections[0]?.key);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeSection = sections.find((s) => s.key === active) ?? sections[0];

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-100 px-5">
          <Logo size="md" />
          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {sections.map((section) => {
            const isActive = section.key === activeSection?.key;
            return (
              <button
                key={section.key}
                onClick={() => {
                  setActive(section.key);
                  setMobileNavOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{section.icon}</span>
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Signed in as</p>
          <p className="truncate text-sm font-medium text-slate-700">{roleLabel}</p>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="flex min-h-full flex-1 flex-col lg:pl-0">
        <TopBar
          title={activeSection?.label ?? ""}
          roleLabel={roleLabel}
          userName={userName}
          onMenuClick={() => setMobileNavOpen(true)}
          leftSlot={<MenuIcon className="h-5 w-5" />}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={activeSection?.key} className="mx-auto max-w-6xl animate-fade-in">
            {activeSection?.content}
          </div>
        </main>
      </div>
    </div>
  );
}
