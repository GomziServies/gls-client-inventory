import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Phone, KeyRound, Loader2 } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (mobile: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [timer, setTimer] = useState<number>(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const baseApiUrl = import.meta.env.PROD
    ? "/public/v1"
    : "http://localhost:80/public/v1";

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Focus transition for individual OTP boxes
  useEffect(() => {
    if (step === 2 && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [step]);

  const sendOtpRequest = async (showToast = true) => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return false;
    }

    setSendingOtp(true);
    try {
      const res = await fetch(`${baseApiUrl}/gn-clients/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          country_code: "+91",
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 200) {
        setVerificationId(json.data.verification_id);
        
        if (showToast) {
          toast.success("OTP sent to your WhatsApp number");
        }
        setTimer(30); // 30s cooling period
        return true;
      } else {
        toast.error(json.message || "Failed to send OTP. Please check your mobile number.");
        return false;
      }
    } catch (err) {
      toast.error("Network error. Please try again later.");
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 1: Mobile Submit
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const success = await sendOtpRequest();
    if (success) {
      setStep(2);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Shift focus to next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const digits = pastedData.split("");
    setOtp(digits);
    otpInputsRef.current[5]?.focus();
  };

  // Step 2: OTP Verification
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      toast.error("Please enter all 6 digits of the OTP.");
      return;
    }

    if (!verificationId) {
      toast.error("Verification session expired. Please request a new OTP.");
      setStep(1);
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch(`${baseApiUrl}/gn-clients/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verification_id: verificationId,
          otp: fullOtp,
          mobile,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 200) {
        toast.success("Login successful! Redirecting...");
        
        // Save Client's Name in local storage
        if (json.data && json.data.name) {
          localStorage.setItem("client_name", json.data.name);
        }
        
        setTimeout(() => {
          onLoginSuccess(mobile);
        }, 800);
      } else {
        toast.error(json.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      toast.error("Network error. Please verify your connection.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden">
      {/* Decorative backdrop shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-100/30 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/30 blur-3xl" />

      <div className="relative w-full max-w-[460px] p-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex flex-col items-center mb-8">
          {/* Logo */}
          <div className="h-16 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300">
            <img src="/gomzi-life-science.png" alt="Gomzi Life Science Logo" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Gomzi Life Sciences LLP</h2>
          <p className="text-sm text-slate-500">Admin Control Panel</p>
        </div>

        <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-2xl">
          <CardHeader className="space-y-1 pb-4 pt-8 text-center">
            <CardTitle className="text-xl font-bold text-slate-800">
              {step === 1 ? "Secure Login" : "Two-Step Verification"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {step === 1
                ? "Enter your registered mobile number to receive a secure OTP code on WhatsApp."
                : `Enter the 6-digit verification code sent on WhatsApp to +91 ${mobile.replace(/(\d{5})(\d{5})/, "$1-$2")}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm font-medium border-r border-slate-100 pr-2">
                      +91
                    </span>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-12 pl-[60px] rounded-xl border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all duration-200"
                      disabled={sendingOtp}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" disabled={sendingOtp} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2">
                  {sendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                  {sendingOtp ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block text-center">
                    Enter Verification Code
                  </label>
                  <div className="grid grid-cols-6 gap-2 w-full max-w-sm mx-auto">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={digit}
                        disabled={verifyingOtp}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="w-full aspect-square text-center text-lg font-bold text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
                      />
                    ))}
                  </div>
                  
                  {/* Resend OTP Section */}
                  <div className="flex justify-between items-center text-[11px] mt-3 px-1">
                    <span className="text-slate-400">
                      Didn't receive the code?
                    </span>
                    {timer > 0 ? (
                      <span className="text-slate-500 font-medium">
                        Resend in {timer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingOtp || verifyingOtp}
                        onClick={() => sendOtpRequest(true)}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors duration-200 focus:outline-none disabled:opacity-50"
                      >
                        {sendingOtp ? "Sending..." : "Resend OTP"}
                      </button>
                    )}
                  </div>
                  
                  <div className="text-center mt-2 border-t border-dashed border-slate-100 pt-2">
                    <p className="text-[11px] text-slate-400">
                      Use code <strong className="text-slate-600 font-semibold">123456</strong> for testing
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button type="submit" disabled={verifyingOtp} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2">
                    {verifyingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    {verifyingOtp ? "Verifying..." : "Verify & Proceed"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep(1);
                      setOtp(Array(6).fill(""));
                      setVerificationId(null);
                    }}
                    className="w-full text-xs text-slate-500 hover:text-slate-700"
                  >
                    Change mobile number
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
