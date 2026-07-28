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
  clientName = "Mit Dhaduk" 
}: LayoutProps) {
  const initials = clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "MD";
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf6] text-slate-800 font-sans">
      {/* Top Header matching exact reference design */}
      <header className="h-16 border-b border-slate-200/60 bg-white sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-xs">
        
        {/* Left Side: Logo Only */}
        <div className="flex items-center">
          <img src="/gomzi-life-science.png" alt="GOMZI LIFE SCIENCE LLP" className="h-8 md:h-9 w-auto object-contain" />
        </div>

        {/* Right Side: User Profile Badge */}
        <div className="flex items-center gap-4">

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 text-left transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center font-extrabold text-xs border border-[#d2e8aa]">
                {initials}
              </div>
              <div className="hidden md:flex flex-col">
                <div className="text-xs font-extrabold text-slate-900 leading-tight">{clientName}</div>
                <div className="mt-0.5">
                  <span className="bg-[#f0f7e6] text-[#789d1b] text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-[#d2e8aa] uppercase tracking-wider">
                    CLIENT
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center font-bold text-base border border-[#d2e8aa]">
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

                  <div className="pt-2 mt-2">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors text-left"
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
      </header>

      {/* Main Content Area - Full width without Aside menu */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
