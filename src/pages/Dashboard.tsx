import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, Clock, CheckCircle2, RefreshCw, 
  ShoppingBag, Package, Calendar, MapPin, AlertCircle,
  FlaskConical, Palette, Layers, Factory, ShieldCheck, Truck, Check, Percent, Play,
  ChevronLeft, ChevronRight, Eye, X, ExternalLink, Download, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { BASE_API_URL } from "../config";

interface ProductItem {
  item_name: string;
  item_type?: string;
  item_weight?: number;
  item_weight_type?: string;
  quantity?: number;
}

interface ProcessStep {
  status: "pending" | "done" | "skipped";
  completed_date?: string;
  is_outsourced?: boolean;
  is_skipped?: boolean;
}

interface ClientData {
  _id: string;
  common_id: string;
  invoice_number?: number;
  name: string;
  email?: string;
  mobile: string;
  pan_number?: string;
  gst_number?: string;
  billing_address?: {
    address_line_1?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    country?: string;
  };
  items: ProductItem[];
  production_process: {
    formulation: ProcessStep;
    label_sticker: ProcessStep;
    client_label: ProcessStep;
    procurement: ProcessStep;
    production: ProcessStep;
    lab_report: ProcessStep;
    qc: ProcessStep;
    dispatch: ProcessStep;
  };
  overall_process_status?: string;
  createdAt: string;
}

interface DashboardProps {
  mobileNumber: string;
  setClientName: (name: string) => void;
}

