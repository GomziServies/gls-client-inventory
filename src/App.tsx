import { useState } from "react";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import { Card, CardContent } from "./components/ui/card";
import { Sparkles, Construction } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("client_mobile"));
  const [mobileNumber, setMobileNumber] = useState<string>(() => localStorage.getItem("client_mobile") || "");
  const [clientName, setClientName] = useState<string>(() => localStorage.getItem("client_name") || "Client");
  const [activeMenu, setActiveMenu] = useState("Production Process");

  const handleLoginSuccess = (mobile: string) => {
    setMobileNumber(mobile);
    localStorage.setItem("client_mobile", mobile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("client_mobile");
    localStorage.removeItem("client_name");
    setMobileNumber("");
    setClientName("Client");
    setIsAuthenticated(false);
    setActiveMenu("Production Process");
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "Production Process":
        return (
          <Dashboard
            mobileNumber={mobileNumber}
            setClientName={(name: string) => {
              setClientName(name);
              localStorage.setItem("client_name", name);
            }}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
            <Card className="max-w-md w-full border border-slate-100 shadow-md">
              <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center animate-bounce">
                  <Construction className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">{activeMenu}</h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    The module is currently under development. Gomzi Life Science administrators are integrating webhook triggers and DB connections.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  <span>Gomzi Life Science Admin Automation v1.0.0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Layout 
          onLogout={handleLogout} 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu}
          clientName={clientName}
        >
          {renderContent()}
        </Layout>
      )}
    </>
  );
}
