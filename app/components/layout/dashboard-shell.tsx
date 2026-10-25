
"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./sidebar";
import Header from "./header";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-[#172033]/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-[270px] max-w-[85vw] overflow-y-auto">
            <div className="absolute right-3 top-3 z-20">
              <button
                aria-label="Close menu"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg bg-white p-2 text-[#5b5ce2]"
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      <div className="lg:pl-[250px]">
        <div className="flex items-center gap-3 border-b border-[#e8ecf4] bg-white px-5 py-3 lg:hidden">
          <button
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-[#e8ecf4] p-2 text-[#5b5ce2]"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-[#172033]">
            HCM<span className="text-[#5b5ce2]">Lite</span>
          </span>
        </div>

        <Header />

        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
