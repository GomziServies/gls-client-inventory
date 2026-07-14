import React, { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  clientName?: string;
}

export default function Layout({ 
  children, 
  onLogout, 
  activeMenu: _activeMenu, 
  setActiveMenu: _setActiveMenu, 
  clientName = "Client" 
}: LayoutProps) {
  const initials = clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CL";
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-100 bg-white sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between shadow-sm shadow-slate-100/30">
        
        {/* Left Side: Profile */}
        <div className="flex items-center gap-3">

          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full md:rounded-lg hover:bg-slate-50 text-left transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm border border-primary-200">
                {initials}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{clientName}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="bg-primary-50 text-primary-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-primary-100 uppercase tracking-wider">
                    CLIENT
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileOpen && (
              <>
                {/* Backdrop to close click */}
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-slate-100 shadow-xl z-20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 pb-3.5 border-b border-slate-50">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-base border border-primary-200">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{clientName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        Client Portal Account
                      </div>
                    </div>
                  </div>
 
                  <div className="py-1 space-y-1">
                    {/* Simplified for Client read-only access */}
                  </div>

                  <div className="pt-2 border-t border-slate-50">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Gomzi Life Science & GN Logo */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 tracking-tight hidden sm:inline-block">
            Gomzi Life Science
          </span>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <img src="/gomzi-nutrition.png" alt="GN Logo" className="h-8 md:h-9 w-auto object-contain" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
