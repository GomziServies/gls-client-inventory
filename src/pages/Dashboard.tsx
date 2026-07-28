import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, Clock, CheckCircle2, RefreshCw, Layers,
  Package, MapPin, AlertCircle, Activity,
  FlaskConical, Palette, Factory, ShieldCheck, Truck, Check, Play,
  ChevronLeft, ChevronRight, Eye, X, ExternalLink, Download, FileText, Slash, Calendar,
  ShoppingBag
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { BASE_API_URL } from "../config";

import "./Dashboard.css";

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

const formatDateReadable = (dateStr: any) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

const getImageUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return `https://files.fggroup.in/${cleanPath}`;
};

const getMediaArray = (item: any, possibleKeys: string[]): string[] => {
  if (!item) return [];
  for (const key of possibleKeys) {
    const val = item[key];
    if (!val) continue;
    if (Array.isArray(val)) {
      return val
        .map((v: any) => (typeof v === 'string' ? v : v?.url || v?.path || v?.fileUrl || ''))
        .filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
      const str = val.trim();
      if (str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            return parsed
              .map((v: any) => (typeof v === 'string' ? v : v?.url || v?.path || v?.fileUrl || ''))
              .filter(Boolean);
          }
        } catch {
          // ignore json parse error
        }
      }
      if (str.includes(',')) {
        return str.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [str];
    }
  }
  return [];
};