export default function Dashboard({ mobileNumber, setClientName }: DashboardProps) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [detailsData, setDetailsData] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [selectedDetailStep, setSelectedDetailStep] = useState<string | null>(null);

  const [approvingDesignId, setApprovingDesignId] = useState<string | null>(null);
  const [rejectingDesignId, setRejectingDesignId] = useState<string | null>(null);
  const [approverName, setApproverName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const [approvingLabelId, setApprovingLabelId] = useState<string | null>(null);
  const [rejectingLabelId, setRejectingLabelId] = useState<string | null>(null);
  const [labelApproverName, setLabelApproverName] = useState<string>("");
  const [labelRejectionReason, setLabelRejectionReason] = useState<string>("");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 280;
      const container = scrollContainerRef.current;
      container.scrollTo({
        left: direction === "left" 
          ? container.scrollLeft - scrollAmount 
          : container.scrollLeft + scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const handleDownloadFile = (url: string, filename: string) => {
    try {
      const baseApiUrl = BASE_API_URL;

      const downloadProxyUrl = `${baseApiUrl}/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      window.location.href = downloadProxyUrl;
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const fetchClientData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const baseApiUrl = BASE_API_URL;

      const res = await fetch(`${baseApiUrl}/gn-clients/production-process?mobile=${mobileNumber}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.status === 200 && Array.isArray(json.data)) {
        setClients(json.data);
        if (json.data.length > 0) {
          setClientName(json.data[0].name);
        }
      } else {
        throw new Error(json.message || "Failed to load data");
      }
    } catch (err: any) {
      console.error("Fetch client error:", err);
      setError(err.message || "Something went wrong while loading data.");
      toast.error("Could not load your production process data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mobileNumber) {
      fetchClientData();
    }
  }, [mobileNumber]);

  const fetchClientDetails = async (clientId: string) => {
    setDetailsLoading(true);
    try {
      const baseApiUrl = BASE_API_URL;

      const res = await fetch(`${baseApiUrl}/gn-clients/production-process/details?clientId=${clientId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch details: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.status === 200) {
        setDetailsData(json.data);
      } else {
        setDetailsData(null);
      }
    } catch (err) {
      console.error("Fetch client details error:", err);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    const activeClient = clients[selectedIdx];
    if (activeClient?._id) {
      fetchClientDetails(activeClient._id);
      setSelectedDetailStep(null);
    }
  }, [selectedIdx, clients]);

  const handleClientLabelAction = async (designId: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !approverName.trim()) {
      toast.error("Please enter your name to confirm approval.");
      return;
    }
    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error("Please enter the reason for rejection.");
      return;
    }

    setSubmittingAction(true);
    try {
      const baseApiUrl = BASE_API_URL;

      const res = await fetch(`${baseApiUrl}/gn-clients/label-design/approve-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          action,
          approvedBy: approverName,
          remarks: rejectionReason
        })
      });

      if (!res.ok) {
        throw new Error("Failed to submit review.");
      }

      const json = await res.json();
      if (json.status === 200) {
        toast.success(action === 'approve' ? "Design approved successfully!" : "Design rejected. Admin has been notified.");
        setApprovingDesignId(null);
        setRejectingDesignId(null);
        setApproverName("");
        setRejectionReason("");
        
        // Refresh details & parent states
        const activeClient = clients[selectedIdx];
        if (activeClient?._id) {
          fetchClientDetails(activeClient._id);
        }
      } else {
        toast.error(json.message || "Failed to update review.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Network error. Please try again.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleClientLabelDocumentAction = async (labelId: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !labelApproverName.trim()) {
      toast.error("Please enter your name to confirm approval.");
      return;
    }
    if (action === 'reject' && !labelRejectionReason.trim()) {
      toast.error("Please enter the reason for rejection.");
      return;
    }

    setSubmittingAction(true);
    try {
      const baseApiUrl = BASE_API_URL;

      const res = await fetch(`${baseApiUrl}/gn-clients/client-label/approve-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelId,
          action,
          approvedBy: labelApproverName,
          remarks: labelRejectionReason
        })
      });

      if (!res.ok) {
        throw new Error("Failed to submit review.");
      }

      const json = await res.json();
      if (json.status === 200) {
        toast.success(action === 'approve' ? "Label approved successfully!" : "Label rejection submitted.");
        setApprovingLabelId(null);
        setRejectingLabelId(null);
        setLabelApproverName("");
        setLabelRejectionReason("");
        
        // Refresh details & parent states
        const activeClient = clients[selectedIdx];
        if (activeClient?._id) {
          fetchClientDetails(activeClient._id);
          fetchClientData();
        }
      } else {
        toast.error(json.message || "Failed to update review.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Network error. Please try again.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getOverallStatus = (client: ClientData): { text: string; color: string; stepIndex: number } => {
    const process = client.production_process;
    if (!process) return { text: "Pending", color: "bg-slate-100 text-slate-700 border-slate-200/50", stepIndex: 0 };

    if (process.dispatch?.status === "done") {
      return { text: "Dispatched", color: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.04)]", stepIndex: 7 };
    }
    if (process.qc?.status === "done") {
      return { text: "Packaging / Ready", color: "bg-blue-50 text-blue-700 border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.04)]", stepIndex: 6 };
    }
    if (process.lab_report?.status === "done" || process.lab_report?.status === "skipped") {
      return { text: "Quality Check Stage", color: "bg-purple-50 text-purple-700 border-purple-200/60 shadow-[0_2px_8px_rgba(168,85,247,0.04)]", stepIndex: 5 };
    }
    if (process.production?.status === "done") {
      return { text: "Laboratory Testing", color: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-[0_2px_8px_rgba(245,158,11,0.04)]", stepIndex: 4 };
    }
    if (process.procurement?.status === "done") {
      return { text: "Active Production", color: "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-[0_2px_8px_rgba(99,102,241,0.04)]", stepIndex: 3 };
    }
    if (process.label_sticker?.status === "done" || process.label_sticker?.status === "skipped") {
      return { text: "Material Sourcing", color: "bg-cyan-50 text-cyan-700 border-cyan-200/60 shadow-[0_2px_8px_rgba(6,182,212,0.04)]", stepIndex: 2 };
    }
    if (process.formulation?.status === "done") {
      return { text: "Label & Artboard Design", color: "bg-orange-50 text-orange-700 border-orange-200/60 shadow-[0_2px_8px_rgba(249,115,22,0.04)]", stepIndex: 1 };
    }

    return { text: "Formulating Supplement", color: "bg-slate-50 text-slate-600 border-slate-200/60", stepIndex: 0 };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-[3px] border-primary-100 border-t-primary-500 animate-spin" />
          <Cpu className="w-6 h-6 text-primary-500 absolute animate-pulse" />
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-wide animate-pulse">Loading live tracking details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4 p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-sm shadow-red-500/10">
          <AlertCircle className="w-6 h-6 animate-bounce" />
        </div>
        <h2 className="text-md font-semibold text-slate-800 tracking-tight">Sync Connection Error</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
        <Button onClick={() => fetchClientData()} className="flex items-center gap-2 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md shadow-slate-950/10 h-10 px-4 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4 p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50">
        <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-150">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-md font-semibold text-slate-800 tracking-tight">No Active Orders Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          We couldn't find any registered invoices or clients linked to the mobile number:
          <strong className="text-slate-700 block mt-1.5 bg-slate-50 border border-slate-100 rounded-lg py-1 px-3 inline-block font-mono text-sm">
            +91 {mobileNumber}
          </strong>
        </p>
        <Button onClick={() => fetchClientData(true)} variant="outline" className="flex items-center gap-2 mt-2 border-slate-200">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Check Again
        </Button>
      </div>
    );
  }

  const selectedClient = clients[selectedIdx];
  const overallStatus = getOverallStatus(selectedClient);

  // Steps definitions (concise and highly professional)
  const steps = [
    {
      title: "1. Formulation Phase",
      description: "Finalizing supplement formulation, nutrition facts table, and regulatory clearance.",
      stepKey: "formulation",
      icon: FlaskConical,
      data: selectedClient.production_process?.formulation,
    },
    /*
    {
      title: "2. Label & Artwork Design",
      description: "Graphic adjustments, label layout approval, and printing container stickers.",
      stepKey: "label_sticker",
      icon: Palette,
      data: selectedClient.production_process?.label_sticker,
      metaInfo: selectedClient.production_process?.label_sticker?.is_outsourced ? "Outsourced Sticker Printing" : "",
    },
    */
    {
      title: "2. Client Label",
      description: "Client custom labels and verification documents.",
      stepKey: "client_label",
      icon: FileText,
      data: selectedClient.production_process?.client_label,
    },
    {
      title: "3. Raw Material Procurement",
      description: "Sourcing premium ingredients, test flavorings, containers, and scoops.",
      stepKey: "procurement",
      icon: Layers,
      data: selectedClient.production_process?.procurement,
    },
    {
      title: "4. Production",
      description: "Blending ingredients, jar filling, induction capping, and batch packaging.",
      stepKey: "production",
      icon: Factory,
      data: selectedClient.production_process?.production,
    },
    {
      title: "5. Laboratory Testing",
      description: "Analyzing safety standards, microbial check, and issuing lab reports.",
      stepKey: "lab_report",
      icon: Cpu,
      data: selectedClient.production_process?.lab_report,
      metaInfo: selectedClient.production_process?.lab_report?.is_skipped ? "Bypassed by Client Request" : "",
    },
    {
      title: "6. Quality Control (QC)",
      description: "Verifying container seal integrity, shrink wrap, and batch code printing.",
      stepKey: "qc",
      icon: ShieldCheck,
      data: selectedClient.production_process?.qc,
    },
    {
      title: "7. Shipping & Dispatch",
      description: "Pallet boxing, manifest mapping, and loading onto dispatch trucks.",
      stepKey: "dispatch",
      icon: Truck,
      data: selectedClient.production_process?.dispatch,
    },
  ];

  const completedCount = steps.filter(s => s.data?.status === "done" || s.data?.status === "skipped").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const totalOrders = clients.length;
  const completedOrdersCount = clients.filter(c => c.production_process?.dispatch?.status === "done").length;
  const activeOrdersCount = totalOrders - completedOrdersCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full relative">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-40px] left-[-40px] w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-500/[0.02] rounded-full blur-[130px] pointer-events-none" />

      {/* Light Neon Accented Header Banner */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-100 border-l-4 border-l-emerald-500">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5">
            <h1 className="text-lg md:text-xl font-semibold text-slate-800 tracking-tight">Production Status Panel</h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xl">
              Real-time monitoring of supplement production workflows for customer account linked to <strong className="text-slate-800 font-semibold whitespace-nowrap">+91 {mobileNumber}</strong>
            </p>
          </div>
          
          <div className="shrink-0 flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => fetchClientData(true)} 
              disabled={refreshing}
              className="text-xs font-semibold flex items-center gap-1.5 h-9 px-3 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs Selector for Invoices (Top Panel) */}
      <div className="space-y-2 relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">Your Invoice Orders</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="h-8 w-8 rounded-full border border-slate-100 bg-white text-slate-500 hover:bg-slate-50 shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div 
            ref={scrollContainerRef}
            className="flex-1 flex gap-2.5 overflow-x-auto py-1.5 select-none scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {clients.map((client, idx) => {
              const isSelected = idx === selectedIdx;
              const overall = getOverallStatus(client);
              return (
                <button
                  key={client._id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl border text-xs transition-all duration-300 flex items-center gap-2.5 hover:translate-y-[-1px] ${
                    isSelected
                      ? "bg-emerald-50/80 text-emerald-700 border-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.08)] ring-1 ring-emerald-400/20 font-semibold"
                      : "bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 font-medium shadow-sm"
                  }`}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    {client.items && client.items.length > 0 && (
                      <span className={`font-bold text-xs tracking-tight text-left ${isSelected ? "text-emerald-800" : "text-slate-800"}`}>
                        {client.items.map(i => i.item_name).join(', ')}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium tracking-wide text-left transition-colors duration-300 ${isSelected ? "text-emerald-600/90" : "text-slate-450"}`}>
                      Invoice #{client.invoice_number || `INV-${client.common_id.slice(-6)}`}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors duration-300 shrink-0 ${
                    isSelected 
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-200/30 shadow-[0_1px_5px_rgba(16,185,129,0.04)]" 
                      : "bg-slate-50 text-slate-500 border-slate-200/50"
                  }`}>
                    {overall.text}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="h-8 w-8 rounded-full border border-slate-100 bg-white text-slate-500 hover:bg-slate-50 shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border border-slate-100/80 border-l-4 border-l-emerald-500 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:scale-[1.01] transition-all duration-300">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{totalOrders}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border border-slate-100/80 border-l-4 border-l-amber-500 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:scale-[1.01] transition-all duration-300">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Production</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{activeOrdersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)] flex items-center justify-center">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border border-slate-100/80 border-l-4 border-l-cyan-500 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:scale-[1.01] transition-all duration-300">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed batches</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{completedOrdersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.05)] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Content: Timeline on Left, Order & Shipping details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        
        {/* Left Side: Timeline Progress Card (2 Columns Wide on large displays) */}
        <div className="lg:col-span-2 space-y-5 w-full">
          <Card className="border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden bg-white/95 backdrop-blur-sm rounded-2xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <CardHeader className="border-b border-slate-50 p-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Live Production Status</div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Production Timeline for Invoice #{selectedClient.invoice_number || `INV-${selectedClient.common_id.slice(-6)}`}
                  </CardTitle>
                </div>
                <div className="shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider shadow-sm ${overallStatus.color}`}>
                    {overallStatus.text}
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="mt-5 pt-3 border-t border-slate-50 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-semibold text-slate-650 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-500" />
                    Overall Process Progress
                  </span>
                  <span className="font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded-md px-2 py-0.5 text-xs shadow-sm shadow-emerald-500/[0.02]">{progressPercent}% Completed</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_1px_5px_rgba(16,185,129,0.2)]" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 md:p-8">
              
              {/* Stepper Timeline Graphics */}
              <div className="relative border-l-2 border-slate-100 ml-5 pl-7 space-y-8 py-1">
                {steps.map((step, idx) => {
                  const stepData = step.data;
                  const StepIcon = step.icon;
                  const isDone = stepData?.status === "done";
                  const isSkipped = stepData?.status === "skipped";
                  const isPending = !stepData || stepData?.status === "pending";
                  
                  // Check if this step is currently in progress
                  const isPreviousStepsDone = steps.slice(0, idx).every(s => s.data?.status === "done" || s.data?.status === "skipped");
                  const isActive = isPending && isPreviousStepsDone;

                  return (
                    <div key={idx} className="relative group transition-all duration-300">
                      
                      {/* Timeline circle dot on line */}
                      <span className={`absolute top-0.5 left-[-41px] w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${
                        isDone 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] scale-105"
                          : isSkipped
                          ? "bg-slate-200 border-slate-200 text-slate-500 shadow-sm"
                          : isActive
                          ? "bg-white border-emerald-500 text-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/15 scale-105"
                          : "bg-white border-slate-100 text-slate-400"
                      }`}>
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        ) : isSkipped ? (
                          <span className="text-[10px] font-bold">X</span>
                        ) : (
                          <StepIcon className="w-3.5 h-3.5" />
                        )}
                      </span>

                      {/* Connectors highlight with subtle neon glow */}
                      {isDone && idx < steps.length - 1 && (
                        <div className="absolute top-7 left-[-32px] w-[2px] h-[34px] bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.2)] z-0" />
                      )}

                      {/* Content step card with left border lighting */}
                      <div 
                        onClick={() => step.stepKey !== 'procurement' && setSelectedDetailStep(step.stepKey)}
                        className={`p-4 rounded-xl border transition-all duration-305 hover:shadow-sm ${
                          step.stepKey !== 'procurement' 
                            ? "cursor-pointer hover:bg-slate-50/70 active:scale-[0.99]" 
                            : ""
                        } ${
                          isDone 
                            ? "bg-emerald-500/[0.01] border-slate-150 border-l-4 border-l-emerald-500 shadow-[0_1px_5px_rgba(0,0,0,0.005)]" 
                            : isActive 
                            ? "bg-emerald-50/[0.03] border-emerald-250 border-l-4 border-l-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.03)]" 
                            : "bg-transparent border-transparent border-l-4 border-l-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <h4 className={`text-xs md:text-sm font-semibold ${
                            isDone 
                              ? "text-slate-800 font-bold" 
                              : isActive 
                              ? "text-emerald-700 font-bold" 
                              : isSkipped 
                              ? "text-slate-500 line-through decoration-slate-300"
                              : "text-slate-400"
                          }`}>
                            {step.title}
                            {step.metaInfo && (
                              <span className="ml-2 bg-slate-100 text-slate-650 border border-slate-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block">
                                {step.metaInfo}
                              </span>
                            )}
                          </h4>
                          
                          {/* Completed dates and status pills */}
                          <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
                            {isDone && stepData?.completed_date && (
                              <span className="text-xs text-slate-600 flex items-center gap-1 font-medium bg-slate-50 border border-slate-100/60 px-2 py-0.5 rounded-md shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(stepData.completed_date)}
                              </span>
                            )}
                            {isSkipped && stepData?.completed_date && (
                              <span className="text-xs text-amber-750 flex items-center gap-1 font-medium bg-amber-50/70 border border-amber-100 px-2 py-0.5 rounded-md shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                {formatDate(stepData.completed_date)}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-ping" />
                                Active Step
                              </span>
                            )}
                            {isPending && !isActive && (
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                                Waiting
                              </span>
                            )}
                            {step.stepKey !== 'procurement' && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/65 border border-emerald-200/50 rounded-md px-2 py-0.5 shadow-sm transition-all hover:bg-emerald-100/85 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> View Details
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-xs mt-1.5 leading-relaxed font-medium ${isPending ? "text-slate-400" : "text-slate-600"}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Side: Order Recipe details and Shipping information (1 Column Wide) */}
        <div className="lg:col-span-1 space-y-5 w-full">
          
          {/* Order Details card */}
          <Card className="border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden bg-white/95 backdrop-blur-sm rounded-2xl">
            <CardHeader className="border-b border-slate-50 p-4 bg-slate-50/40">
              <div className="flex items-center gap-2">
                <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Package className="w-4 h-4" />
                </div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Blend Recipe</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/20 border-b border-slate-100">
                      <th className="p-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplement Item</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-400 tracking-wider text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {selectedClient.items && selectedClient.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 odd:bg-slate-50/[0.15] transition-colors">
                        <td className="p-3.5 font-semibold text-slate-705">
                          <div>{item.item_name}</div>
                          {item.item_weight && (
                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              {item.item_weight} {item.item_weight_type || ""}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 capitalize">{item.item_type || "N/A"}</td>
                        <td className="p-3.5 text-slate-700 font-semibold text-right">{item.quantity || 1} jars</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Billing / Address Summary */}
          {selectedClient.billing_address && (
            <Card className="border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white/95 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-1 pt-4 px-4 border-b border-slate-50 bg-slate-50/40">
                <div className="flex items-center gap-2 pb-2">
                  <MapPin className="w-4 h-4 text-slate-450" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Location</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 border border-slate-100 rounded-xl p-3">
                  {selectedClient.billing_address.address_line_1 && `${selectedClient.billing_address.address_line_1}, `}
                  {selectedClient.billing_address.city && `${selectedClient.billing_address.city}, `}
                  {selectedClient.billing_address.state && `${selectedClient.billing_address.state} `}
                  {selectedClient.billing_address.pin_code && `- ${selectedClient.billing_address.pin_code}, `}
                  {selectedClient.billing_address.country || "India"}
                </p>
              </CardContent>
            </Card>
          )}

        </div>

      </div>

      {/* Premium Read-Only Phase Details Modal */}
      {selectedDetailStep && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl border border-slate-100 max-w-4xl w-full max-h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    {(() => {
                      const step = steps.find(s => s.stepKey === selectedDetailStep);
                      if (step) {
                        const Icon = step.icon;
                        return <Icon className="w-4 h-4" />;
                      }
                      return <Package className="w-4 h-4" />;
                    })()}
                  </span>
                  {steps.find(s => s.stepKey === selectedDetailStep)?.title || "Stage Details"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {steps.find(s => s.stepKey === selectedDetailStep)?.description}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailStep(null)}
                className="p-1.5 rounded-xl border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 bg-white hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto min-h-0">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-[3px] border-emerald-100 border-t-emerald-500 animate-spin" />
                  <p className="text-slate-500 text-xs font-semibold tracking-wide">Retrieving phase records...</p>
                </div>
              ) : (() => {
                const getImageUrl = (url?: string | null) => {
                  if (!url) return '';
                  if (url.startsWith('http') || url.startsWith('data:')) return url;
                  return `https://files.fggroup.in/${url}`;
                };

                const formatDateReadable = (dateStr?: string) => {
                  if (!dateStr) return '-';
                  return new Date(dateStr).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                };

                switch (selectedDetailStep) {
                  case 'formulation': {
                    const list = detailsData?.formulations || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <FlaskConical className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No formulation specifications uploaded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Details will appear here once finalized by laboratory.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-8">
                        {list.map((form: any) => (
                          <div key={form._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{form.productName}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Updated: {formatDateReadable(form.updatedAt)}</p>
                              </div>
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200/35">
                                Scoop Size: {form.scoopSize} gm
                              </span>
                            </div>

                            {/* Nutrients Table */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Formulation Specifications</h5>
                              <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500">
                                      <th className="p-3 font-bold uppercase tracking-wider">Nutrients</th>
                                      <th className="p-3 font-bold text-center">Per {form.scoopSize || 35}g scoop</th>
                                      <th className="p-3 font-bold text-center">Per 100g</th>
                                      <th className="p-3 font-bold text-center">% RDA</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {(form.nutritionItems || []).map((nut: any, idx: number) => {
                                      const v = (nut.rda || '').toString().trim();
                                      const rdaStr = !v ? '-' : v.includes('%') ? v : `${v}%`;
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50/30">
                                          <td className="p-3 text-slate-800 font-bold">{nut.itemName}</td>
                                          <td className="p-3 text-slate-650 text-center">{nut.weight35gm ?? '-'}</td>
                                          <td className="p-3 text-slate-650 text-center">{nut.weight100gm ?? '-'}</td>
                                          <td className="p-3 text-slate-700 font-semibold text-center">{rdaStr}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Amino Acids Profile */}
                            {form.aminoAcidProfile && form.aminoAcidProfile.length > 0 && (
                              <div className="space-y-3 pt-2">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amino Acid Profile</h5>
                                <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {form.aminoAcidProfile.map((cat: any) => (
                                        <React.Fragment key={cat._id}>
                                          <tr className="bg-slate-50/70">
                                            <td className="p-3 font-bold text-slate-800" colSpan={2}>
                                              <div className="flex justify-between items-center">
                                                <span>{cat.title}</span>
                                                {cat.value && (
                                                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200/60 rounded px-2 py-0.5">
                                                    {cat.value} {cat.unit || ''}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                          {(cat.items || []).map((item: any) => (
                                            <tr key={item._id} className="hover:bg-slate-50/20">
                                              <td className="p-3 pl-6 text-slate-600">{item.name}</td>
                                              <td className="p-3 pr-6 text-right font-bold text-slate-700">{item.value} {item.unit || ''}</td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'label_sticker': {
                    const list = detailsData?.labelDesigns || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Palette className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No design approvals found.</p>
                          <p className="text-xs text-slate-400 mt-1">Label layout artworks will be uploaded for approvals here.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-6">
                        {list.map((design: any) => (
                          <div key={design._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Design Project</span>
                                <h4 className="text-sm font-bold text-slate-800">{design.productName}</h4>
                                <p className="text-xs text-slate-500 font-medium">Brand: <strong className="text-slate-700 font-bold">{design.brandName}</strong></p>
                              </div>
                              <div className="space-y-1.5 md:text-right">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Status</span>
                                <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full border ${
                                  design.client_approval_status === 'approved' || design.final_approval_by_client
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200/50" 
                                    : design.client_approval_status === 'rejected'
                                    ? "bg-red-500/10 text-red-700 border-red-200/50"
                                    : "bg-amber-500/10 text-amber-700 border-amber-200/50"
                                }`}>
                                  {design.client_approval_status === 'approved' || design.final_approval_by_client 
                                    ? "✓ Approved" 
                                    : design.client_approval_status === 'rejected'
                                    ? "❌ Rejected by Client"
                                    : "⏳ Pending Client Review"}
                                </span>
                                {(design.client_approval_status === 'approved' || design.final_approval_by_client) && (
                                  <p className="text-[10px] text-slate-500 font-medium">Verified by: {design.final_approval_by || 'Client'}</p>
                                )}
                              </div>
                            </div>

                            {/* Images Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {design.label_preview_image && (
                                <div className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Product Label Artwork
                                  </h5>
                                  <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-all cursor-pointer relative group" onClick={() => window.open(getImageUrl(design.label_preview_image), '_blank')}>
                                    <img src={getImageUrl(design.label_preview_image)} alt="Label Artwork" className="w-full h-48 object-contain p-3" />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                      <span className="text-xs text-white font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> Open Preview
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {design.final_approval_image && (
                                <div className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-550 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Client Confirmation Screenshot
                                  </h5>
                                  <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-all cursor-pointer relative group" onClick={() => window.open(getImageUrl(design.final_approval_image), '_blank')}>
                                    <img src={getImageUrl(design.final_approval_image)} alt="Client Approval" className="w-full h-48 object-contain p-3" />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                      <span className="text-xs text-white font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> View Large
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {design.remarks && (
                              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-650 leading-relaxed">
                                <strong>Remarks / Feedback:</strong> {design.remarks}
                              </div>
                            )}

                            {/* Rejection Warning */}
                            {design.client_approval_status === 'rejected' && design.client_rejection_remarks && (
                              <div className="p-4 bg-red-50 border border-red-155 rounded-xl text-xs text-red-700 leading-relaxed space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                  Label Design Rejection Feedback
                                </div>
                                <p className="pl-5 font-medium">{design.client_rejection_remarks}</p>
                              </div>
                            )}

                            {/* Client Approval / Rejection Actions */}
                            {(!design.client_approval_status || design.client_approval_status === 'pending') && !design.final_approval_by_client && (
                              <div className="pt-4 border-t border-slate-100/60 space-y-4">
                                {approvingDesignId === design._id ? (
                                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-700">Enter Signatory Name</label>
                                      <input 
                                        type="text" 
                                        value={approverName}
                                        onChange={(e) => setApproverName(e.target.value)}
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        placeholder="e.g. John Doe (Proprietor)"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setApprovingDesignId(null); setApproverName(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelAction(design._id, 'approve')} disabled={submittingAction || !approverName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Confirm Approval"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : rejectingDesignId === design._id ? (
                                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-700">Specify Rejection Reason / Remarks</label>
                                      <textarea 
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={3}
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                                        placeholder="e.g. Logo alignment is slightly off, spelling of supplement in nutritional facts is incorrect."
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setRejectingDesignId(null); setRejectionReason(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelAction(design._id, 'reject')} disabled={submittingAction || !rejectionReason.trim()} className="bg-red-600 hover:bg-red-750 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Submit Rejection"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 justify-end">
                                    <Button 
                                      size="sm" 
                                      onClick={() => setRejectingDesignId(design._id)}
                                      className="bg-white border border-red-200 text-red-650 hover:bg-red-50/50 hover:border-red-350 font-bold transition-all"
                                    >
                                      Reject Design
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => setApprovingDesignId(design._id)}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all shadow-sm"
                                    >
                                      Approve Design
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'client_label': {
                    const list = detailsData?.clientLabels || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No client label documents uploaded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Uploaded labels and verification files will appear here.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-6">
                        {list.map((label: any) => (
                          <div key={label._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-4 bg-slate-50/[0.15]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-bold text-slate-800">{label.fileName}</h4>
                                  <p className="text-[10px] text-slate-400">Uploaded: {formatDateReadable(label.createdAt)}</p>
                                </div>
                              </div>
                              <div className="space-y-1.5 sm:text-right">
                                <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full border ${
                                  label.client_approval_status === 'approved' || label.final_approval_by_client
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200/50" 
                                    : label.client_approval_status === 'rejected'
                                    ? "bg-red-500/10 text-red-700 border-red-200/50"
                                    : "bg-amber-500/10 text-amber-700 border-amber-200/50"
                                }`}>
                                  {label.client_approval_status === 'approved' || label.final_approval_by_client 
                                    ? "✓ Approved" 
                                    : label.client_approval_status === 'rejected'
                                    ? "❌ Rejected by Client"
                                    : "⏳ Pending Client Review"}
                                </span>
                                {(label.client_approval_status === 'approved' || label.final_approval_by_client) && (
                                  <p className="text-[10px] text-slate-500 font-medium">Verified by: {label.final_approval_by || 'Client'}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                                {label.fileType?.split('/')?.[1] || label.fileType || 'file'}
                              </span>
                              <Button size="sm" variant="outline" onClick={() => window.open(getImageUrl(label.fileUrl), '_blank')} className="text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-slate-500" /> View File
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const url = getImageUrl(label.fileUrl);
                                const fileExtension = label.fileUrl ? label.fileUrl.split('.').pop().split('?')[0] : '';
                                let filename = label.fileName || 'label-file';
                                if (fileExtension && !filename.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)) {
                                  filename = `${filename}.${fileExtension}`;
                                }
                                handleDownloadFile(url, filename);
                              }} className="text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-slate-500" /> Download File
                              </Button>
                            </div>

                            {/* Rejection Warning */}
                            {label.client_approval_status === 'rejected' && label.client_rejection_remarks && (
                              <div className="p-4 bg-red-50 border border-red-155 rounded-xl text-xs text-red-700 leading-relaxed space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                  Label Rejection Feedback
                                </div>
                                <p className="pl-5 font-medium">{label.client_rejection_remarks}</p>
                              </div>
                            )}

                            {/* Client Approval / Rejection Actions */}
                            {(!label.client_approval_status || label.client_approval_status === 'pending') && !label.final_approval_by_client && (
                              <div className="pt-4 border-t border-slate-100/60 space-y-4">
                                {approvingLabelId === label._id ? (
                                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-700">Enter Signatory Name</label>
                                      <input 
                                        type="text" 
                                        value={labelApproverName}
                                        onChange={(e) => setLabelApproverName(e.target.value)}
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        placeholder="e.g. John Doe (Proprietor)"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setApprovingLabelId(null); setLabelApproverName(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelDocumentAction(label._id, 'approve')} disabled={submittingAction || !labelApproverName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Confirm Approval"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : rejectingLabelId === label._id ? (
                                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-700">Specify Rejection Reason / Remarks</label>
                                      <textarea 
                                        value={labelRejectionReason}
                                        onChange={(e) => setLabelRejectionReason(e.target.value)}
                                        rows={3}
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                                        placeholder="e.g. Layout scaling is incorrect, please upload PDF vector."
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setRejectingLabelId(null); setLabelRejectionReason(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelDocumentAction(label._id, 'reject')} disabled={submittingAction || !labelRejectionReason.trim()} className="bg-red-600 hover:bg-red-750 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Submit Rejection"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 justify-end">
                                    <Button 
                                      size="sm" 
                                      onClick={() => setRejectingLabelId(label._id)}
                                      className="bg-white border border-red-200 text-red-650 hover:bg-red-50/50 hover:border-red-350 font-bold transition-all"
                                    >
                                      Reject Label
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => setApprovingLabelId(label._id)}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all shadow-sm"
                                    >
                                      Approve Label
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'production': {
                    const list = detailsData?.productions || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Factory className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No production logs reported yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Raw weights, volumes, and batch numbers will log here during blending.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-8">
                        {list.map((prod: any) => (
                          <div key={prod._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Produced Blend</span>
                                <h4 className="text-sm font-bold text-slate-800">{prod.production_itemId?.item_name || prod.production_name}</h4>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Batch Number</span>
                                <p className="text-sm font-semibold text-slate-800">{prod.batch_no}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Total Blend Weight</span>
                                <p className="text-sm font-bold text-emerald-600">{prod.total_product_weight}</p>
                              </div>
                            </div>

                            {/* Raw Materials details */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Materials Blending details</h5>
                              <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500">
                                      <th className="p-3 font-bold ps-4">Sr. No.</th>
                                      <th className="p-3 font-bold">Ingredient / Raw Type</th>
                                      <th className="p-3 font-bold text-right pr-4">Intake Weight</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {(prod.productionRawItems || []).map((raw: any, index: number) => (
                                      <tr key={index} className="hover:bg-slate-50/20">
                                        <td className="p-3 ps-4 text-slate-500">{index + 1}</td>
                                        <td className="p-3 text-slate-800 font-bold">{raw.item_name}</td>
                                        <td className="p-3 text-right pr-4 font-bold text-slate-700">
                                          {raw.item_weight_type?.toLowerCase() === 'kg' || raw.item_weight_type?.toLowerCase() === 'ltr' 
                                            ? (Number(raw.item_weight || 0) / 1000) 
                                            : raw.item_weight} {raw.item_weight_type}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-150">
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Total Raw Weight</span>
                                <span className="text-sm font-bold text-slate-700">{(prod.total_raw_weight || 0) / 1000} kg</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Total Raw Volume</span>
                                <span className="text-sm font-bold text-slate-700">{(prod.total_raw_volume || 0) / 1000} Ltr</span>
                              </div>
                            </div>

                            {/* Production Gallery / Media */}
                            {((prod.images && prod.images.length > 0) || (prod.videos && prod.videos.length > 0)) && (
                              <div className="space-y-3 pt-2">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Media Gallery</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {prod.images?.map((imgUrl: string, idx: number) => (
                                    <div 
                                      key={`img-${idx}`} 
                                      className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all cursor-pointer relative group aspect-video flex items-center justify-center"
                                      onClick={() => window.open(getImageUrl(imgUrl), '_blank')}
                                    >
                                      <img src={getImageUrl(imgUrl)} alt={`Production ${idx + 1}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded border border-white/20">
                                          View Image
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {prod.videos?.map((vidUrl: string, idx: number) => (
                                    <div 
                                      key={`vid-${idx}`} 
                                      className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all relative aspect-video flex items-center justify-center group cursor-pointer"
                                      onClick={() => setActiveVideoUrl(getImageUrl(vidUrl))}
                                    >
                                      <video 
                                        src={getImageUrl(vidUrl)} 
                                        className="w-full h-full object-cover pointer-events-none" 
                                        preload="metadata"
                                      />
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded border border-white/20 flex items-center gap-1">
                                          <Play className="w-3 h-3 fill-white text-white" /> Play Video
                                        </span>
                                      </div>
                                      <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider border border-white/10 pointer-events-none">
                                        Video
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'lab_report': {
                    const list = detailsData?.labReports || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Cpu className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No lab test certificates uploaded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Chemical/microbiological reports will show here once testing finishes.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {list.map((report: any) => (
                          <div key={report._id} className="border border-slate-150/70 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-transform cursor-pointer relative group flex flex-col" onClick={() => window.open(getImageUrl(report.image), '_blank')}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-800">{report.productName}</h4>
                                <p className="text-[10px] text-slate-400">Tested: {formatDateReadable(report.createdAt)}</p>
                              </div>
                              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            </div>
                            <div className="bg-slate-50/50 flex-1 flex items-center justify-center p-3 h-48">
                              <img src={getImageUrl(report.image)} alt="Lab Certificate" className="max-h-full max-w-full object-contain" />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <span className="text-xs text-white font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/25 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> View Large Report
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'qc': {
                    const list = detailsData?.qcDocs || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <ShieldCheck className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No QC checksheets uploaded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Verification documents from QC department will show here.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {list.map((qc: any) => (
                          <div key={qc._id} className="border border-slate-150 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/[0.12] hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-800">{qc.fileName}</h4>
                                <p className="text-[10px] text-slate-450">Uploaded: {formatDateReadable(qc.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                                {qc.fileType?.split('/')?.[1] || qc.fileType || 'file'}
                              </span>
                              <Button size="sm" variant="outline" onClick={() => window.open(getImageUrl(qc.fileUrl), '_blank')} className="text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-slate-500" /> View File
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const url = getImageUrl(qc.fileUrl);
                                const fileExtension = qc.fileUrl ? qc.fileUrl.split('.').pop().split('?')[0] : '';
                                let filename = qc.fileName || 'qc-file';
                                if (fileExtension && !filename.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)) {
                                  filename = `${filename}.${fileExtension}`;
                                }
                                handleDownloadFile(url, filename);
                              }} className="text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-slate-500" /> Download File
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  case 'dispatch': {
                    const list = detailsData?.dispatches || [];
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Truck className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No dispatch logs found.</p>
                          <p className="text-xs text-slate-400 mt-1">Truck loading parameters and manifest logs will display here once dispatched.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-6">
                        {list.map((disp: any) => (
                          <div key={disp._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Supplier</span>
                                <span className="text-xs font-bold text-slate-800">{disp.supplierName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Weight</span>
                                <span className="text-xs font-bold text-slate-800">{disp.orderWeight} kg</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Charges</span>
                                <span className="text-xs font-bold text-slate-800">₹ {disp.shippingCharges}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Total Value</span>
                                <span className="text-xs font-bold text-emerald-600">₹ {disp.orderValue}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Tracking ID</span>
                                <span className="text-sm font-mono font-bold text-slate-700 bg-white border border-slate-200/50 rounded-lg py-1 px-3 inline-block">
                                  {disp.trackingId}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Dispatch Date</span>
                                <span className="text-xs font-bold text-slate-650 flex items-center gap-1 mt-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {formatDateReadable(disp.dispatchDate || disp.updatedAt)}
                                </span>
                              </div>
                            </div>

                            {disp.image && (
                              <div className="space-y-2 pt-2">
                                <h5 className="text-xs font-bold text-slate-500">Dispatch Bill File</h5>
                                <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-transform cursor-pointer relative group flex justify-center" onClick={() => window.open(getImageUrl(disp.image), '_blank')}>
                                  <img src={getImageUrl(disp.image)} alt="Dispatch Bill" className="w-full max-h-72 object-contain p-3" />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <span className="text-xs text-white font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1">
                                      <ExternalLink className="w-3 h-3" /> Open Dispatch Bill
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  default:
                    return <p className="text-xs text-slate-450">Details unavailable.</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Video Modal Lightbox */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveVideoUrl(null)}>
          <div className="relative w-full max-w-4xl px-4 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveVideoUrl(null)}
              className="absolute top-[-50px] right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-lg"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-video flex items-center justify-center">
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