const getApiBaseUrl = () => {
  if (import.meta.env.PROD) return "/public/v1";
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:89/public/v1`;
};

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
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [activeFormulationTab, setActiveFormulationTab] = useState<number>(0);
  const [activeProductionTab, setActiveProductionTab] = useState<number>(0);
  const [activeLabReportTab, setActiveLabReportTab] = useState<number>(0);

  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedDetailStep || showInvoiceModal || activeVideoUrl || activeImageUrl);
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [selectedDetailStep, showInvoiceModal, activeVideoUrl, activeImageUrl]);

  const handleDownloadInvoice = () => {
    if (!selectedClient?._id) return;
    try {
      const baseApiUrl = getApiBaseUrl();

      const downloadUrl = `${baseApiUrl}/gn-clients/download-invoice?clientId=${selectedClient._id}`;
      const filename = `Invoice-${selectedClient.invoice_number || selectedClient.common_id.slice(-6)}.pdf`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading invoice:", error);
    }
  };

  const handleViewInvoice = () => {
    if (!selectedClient?._id) return;
    try {
      const baseApiUrl = getApiBaseUrl();

      const viewUrl = `${baseApiUrl}/gn-clients/download-invoice?clientId=${selectedClient._id}&view=true`;
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error("Error viewing invoice:", error);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formulationTabScrollRef = useRef<HTMLDivElement>(null);
  const productionTabScrollRef = useRef<HTMLDivElement>(null);
  const labReportTabScrollRef = useRef<HTMLDivElement>(null);

  const selectOrder = (idx: number) => {
    setSelectedIdx(idx);
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 5) {
        isProgrammaticScrollRef.current = true;
        const firstCard = container.firstElementChild as HTMLElement;
        const cardWidth = firstCard?.clientWidth || container.clientWidth;
        const gap = 16;
        container.scrollTo({
          left: idx * (cardWidth + gap),
          behavior: "smooth"
        });
        if (programmaticScrollTimeoutRef.current) {
          clearTimeout(programmaticScrollTimeoutRef.current);
        }
        programmaticScrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
    }
  };

  const handleScrollOrders = () => {
    if (!scrollContainerRef.current || clients.length === 0) return;
    if (isProgrammaticScrollRef.current) return;

    const container = scrollContainerRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 5) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (isProgrammaticScrollRef.current) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const firstCard = container.firstElementChild as HTMLElement;
      const cardWidth = firstCard?.clientWidth || 300;
      const gap = 16;
      const totalStep = cardWidth + gap;

      // Loop wrap-around ONLY when user manually swipes past the end/start
      if (maxScroll > 0 && scrollLeft >= maxScroll + 25) {
        container.scrollTo({ left: 0, behavior: "smooth" });
        setSelectedIdx(0);
        return;
      }
      if (maxScroll > 0 && scrollLeft <= -25) {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
        setSelectedIdx(clients.length - 1);
        return;
      }

      const calcIdx = Math.min(
        clients.length - 1,
        Math.max(0, Math.round(scrollLeft / totalStep))
      );

      if (calcIdx !== selectedIdx) {
        setSelectedIdx(calcIdx);
      }
    }, 40);
  };

  const isProgrammaticTabScrollRef = useRef<boolean>(false);
  const programmaticTabScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabScroll = (
    container: HTMLDivElement | null,
    totalItems: number,
    setActiveTab: (idx: number) => void
  ) => {
    if (!container || totalItems <= 0 || isProgrammaticTabScrollRef.current) return;

    if (tabScrollTimeoutRef.current) {
      clearTimeout(tabScrollTimeoutRef.current);
    }

    tabScrollTimeoutRef.current = setTimeout(() => {
      if (!container || isProgrammaticTabScrollRef.current) return;
      const scrollLeft = container.scrollLeft;
      const firstChild = container.firstElementChild as HTMLElement;
      if (!firstChild) return;
      const itemWidth = firstChild.clientWidth || 120;
      const gap = 8;
      const totalStep = itemWidth + gap;

      const calcIdx = Math.min(
        totalItems - 1,
        Math.max(0, Math.round(scrollLeft / totalStep))
      );

      setActiveTab(calcIdx);
    }, 50);
  };

  const selectFormulationTab = (idx: number, totalItems: number) => {
    if (totalItems <= 0) return;
    const nextIdx = (idx + totalItems) % totalItems;

    isProgrammaticTabScrollRef.current = true;
    setActiveFormulationTab(nextIdx);

    if (programmaticTabScrollTimeoutRef.current) {
      clearTimeout(programmaticTabScrollTimeoutRef.current);
    }
    programmaticTabScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticTabScrollRef.current = false;
    }, 600);

    if (formulationTabScrollRef.current) {
      const container = formulationTabScrollRef.current;
      const tabElement = container.children[nextIdx] as HTMLElement;
      if (tabElement) {
        const containerWidth = container.clientWidth;
        const tabOffset = tabElement.offsetLeft;
        const tabWidth = tabElement.clientWidth;
        container.scrollTo({
          left: tabOffset - containerWidth / 2 + tabWidth / 2,
          behavior: "smooth"
        });
      }
    }
  };

  const selectProductionTab = (idx: number, totalItems: number) => {
    if (totalItems <= 0) return;
    const nextIdx = (idx + totalItems) % totalItems;

    isProgrammaticTabScrollRef.current = true;
    setActiveProductionTab(nextIdx);

    if (programmaticTabScrollTimeoutRef.current) {
      clearTimeout(programmaticTabScrollTimeoutRef.current);
    }
    programmaticTabScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticTabScrollRef.current = false;
    }, 600);

    if (productionTabScrollRef.current) {
      const container = productionTabScrollRef.current;
      const tabElement = container.children[nextIdx] as HTMLElement;
      if (tabElement) {
        const containerWidth = container.clientWidth;
        const tabOffset = tabElement.offsetLeft;
        const tabWidth = tabElement.clientWidth;
        container.scrollTo({
          left: tabOffset - containerWidth / 2 + tabWidth / 2,
          behavior: "smooth"
        });
      }
    }
  };

  const selectLabReportTab = (idx: number, totalItems: number) => {
    if (totalItems <= 0) return;
    const nextIdx = (idx + totalItems) % totalItems;

    isProgrammaticTabScrollRef.current = true;
    setActiveLabReportTab(nextIdx);

    if (programmaticTabScrollTimeoutRef.current) {
      clearTimeout(programmaticTabScrollTimeoutRef.current);
    }
    programmaticTabScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticTabScrollRef.current = false;
    }, 600);

    if (labReportTabScrollRef.current) {
      const container = labReportTabScrollRef.current;
      const tabElement = container.children[nextIdx] as HTMLElement;
      if (tabElement) {
        const containerWidth = container.clientWidth;
        const tabOffset = tabElement.offsetLeft;
        const tabWidth = tabElement.clientWidth;
        container.scrollTo({
          left: tabOffset - containerWidth / 2 + tabWidth / 2,
          behavior: "smooth"
        });
      }
    }
  };

  const handleDownloadFile = (url: string, filename: string) => {
    try {
      const baseApiUrl = getApiBaseUrl();

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
      const baseApiUrl = getApiBaseUrl();

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
      const baseApiUrl = getApiBaseUrl();

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

  useEffect(() => {
    setActiveFormulationTab(0);
    setActiveProductionTab(0);
    setActiveLabReportTab(0);
  }, [selectedDetailStep]);

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
      const baseApiUrl = getApiBaseUrl();

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
      const baseApiUrl = getApiBaseUrl();

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
      return { text: "Dispatched", color: "bg-emerald-50 text-emerald-700 border-emerald-200/60", stepIndex: 7 };
    }
    if (process.qc?.status === "done") {
      return { text: "Packaging / Ready", color: "bg-blue-50 text-blue-700 border-blue-200/60", stepIndex: 6 };
    }
    if (process.lab_report?.status === "done" || process.lab_report?.status === "skipped") {
      return { text: "Quality Check Stage", color: "bg-purple-50 text-purple-700 border-purple-200/60", stepIndex: 5 };
    }
    if (process.production?.status === "done") {
      return { text: "Laboratory Testing", color: "bg-amber-50 text-amber-700 border-amber-200/60", stepIndex: 4 };
    }
    if (process.procurement?.status === "done") {
      return { text: "Active Production", color: "bg-indigo-50 text-indigo-700 border-indigo-200/60", stepIndex: 3 };
    }
    if (process.label_sticker?.status === "done" || process.label_sticker?.status === "skipped") {
      return { text: "Material Sourcing", color: "bg-cyan-50 text-cyan-700 border-cyan-200/60", stepIndex: 2 };
    }
    if (process.formulation?.status === "done") {
      return { text: "Label & Artboard Design", color: "bg-orange-50 text-orange-700 border-orange-200/60", stepIndex: 1 };
    }

    return { text: "Formulating Supplement", color: "bg-slate-50 text-slate-600 border-slate-200/60", stepIndex: 0 };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getValidProductName = (item: any, idx?: number, defaultFallback?: string) => {
    let candidate = '';
    const invalidNames = ['N/A', 'PRODUCT ITEM', 'UNKNOWN PRODUCT', 'PRODUCT', 'ITEM'];

    if (typeof item === 'string') {
      candidate = item;
    } else if (item && typeof item === 'object') {
      const prodItemId = typeof item.production_itemId === 'object' && item.production_itemId !== null
        ? item.production_itemId._id || item.production_itemId.id
        : item.production_itemId || item.item_id || item.itemId || item.product_id;

      if (prodItemId && selectedClient?.items) {
        const matched = selectedClient.items.find((i: any) => String(i._id) === String(prodItemId) || String(i.item_name) === String(prodItemId));
        if (matched?.item_name && matched.item_name.trim() !== '' && !invalidNames.includes(matched.item_name.trim().toUpperCase())) {
          return matched.item_name.trim();
        }
      }

      candidate = typeof item.production_itemId === 'object' && item.production_itemId?.item_name
        ? item.production_itemId.item_name
        : item.productName || item.product_name || item.item_name || item.production_name || item.title || '';
    }

    if (candidate && typeof candidate === 'string' && candidate.trim() !== '' && !invalidNames.includes(candidate.trim().toUpperCase())) {
      return candidate.trim();
    }

    if (idx !== undefined && selectedClient?.items?.[idx]?.item_name && !invalidNames.includes(selectedClient.items[idx].item_name.trim().toUpperCase())) {
      return selectedClient.items[idx].item_name.trim();
    }

    if (selectedClient?.items?.length === 1 && selectedClient.items[0]?.item_name && !invalidNames.includes(selectedClient.items[0].item_name.trim().toUpperCase())) {
      return selectedClient.items[0].item_name.trim();
    }

    if (selectedClient?.items?.[0]?.item_name && !invalidNames.includes(selectedClient.items[0].item_name.trim().toUpperCase())) {
      return selectedClient.items[0].item_name.trim();
    }

    if (defaultFallback && !invalidNames.includes(defaultFallback.trim().toUpperCase())) {
      return defaultFallback.trim();
    }

    return 'Product Details';
  };

  if (loading) {
    return (
      <main className="sales-portal-main">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#f2f9eb] border-t-[#99c229] animate-spin" />
          <p className="text-[#7e8299] text-sm font-medium tracking-wide">Loading live tracking details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="sales-portal-main">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4 p-6 bg-white rounded-2xl border border-[#ebebeb] shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#404040]">Sync Connection Error</h2>
          <p className="text-xs text-[#7e8299]">{error}</p>
          <Button onClick={() => fetchClientData()} className="btn-target-brand mt-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        </div>
      </main>
    );
  }

  if (clients.length === 0) {
    return (
      <main className="sales-portal-main">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4 p-8 bg-white rounded-2xl border border-[#ebebeb] shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#f5f5f5] text-[#7e8299] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#404040]">No Active Orders Found</h2>
          <p className="text-xs text-[#7e8299]">
            We couldn't find any registered invoices linked to mobile number:
            <strong className="text-[#404040] block mt-1.5 font-mono text-sm">
              +91 {mobileNumber}
            </strong>
          </p>
          <Button onClick={() => fetchClientData(true)} variant="outline" className="mt-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Check Again
          </Button>
        </div>
      </main>
    );
  }

  const selectedClient = clients[selectedIdx];
  const overallStatus = getOverallStatus(selectedClient);

  const steps = [
    {
      title: "1. Formulation Phase",
      description: "Finalizing supplement formulation, nutrition facts table, and regulatory clearance.",
      stepKey: "formulation",
      icon: FlaskConical,
      data: selectedClient.production_process?.formulation,
    },
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

  const completedCount = steps.filter(s => s.data?.status === "done").length;
  const skippedCount = steps.filter(s => s.data?.status === "skipped").length;
  const totalCompletedSteps = completedCount + skippedCount;
  const currentStageNum = totalCompletedSteps === 7 ? 7 : Math.min(7, totalCompletedSteps + 1);
  const remainingCount = steps.length - totalCompletedSteps;
  const progressPercent = Math.round((totalCompletedSteps / steps.length) * 100);

  // Circular progress SVG constants
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <main className="sales-portal-main bg-[#f8faf6]">
      <div className="space-y-4 sm:space-y-6">

        {/* Desktop View: Top Stat Banner */}
        <div className="hidden md:grid bg-white rounded-2xl border-y-2 border-x border-[#c4e092] border-x-slate-200/80 shadow-xs py-8 px-6 md:px-8 grid-cols-3 divide-x divide-slate-200 min-h-[140px] items-center">
          
          {/* Metric 1: TOTAL ITEMS */}
          <div className="flex items-center gap-5 md:pr-8">
            <div className="w-14 h-14 rounded-2xl bg-[#f0f7e6] text-[#83ab1f] flex items-center justify-center border-2 border-[#d2e8aa] shrink-0 shadow-xs">
              <FileText className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                TOTAL ITEMS
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight my-0.5">
                {selectedClient?.items?.length || 0}
              </div>
              <div className="text-xs font-semibold text-[#83ab1f] mt-1 truncate">
                Invoice #{selectedClient?.invoice_number || selectedClient?.common_id?.slice(-6)}
              </div>
            </div>
          </div>

          {/* Metric 2: CURRENT STAGE */}
          <div className="flex items-center gap-5 md:px-8">
            <div className="w-14 h-14 rounded-2xl bg-[#fff8e6] text-[#e05638] flex items-center justify-center border-2 border-[#fde68a] shrink-0 shadow-xs">
              <Clock className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                CURRENT STAGE
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight my-0.5">
                {currentStageNum}
              </div>
              <div className="text-xs font-semibold text-[#e05638] mt-1 truncate">
                {overallStatus.text}
              </div>
            </div>
          </div>

          {/* Metric 3: COMPLETED STAGES */}
          <div className="flex items-center gap-5 md:pl-8">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f9ee] text-[#20b657] flex items-center justify-center border-2 border-[#bbf0cb] shrink-0 shadow-xs">
              <CheckCircle2 className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                COMPLETED STAGES
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight my-0.5">
                {totalCompletedSteps}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#20b657] mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{progressPercent}% Completed</span>
              </div>
            </div>
          </div>

        </div>

        {/* YOUR ACTIVE INVOICE ORDERS Pills Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              YOUR ACTIVE INVOICE ORDERS
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            onScroll={handleScrollOrders}
            className="flex items-center gap-4 overflow-x-auto py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth w-full snap-x snap-mandatory"
          >
            {clients.map((client, idx) => {
              const isSelected = idx === selectedIdx;
              const overall = getOverallStatus(client);
              return (
                <React.Fragment key={client._id}>
                  <div
                    onClick={() => selectOrder(idx)}
                    className={`flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 shrink-0 min-w-full sm:min-w-0 w-full sm:w-[calc(50%-0.4375rem)] lg:w-[calc(33.333%-0.583rem)] snap-start [scroll-snap-stop:always] border ${
                      isSelected 
                        ? "bg-white border-[#789d1b] shadow-md ring-2 ring-[#789d1b]/20" 
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center shrink-0 border border-[#d2e8aa]">
                        <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {client.items && client.items.length > 0
                            ? client.items.map(i => i.item_name).join(', ')
                            : `Invoice #${client.invoice_number || client.common_id.slice(-6)}`}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                          Invoice #{client.invoice_number || client.common_id.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 sm:px-3 py-1.5 rounded-lg uppercase tracking-wide shrink-0 ${
                      isSelected ? "bg-[#f0f7e6] text-[#789d1b] border border-[#d2e8aa]" : "bg-slate-100 text-slate-500"
                    }`}>
                      {overall.text}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Pagination Dots Indicator for All Devices */}
          {clients.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1 pb-0.5">
              {clients.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectOrder(idx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer border-0 ${
                    idx === selectedIdx
                      ? "w-6 h-2 bg-[#83ab1f] shadow-xs"
                      : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`Go to order #${idx + 1}`}
                  aria-label={`Go to order #${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Main Grid: Left 8 Columns (Progress & Stepper), Right 4 Columns (Recipe, Shipping, Links, Support) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Side Main Card (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* PRODUCTION PROGRESS Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center border border-[#d2e8aa] shrink-0">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      PRODUCTION PROGRESS
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                      Invoice #{selectedClient.invoice_number || selectedClient.common_id.slice(-6)} · {selectedClient.items?.map(i => i.item_name).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 sm:pt-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    View Invoice
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-white bg-[#83ab1f] border border-[#83ab1f] rounded-xl hover:bg-[#74991b] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Invoice
                  </button>
                </div>
              </div>

              {/* Workflow Details Strip */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs items-center">
                <div className="hidden sm:block min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">WORKFLOW NAME</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 truncate" title="Supplement Manufacturing">
                    Supplement Manufacturing
                  </div>
                </div>
                <div className="min-w-0 sm:text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">CREATED ON</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">{formatDate(selectedClient.createdAt)}</div>
                </div>
                <div className="min-w-0 flex flex-col items-start sm:items-end text-left sm:text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate w-full">CURRENT STATUS</div>
                  <div className="mt-0.5">
                    <span className="inline-block px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md uppercase bg-[#f0f7e6] text-[#789d1b] border border-[#d2e8aa] truncate max-w-full">
                      {overallStatus.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Ring & Timeline Grid */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Left: Circular Progress Ring */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center justify-center p-3 border-b md:border-b-0 md:border-r border-slate-100">
                  <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
                    PROGRESS OVERVIEW
                  </div>
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle
                        stroke="#f1f5f9"
                        fill="transparent"
                        strokeWidth="8"
                        r="42"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        stroke="#83ab1f"
                        fill="transparent"
                        strokeWidth="8"
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        r={radius}
                        cx="50"
                        cy="50"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-black text-slate-900">{progressPercent}%</span>
                      <span className="text-[9px] font-extrabold text-[#789d1b] uppercase tracking-wider">ACHIEVED</span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="w-full mt-3 space-y-1 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        Total Steps
                      </span>
                      <span className="font-bold text-slate-900">7 Steps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#83ab1f]" />
                        Completed
                      </span>
                      <span className="font-bold text-[#83ab1f]">{completedCount} Steps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Skipped
                      </span>
                      <span className="font-bold text-amber-600">{skippedCount} Step</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                        Remaining
                      </span>
                      <span className="font-bold text-slate-400">{remainingCount} Steps</span>
                    </div>
                  </div>
                </div>

                {/* Right: Node Stepper Timeline showing all steps */}
                <div className="md:col-span-8 lg:col-span-9 space-y-4 min-w-0 pt-2 md:pt-0">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      PRODUCTION TIMELINE
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Track your production journey
                    </p>
                  </div>

                  {/* Mobile View: Connected Vertical Timeline Stepper */}
                  <div className="block sm:hidden relative pl-1.5 pr-0.5 py-1 space-y-3">
                    {steps.map((step, idx) => {
                      const stepData = step.data;
                      const isDone = stepData?.status === "done";
                      const isSkipped = stepData?.status === "skipped";
                      const isPending = !stepData || stepData?.status === "pending";
                      
                      const isPreviousStepsDone = steps.slice(0, idx).every(s => s.data?.status === "done" || s.data?.status === "skipped");
                      const isActive = isPending && isPreviousStepsDone;

                      const cleanTitle = step.title
                        .replace(/^\d+\.\s*/, "")
                        .replace(" Phase", "");

                      const isLast = idx === steps.length - 1;

                      return (
                        <div 
                          key={idx} 
                          onClick={() => step.stepKey !== 'procurement' && setSelectedDetailStep(step.stepKey)}
                          className="relative flex items-start gap-3.5 group cursor-pointer"
                        >
                          {/* Vertical Connecting Line */}
                          {!isLast && (
                            <div 
                              className={`absolute left-[17px] top-[34px] bottom-[-14px] w-[2px] ${
                                isDone ? "bg-[#83ab1f]" : "bg-slate-200"
                              }`} 
                            />
                          )}

                          {/* Step Badge Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 z-10 transition-all shadow-2xs ${
                            isDone 
                              ? "bg-[#83ab1f] text-white ring-2 ring-[#83ab1f]/20" 
                              : isActive 
                              ? "bg-[#83ab1f] text-white ring-4 ring-[#83ab1f]/25 animate-pulse" 
                              : isSkipped 
                              ? "bg-amber-500 text-white ring-2 ring-amber-500/20" 
                              : "bg-white text-slate-400 border-2 border-slate-200"
                          }`}>
                            {isDone ? <Check className="w-4.5 h-4.5 stroke-[3]" /> : idx + 1}
                          </div>

                          {/* Step Info Card */}
                          <div className={`flex-1 min-w-0 p-3.5 rounded-2xl border transition-all ${
                            isActive
                              ? "bg-[#f8faf4] border-[#83ab1f]/60 shadow-xs ring-1 ring-[#83ab1f]/20"
                              : isDone
                              ? "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                              : isSkipped
                              ? "bg-amber-50/40 border-amber-200/80 shadow-2xs"
                              : "bg-slate-50/40 border-slate-150 opacity-90"
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-black text-slate-900 truncate">
                                {cleanTitle}
                              </h5>

                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border ${
                                isDone ? "bg-[#f0f7e6] text-[#789d1b] border-[#d2e8aa]" :
                                isActive ? "bg-[#83ab1f] text-white border-[#83ab1f]" :
                                isSkipped ? "bg-amber-100 text-amber-700 border-amber-200" :
                                "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {isDone ? "Done" : isActive ? "Active" : isSkipped ? "Skipped" : "Pending"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80 text-[10px]">
                              {stepData?.completed_date ? (
                                <span className="text-slate-500 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-[#83ab1f]" />
                                  {formatDateReadable(stepData.completed_date)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">
                                  {isActive ? "Currently in process" : "Pending step"}
                                </span>
                              )}

                              {step.stepKey !== 'procurement' && (
                                <span className="text-[10px] font-bold text-[#83ab1f] flex items-center gap-0.5">
                                  Details <ChevronRight className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Horizontal Node Stepper Timeline */}
                  <div className="hidden sm:block w-full overflow-x-auto pt-2 pb-3 no-scrollbar">
                    <div className="w-full flex items-start justify-between relative px-2">
                      
                      {steps.map((step, idx) => {
                        const stepData = step.data;
                        const isDone = stepData?.status === "done";
                        const isSkipped = stepData?.status === "skipped";
                        const isPending = !stepData || stepData?.status === "pending";
                        
                        const isPreviousStepsDone = steps.slice(0, idx).every(s => s.data?.status === "done" || s.data?.status === "skipped");
                        const isActive = isPending && isPreviousStepsDone;

                        const formattedTitle = step.title
                          .replace(" Phase", "")
                          .replace("Laboratory Testing", "Lab Testing")
                          .replace("Raw Material Procurement", "Procurement")
                          .replace("Quality Control (QC)", "QC Stage")
                          .replace("Shipping & Dispatch", "Dispatch");

                        return (
                          <div
                            key={idx}
                            onClick={() => step.stepKey !== 'procurement' && setSelectedDetailStep(step.stepKey)}
                            className="flex-1 flex flex-col items-center text-center cursor-pointer group relative px-1 shrink-0 sm:shrink"
                          >
                            {/* Horizontal Connecting Line between nodes */}
                            {idx < steps.length - 1 && (
                              <div
                                className={`absolute top-[16px] left-[50%] w-full h-[2.5px] z-0 transition-colors ${
                                  isDone ? "bg-[#83ab1f]" : "bg-slate-200"
                                }`}
                              />
                            )}

                            {/* Node Circle */}
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-110 ${
                              isDone 
                                ? "bg-[#83ab1f] text-white border-2 border-[#83ab1f] ring-4 ring-[#83ab1f]/15" 
                                : isActive 
                                ? "bg-[#83ab1f] text-white border-2 border-[#83ab1f] ring-4 ring-[#83ab1f]/30 ring-offset-1" 
                                : isSkipped 
                                ? "bg-amber-500 text-white border-2 border-amber-500" 
                                : "bg-white text-slate-600 border-2 border-slate-200"
                            }`}>
                              {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                            </div>

                            {/* Step Title */}
                            <div className="text-[10px] sm:text-[10.5px] font-bold text-slate-800 mt-2 leading-tight group-hover:text-[#83ab1f] transition-colors max-w-[80px] sm:max-w-[72px]">
                              {formattedTitle}
                            </div>

                            {/* Step Status Subtitle */}
                            <div className="text-[9.5px] font-semibold mt-1">
                              {isDone ? (
                                <span className="text-[#83ab1f]">Completed</span>
                              ) : isActive ? (
                                <span className="text-[#83ab1f] font-extrabold">Active Stage</span>
                              ) : isSkipped ? (
                                <span className="text-amber-600">Skipped</span>
                              ) : (
                                <span className="text-slate-400">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* DELIVERY LOCATION */}
            {selectedClient.billing_address && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs relative overflow-hidden">
                {/* Top Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center border border-[#d2e8aa] shrink-0">
                    <MapPin className="w-4.5 h-4.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">DELIVERY LOCATION</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Registered shipping address</p>
                  </div>
                </div>

                {/* Address Card Container */}
                <div className="bg-[#f6fbf0] border border-[#e1f0cc] rounded-2xl p-4 sm:p-5 space-y-1 shadow-2xs w-full">
                  {selectedClient.billing_address.address_line_1 && (
                    <div className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      {selectedClient.billing_address.address_line_1}
                    </div>
                  )}
                  {(selectedClient.billing_address.city || selectedClient.billing_address.state) && (
                    <div className="text-xs sm:text-sm font-semibold text-slate-500">
                      {[selectedClient.billing_address.city, selectedClient.billing_address.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {selectedClient.billing_address.pin_code && (
                    <div className="text-xs sm:text-sm font-semibold text-slate-500">
                      Pin Code: {selectedClient.billing_address.pin_code}
                    </div>
                  )}
                  <div className="text-xs sm:text-sm font-black text-[#789d1b] pt-1">
                    {selectedClient.billing_address.country || "India"}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Side Cards Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* ORDER BLEND RECIPE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f0f7e6] text-[#789d1b] flex items-center justify-center border border-[#d2e8aa] shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">ORDER BLEND RECIPE</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Formulated supplement items</p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedClient.items && selectedClient.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-100 rounded-2xl hover:border-[#d2e8aa] transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {item.item_name ? item.item_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
                      </div>
                      {item.item_weight && (
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Weight: <span className="font-semibold text-slate-600">{item.item_weight} {item.item_weight_type || ""}</span>
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#f0f7e6] text-[#789d1b] border border-[#d2e8aa] text-[11px] font-bold">
                      {item.quantity || 1} Unit
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile View: 3 Executive Styled Stat Cards */}
            <div className="grid md:hidden grid-cols-1 gap-3">
              {/* Card 1: TOTAL ITEMS */}
              <div className="bg-gradient-to-r from-[#f7fcf0] via-white to-white rounded-2xl p-4 border border-[#d6eaaf] shadow-xs flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#f0f7e6] text-[#83ab1f] flex items-center justify-center border border-[#d2e8aa] shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      TOTAL ITEMS
                    </div>
                    <div className="text-xs font-semibold text-[#789d1b] mt-0.5 truncate">
                      Invoice #{selectedClient?.invoice_number || selectedClient?.common_id?.slice(-6)}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-800 shrink-0 ml-3 bg-white px-3.5 py-1 rounded-xl border border-slate-100 shadow-2xs">
                  {selectedClient?.items?.length || 0}
                </div>
              </div>

              {/* Card 2: CURRENT STAGE */}
              <div className="bg-gradient-to-r from-[#fff9f5] via-white to-white rounded-2xl p-4 border border-[#fde4cf] shadow-xs flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#fff4e8] text-[#e05638] flex items-center justify-center border border-[#fcd5b5] shrink-0 shadow-2xs">
                    <Clock className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      CURRENT STAGE
                    </div>
                    <div className="text-xs font-semibold text-[#e05638] mt-0.5 truncate">
                      {overallStatus.text}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-800 shrink-0 ml-3 bg-white px-3.5 py-1 rounded-xl border border-slate-100 shadow-2xs">
                  {currentStageNum}
                </div>
              </div>

              {/* Card 3: COMPLETED STAGES */}
              <div className="bg-gradient-to-r from-[#f0fdf4] via-white to-white rounded-2xl p-4 border border-[#bbf7d0] shadow-xs flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#e8f9ee] text-[#20b657] flex items-center justify-center border border-[#bbf0cb] shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      COMPLETED STAGES
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#20b657] mt-0.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{progressPercent}% Completed</span>
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-800 shrink-0 ml-3 bg-white px-3.5 py-1 rounded-xl border border-slate-100 shadow-2xs">
                  {totalCompletedSteps}
                </div>
              </div>
            </div>

            {/* QUICK LINKS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-3">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                QUICK LINKS
              </div>
              
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedDetailStep("production")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Production Details
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDetailStep("lab_report")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Lab Testing
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDetailStep("client_label")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Labels
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDetailStep("formulation")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" /> Formulation
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Read-Only Phase Details Modal */}
      {selectedDetailStep && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 max-w-4xl w-full max-h-[85dvh] sm:max-h-[85vh] m-auto shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-3.5 py-3 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40 shrink-0 gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 truncate">
                  <span className="p-1 sm:p-1.5 rounded-lg bg-[#f2f9eb] text-[#99c229] border border-[#ddf0af] shrink-0">
                    {(() => {
                      const step = steps.find(s => s.stepKey === selectedDetailStep);
                      if (step) {
                        const Icon = step.icon;
                        return <Icon className="w-4 h-4" />;
                      }
                      return <Package className="w-4 h-4" />;
                    })()}
                  </span>
                  <span className="truncate">{steps.find(s => s.stepKey === selectedDetailStep)?.title || "Stage Details"}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                  {steps.find(s => s.stepKey === selectedDetailStep)?.description}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailStep(null)}
                className="p-1.5 rounded-xl border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 bg-white transition-all shadow-sm shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-6 md:p-8 flex-1 overflow-y-auto min-h-0 [overscroll-behavior:contain] [webkit-overflow-scrolling:touch]">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#f2f9eb] border-t-[#99c229] animate-spin" />
                  <p className="text-slate-500 text-xs font-semibold tracking-wide">Retrieving phase records...</p>
                </div>
              ) : (() => {
                const formatModalDateReadable = (dateStr?: string) => {
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
                    const currentTab = activeFormulationTab >= list.length ? 0 : activeFormulationTab;
                    const currentForm = list[currentTab] || list[0];

                    return (
                      <div className="space-y-6">
                        {/* Product Tabs Navigation for Multiple Formulations */}
                        {list.length > 1 && (
                          <div className="flex items-center gap-2">                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectFormulationTab(currentTab - 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <div
                              ref={formulationTabScrollRef}
                              onScroll={() => handleTabScroll(formulationTabScrollRef.current, list.length, setActiveFormulationTab)}
                              className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth border border-slate-200/80 shadow-2xs flex-1 snap-x snap-mandatory min-w-0"
                            >
                              {list.map((form: any, idx: number) => {
                                const isActive = idx === currentTab;
                                return (
                                  <button
                                    key={form._id || idx}
                                    type="button"
                                    onClick={() => selectFormulationTab(idx, list.length)}
                                    className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer w-full sm:w-[calc(33.333%-0.375rem)] lg:w-[calc(25%-0.375rem)] snap-center sm:snap-start truncate ${
                                      isActive
                                        ? "bg-white text-[#7aa823] shadow-sm border border-[#ddf0af] ring-2 ring-[#7aa823]/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
                                    }`}
                                  >
                                    <FlaskConical className={`w-4 h-4 shrink-0 ${isActive ? "text-[#7aa823]" : "text-slate-400"}`} />
                                    <span className="truncate">{getValidProductName(form, idx)}</span>
                                    {form.scoopSize && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                                        isActive ? "bg-[#f2f9eb] text-[#7aa823] border border-[#ddf0af]" : "bg-slate-200/70 text-slate-500"
                                      }`}>
                                        {form.scoopSize}g
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectFormulationTab(currentTab + 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Selected Formulation Card */}
                        <div key={currentForm._id} className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{getValidProductName(currentForm, currentTab || 0)}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">Updated: {formatModalDateReadable(currentForm.updatedAt)}</p>
                            </div>
                            <span className="px-3 py-1 bg-[#f2f9eb] text-[#7aa823] font-bold text-xs rounded-full border border-[#ddf0af]">
                              Scoop Size: {currentForm.scoopSize} gm
                            </span>
                          </div>

                          {/* Nutrients Table */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Formulation Specifications</h5>
                            <div className="border border-slate-150/70 rounded-xl overflow-hidden w-full bg-white shadow-sm">
                              <table className="w-full text-left text-[11px] sm:text-xs border-collapse table-fixed">
                                <thead>
                                  <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500">
                                    <th className="py-2.5 px-2 sm:px-3 font-bold uppercase tracking-wider w-[36%] sm:w-[40%]">Nutrients</th>
                                    <th className="py-2.5 px-1.5 sm:px-3 font-bold text-center w-[22%] sm:w-[20%]">Per {currentForm.scoopSize || 35}g scoop</th>
                                    <th className="py-2.5 px-1.5 sm:px-3 font-bold text-center w-[22%] sm:w-[20%]">Per 100g</th>
                                    <th className="py-2.5 px-1.5 sm:px-3 font-bold text-center w-[20%] sm:w-[20%]">% RDA</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {(currentForm.nutritionItems || []).map((nut: any, idx: number) => {
                                    const v = (nut.rda || '').toString().trim();
                                    const rdaStr = !v ? '-' : v.includes('%') ? v : `${v}%`;
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/30">
                                        <td className="py-2.5 px-2 sm:px-3 text-slate-800 font-bold break-words">{nut.itemName}</td>
                                        <td className="py-2.5 px-1.5 sm:px-3 text-slate-650 text-center whitespace-nowrap">{nut.weight35gm ?? '-'}</td>
                                        <td className="py-2.5 px-1.5 sm:px-3 text-slate-650 text-center whitespace-nowrap">{nut.weight100gm ?? '-'}</td>
                                        <td className="py-2.5 px-1.5 sm:px-3 text-slate-700 font-semibold text-center whitespace-nowrap">{rdaStr}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Amino Acids Profile */}
                          {currentForm.aminoAcidProfile && currentForm.aminoAcidProfile.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amino Acid Profile</h5>
                              <div className="border border-slate-150/70 rounded-xl overflow-hidden w-full bg-white shadow-sm">
                                <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {currentForm.aminoAcidProfile.map((cat: any) => (
                                      <React.Fragment key={cat._id}>
                                        <tr className="bg-slate-50/70">
                                          <td className="py-2.5 px-3 sm:px-3.5 font-bold text-slate-800" colSpan={2}>
                                            <div className="flex justify-between items-center">
                                              <span>{cat.title}</span>
                                              {cat.value && (
                                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 bg-white border border-slate-200/60 rounded px-2 py-0.5">
                                                  {cat.value} {cat.unit || ''}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                        {(cat.items || []).map((item: any) => (
                                          <tr key={item._id} className="hover:bg-slate-50/20">
                                            <td className="py-2.5 px-3 sm:px-3.5 pl-4 sm:pl-6 text-slate-600 break-words">{item.name}</td>
                                            <td className="py-2.5 px-3 sm:px-3.5 pr-4 sm:pr-6 text-right font-bold text-slate-700 whitespace-nowrap">{item.value} {item.unit || ''}</td>
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
                                <h4 className="text-sm font-bold text-slate-800">{getValidProductName(design, 0)}</h4>
                                <p className="text-xs text-slate-500 font-medium">Brand: <strong className="text-slate-700 font-bold">{design.brandName}</strong></p>
                              </div>
                              <div className="space-y-1.5 md:text-right">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Status</span>
                                <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full border ${
                                  design.client_approval_status === 'approved' || design.final_approval_by_client
                                    ? "bg-[#e8f9ee] text-[#20b657] border-[#bbf0cb]" 
                                    : design.client_approval_status === 'rejected'
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
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
                                  <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-all cursor-pointer relative group" onClick={() => setActiveImageUrl(getImageUrl(design.label_preview_image))}>
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
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#20b657]" /> Client Confirmation Screenshot
                                  </h5>
                                  <div className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.01] transition-all cursor-pointer relative group" onClick={() => setActiveImageUrl(getImageUrl(design.final_approval_image))}>
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
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#99c229]"
                                        placeholder="e.g. John Doe (Proprietor)"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setApprovingDesignId(null); setApproverName(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelAction(design._id, 'approve')} disabled={submittingAction || !approverName.trim()} className="btn-target-brand">
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
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        placeholder="e.g. Logo alignment is slightly off, spelling of supplement in nutritional facts is incorrect."
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setRejectingDesignId(null); setRejectionReason(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelAction(design._id, 'reject')} disabled={submittingAction || !rejectionReason.trim()} className="bg-red-600 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Submit Rejection"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 justify-end">
                                    <Button 
                                      size="sm" 
                                      onClick={() => setRejectingDesignId(design._id)}
                                      className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold"
                                    >
                                      Reject Design
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => setApprovingDesignId(design._id)}
                                      className="btn-target-brand"
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
                    if (selectedClient.production_process?.client_label?.status === 'skipped') {
                      return (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <Slash className="w-6 h-6 text-slate-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">Label Approval Skipped</p>
                        </div>
                      );
                    }
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
                                  <p className="text-[10px] text-slate-400">Uploaded: {formatModalDateReadable(label.createdAt)}</p>
                                </div>
                              </div>
                              <div className="space-y-1.5 sm:text-right">
                                <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full border ${
                                  label.client_approval_status === 'approved' || label.final_approval_by_client
                                    ? "bg-[#e8f9ee] text-[#20b657] border-[#bbf0cb]" 
                                    : label.client_approval_status === 'rejected'
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
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
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#99c229]"
                                        placeholder="e.g. John Doe (Proprietor)"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setApprovingLabelId(null); setLabelApproverName(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelDocumentAction(label._id, 'approve')} disabled={submittingAction || !labelApproverName.trim()} className="btn-target-brand">
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
                                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        placeholder="e.g. Layout scaling is incorrect, please upload PDF vector."
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => { setRejectingLabelId(null); setLabelRejectionReason(""); }} disabled={submittingAction}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleClientLabelDocumentAction(label._id, 'reject')} disabled={submittingAction || !labelRejectionReason.trim()} className="bg-red-600 text-white font-semibold">
                                        {submittingAction ? "Submitting..." : "Submit Rejection"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 justify-end">
                                    <Button 
                                      size="sm" 
                                      onClick={() => setRejectingLabelId(label._id)}
                                      className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold"
                                    >
                                      Reject Label
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => setApprovingLabelId(label._id)}
                                      className="btn-target-brand"
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
                    const rawList = detailsData?.productions || [];
                    if (rawList.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500">
                          <Factory className="w-12 h-12 mx-auto text-slate-350 mb-3" />
                          <p className="text-sm font-semibold">No production logs reported yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Raw weights, volumes, and batch numbers will log here during blending.</p>
                        </div>
                      );
                    }

                    // Sort productions by batch_no / createdAt ascending so they match client's product order (Batch 001, Batch 002, Batch 003...)
                    const list = [...rawList].sort((a: any, b: any) => {
                      const batchA = parseInt(String(a.batch_no || '').replace(/\D/g, ''), 10);
                      const batchB = parseInt(String(b.batch_no || '').replace(/\D/g, ''), 10);
                      if (!isNaN(batchA) && !isNaN(batchB) && batchA !== batchB) {
                        return batchA - batchB;
                      }
                      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return dateA - dateB;
                    });

                    const activeIndex = activeProductionTab < list.length ? activeProductionTab : 0;
                    const activeProd = list[activeIndex] || list[0];

                    // Helper to get exact product name for any production item
                    const getProdItemName = (prodItem: any, idx: number) => {
                      return getValidProductName(prodItem, idx);
                    };

                    const prodImages = getMediaArray(activeProd, ['images', 'production_images', 'photos', 'image', 'image_urls', 'production_photos']);
                    const prodVideos = getMediaArray(activeProd, ['videos', 'production_videos', 'video', 'video_urls', 'production_video_urls']);

                    return (
                      <div className="space-y-6">
                        {/* Product Tabs Header if multiple products exist */}
                        {list.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectProductionTab(activeIndex - 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <div
                              ref={productionTabScrollRef}
                              onScroll={() => handleTabScroll(productionTabScrollRef.current, list.length, setActiveProductionTab)}
                              className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth border border-slate-200/80 shadow-2xs flex-1 snap-x snap-mandatory min-w-0"
                            >
                              {list.map((prodItem: any, idx: number) => {
                                const productName = getProdItemName(prodItem, idx);
                                const isActive = idx === activeIndex;

                                return (
                                  <button
                                    key={prodItem._id || idx}
                                    type="button"
                                    onClick={() => selectProductionTab(idx, list.length)}
                                    className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer w-full sm:w-[calc(33.333%-0.375rem)] lg:w-[calc(25%-0.375rem)] snap-center sm:snap-start truncate ${
                                      isActive
                                        ? "bg-white text-[#20b657] shadow-sm border border-[#bbf0cb] ring-2 ring-[#20b657]/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
                                    }`}
                                  >
                                    <Factory className={`w-4 h-4 shrink-0 ${isActive ? "text-[#20b657]" : "text-slate-400"}`} />
                                    <span className="truncate">{productName}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectProductionTab(activeIndex + 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Active Product Details */}
                        <div className="border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6 bg-slate-50/[0.15]">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Produced Blend</span>
                              <h4 className="text-sm font-bold text-slate-800">
                                {getProdItemName(activeProd, activeIndex)}
                              </h4>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Batch Number</span>
                              <p className="text-sm font-semibold text-slate-800">{activeProd.batch_no}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Total Blend Weight</span>
                              <p className="text-sm font-bold text-[#20b657]">{activeProd.total_product_weight}</p>
                            </div>
                          </div>

                          {/* Raw Materials details */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Materials Blending details</h5>
                            <div className="border border-slate-150/70 rounded-xl overflow-hidden w-full bg-white shadow-sm">
                              <table className="w-full text-left text-[11px] sm:text-xs border-collapse table-fixed">
                                <thead>
                                  <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500">
                                    <th className="py-2.5 px-2 sm:px-3 font-bold ps-3 sm:ps-4 w-[15%] sm:w-[12%]">Sr.</th>
                                    <th className="py-2.5 px-2 sm:px-3 font-bold w-[55%] sm:w-[58%]">Ingredient / Raw Type</th>
                                    <th className="py-2.5 px-2 sm:px-3 font-bold text-right pr-3 sm:pr-4 w-[30%] sm:w-[30%]">Intake Weight</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {(activeProd.productionRawItems || []).map((raw: any, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50/20">
                                      <td className="py-2.5 px-2 sm:px-3 ps-3 sm:ps-4 text-slate-500">{index + 1}</td>
                                      <td className="py-2.5 px-2 sm:px-3 text-slate-800 font-bold break-words">{raw.item_name}</td>
                                      <td className="py-2.5 px-2 sm:px-3 text-right pr-3 sm:pr-4 font-bold text-slate-700 whitespace-nowrap">
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
                              <span className="text-sm font-bold text-slate-700">{(activeProd.total_raw_weight || 0) / 1000} kg</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Total Raw Volume</span>
                              <span className="text-sm font-bold text-slate-700">{(activeProd.total_raw_volume || 0) / 1000} Ltr</span>
                            </div>
                          </div>

                          {/* Production Gallery / Media */}
                          {(prodImages.length > 0 || prodVideos.length > 0) && (
                            <div className="space-y-3 pt-2">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Media Gallery</h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {prodImages.map((imgUrl: string, idx: number) => {
                                  const fullUrl = getImageUrl(imgUrl);
                                  return (
                                    <div 
                                      key={`img-${idx}`} 
                                      className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all cursor-pointer relative group aspect-video flex items-center justify-center"
                                      onClick={() => setActiveImageUrl(fullUrl)}
                                    >
                                      <img 
                                        src={fullUrl} 
                                        alt={`Production ${idx + 1}`} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          if (!target.dataset.tried) {
                                            target.dataset.tried = "true";
                                            if (imgUrl.includes("uploads/")) {
                                              target.src = `https://files.fggroup.in/${imgUrl.substring(imgUrl.indexOf("uploads/"))}`;
                                            }
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded border border-white/20">
                                          View Image
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {prodVideos.map((vidUrl: string, idx: number) => {
                                  const fullUrl = getImageUrl(vidUrl);
                                  return (
                                    <div 
                                      key={`vid-${idx}`} 
                                      className="border border-slate-150/70 rounded-xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all relative aspect-video flex items-center justify-center group cursor-pointer"
                                      onClick={() => setActiveVideoUrl(fullUrl)}
                                    >
                                      <video 
                                        src={fullUrl} 
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
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  case 'lab_report': {
                    if (selectedClient.production_process?.lab_report?.status === 'skipped') {
                      return (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <Slash className="w-6 h-6 text-slate-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">Lab Report Skipped</p>
                        </div>
                      );
                    }
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

                    const activeIndex = activeLabReportTab < list.length ? activeLabReportTab : 0;
                    const activeReport = list[activeIndex] || list[0];

                    return (
                      <div className="space-y-6">
                        {/* Product Tabs Header if multiple reports exist */}
                        {list.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectLabReportTab(activeIndex - 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <div
                              ref={labReportTabScrollRef}
                              onScroll={() => handleTabScroll(labReportTabScrollRef.current, list.length, setActiveLabReportTab)}
                              className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth border border-slate-200/80 shadow-2xs flex-1 snap-x snap-mandatory min-w-0"
                            >
                              {list.map((reportItem: any, idx: number) => {
                                const productName = getValidProductName(reportItem, idx);
                                const isActive = idx === activeIndex;

                                return (
                                  <button
                                    key={reportItem._id || idx}
                                    type="button"
                                    onClick={() => selectLabReportTab(idx, list.length)}
                                    className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer w-full sm:w-[calc(33.333%-0.375rem)] lg:w-[calc(25%-0.375rem)] snap-center sm:snap-start truncate ${
                                      isActive
                                        ? "bg-white text-[#20b657] shadow-sm border border-[#bbf0cb] ring-2 ring-[#20b657]/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
                                    }`}
                                  >
                                    <Cpu className={`w-4 h-4 shrink-0 ${isActive ? "text-[#20b657]" : "text-slate-400"}`} />
                                    <span className="truncate">{productName}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => selectLabReportTab(activeIndex + 1, list.length)}
                              className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-xs"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Active Lab Report Card */}
                        <div 
                          className="border border-slate-150/70 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.005] transition-all cursor-pointer relative group flex flex-col max-w-2xl mx-auto"
                          onClick={() => setActiveImageUrl(getImageUrl(activeReport.image))}
                        >
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-slate-800">{getValidProductName(activeReport, activeIndex, 'Lab Report')}</h4>
                              <p className="text-xs text-slate-400">Tested: {formatModalDateReadable(activeReport.createdAt)}</p>
                            </div>
                            <span className="p-1.5 rounded-lg bg-[#e8f9ee] text-[#20b657] border border-[#bbf0cb] flex items-center gap-1 text-xs font-bold">
                              <ShieldCheck className="w-4 h-4" /> Passed
                            </span>
                          </div>
                          <div className="bg-slate-50/50 flex items-center justify-center p-4 min-h-[280px] max-h-[420px] relative">
                            <img src={getImageUrl(activeReport.image)} alt="Lab Certificate" className="max-h-[380px] max-w-full object-contain rounded-lg shadow-sm" />
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <span className="text-xs text-white font-bold bg-slate-900/80 px-4 py-2 rounded-xl border border-white/25 flex items-center gap-2 shadow-lg">
                                <ExternalLink className="w-4 h-4" /> View Full Certificate
                              </span>
                            </div>
                          </div>
                        </div>
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
                                <p className="text-[10px] text-slate-450">Uploaded: {formatModalDateReadable(qc.createdAt)}</p>
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
                                <span className="text-xs font-bold text-[#20b657]">₹ {disp.orderValue}</span>
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
                                  {formatModalDateReadable(disp.dispatchDate || disp.updatedAt)}
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

      {/* Video Lightbox Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 p-4 sm:p-6" onClick={() => setActiveVideoUrl(null)}>
          <div className="relative bg-slate-900/95 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/15 max-w-[92vw] max-h-[85vh] m-auto flex flex-col p-2.5 sm:p-3.5" onClick={(e) => e.stopPropagation()}>
            {/* Header / Close Option inside Modal */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-[#20b657]" /> Production Video Preview
              </span>
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                aria-label="Close video"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <div className="inline-flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay 
                className="max-h-[72vh] max-w-[88vw] w-auto h-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeImageUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 p-4 sm:p-6" onClick={() => setActiveImageUrl(null)}>
          <div className="relative bg-slate-900/95 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/15 max-w-[92vw] max-h-[88vh] m-auto flex flex-col p-2.5 sm:p-3.5" onClick={(e) => e.stopPropagation()}>
            {/* Header / Close Option inside Modal */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#20b657]" /> Production Photo Preview
              </span>
              <button 
                onClick={() => setActiveImageUrl(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                aria-label="Close image"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <div className="inline-flex items-center justify-center overflow-hidden rounded-xl bg-black/40">
              <img 
                src={activeImageUrl} 
                alt="Production Media Preview" 
                className="max-w-[88vw] max-h-[68vh] w-auto h-auto object-contain rounded-xl"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(activeImageUrl, '_blank')}
                className="text-xs font-bold text-white bg-white/10 border-white/20 hover:bg-white/20 hover:text-white h-8"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Original
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const filename = activeImageUrl.split('/').pop()?.split('?')[0] || 'production-image.jpg';
                  handleDownloadFile(activeImageUrl, filename);
                }}
                className="btn-target-brand text-xs font-bold h-8"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download Image
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice PDF Viewer Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 max-w-5xl w-full h-[85dvh] sm:h-[85vh] max-h-[85dvh] sm:max-h-[85vh] m-auto shadow-2xl relative flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#99c229]" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Tax Invoice #{selectedClient.invoice_number || `INV-${selectedClient.common_id.slice(-6)}`}
                </h3>
              </div>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="p-1.5 rounded-xl border border-slate-100 text-slate-400 hover:text-slate-600 bg-white shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original PDF Viewer Frame for Android & iOS */}
            <div className="flex-1 min-h-0 bg-slate-100 overflow-hidden relative w-full h-full flex items-center justify-center">
              <object
                data={`${getApiBaseUrl()}/gn-clients/download-invoice?clientId=${selectedClient._id}&view=true#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                type="application/pdf"
                className="w-full h-full border-0 overflow-hidden block"
                style={{ width: '100%', height: '100%', border: '0', overflow: 'hidden' }}
              >
                <iframe
                  src={`${getApiBaseUrl()}/gn-clients/download-invoice?clientId=${selectedClient._id}&view=true#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                  className="w-full h-full border-0 overflow-hidden block"
                  style={{ width: '100%', height: '100%', border: '0', overflow: 'hidden' }}
                  title={`Tax Invoice #${selectedClient.invoice_number || selectedClient.common_id.slice(-6)}`}
                />
              </object>
            </div>

            {/* Modal Actions */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 shrink-0">
              <Button 
                variant="outline"
                onClick={() => setShowInvoiceModal(false)}
                className="text-xs font-bold"
              >
                Close
              </Button>
              <div className="flex flex-wrap gap-2">

                <Button
                  variant="outline"
                  onClick={handleViewInvoice}
                  className="text-xs font-bold text-[#7aa823] border-[#ddf0af] bg-[#f2f9eb]"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Open in New Tab
                </Button>
                <Button
                  onClick={handleDownloadInvoice}
                  className="btn-target-brand text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download Invoice
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
