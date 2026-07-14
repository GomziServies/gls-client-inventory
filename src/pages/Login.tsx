import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Phone, KeyRound, Sparkles } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (mobile: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Mobile Submit
  const handleSendOtp = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    // Simulate sending OTP
    toast.success("OTP sent to your mobile number");
    setStep(2);
  };

  // Focus transition for individual OTP boxes
  useEffect(() => {
    if (step === 2 && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [step]);

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
  const handleVerifyOtp = (e: FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      toast.error("Please enter all 6 digits of the OTP.");
      return;
    }

    // Mock verification: "123456" succeeds
    if (fullOtp === "123456" || fullOtp === "000000") {
      toast.success("Login successful! Redirecting...");
      setTimeout(() => {
        onLoginSuccess(mobile);
      }, 800);
    } else {
      toast.error("Invalid OTP. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden">
      {/* Decorative backdrop shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-100/30 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/30 blur-3xl" />

      <div className="relative w-full max-w-[420px] p-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex flex-col items-center mb-8">
          {/* Logo */}
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-slate-200/50 mb-3 hover:scale-105 transition-transform duration-300 p-2 border border-slate-100">
            <img src="/gomzi-nutrition.png" alt="Gomzi Nutrition Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Gomzi Life Science</h2>
          <p className="text-sm text-slate-500">Admin Control Panel</p>
        </div>

        <Card className="border border-slate-100 shadow-xl shadow-slate-100/40">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl font-bold text-slate-800">
              {step === 1 ? "Secure Login" : "Two-Step Verification"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {step === 1
                ? "Enter your registered mobile number to receive a secure OTP code."
                : `Enter the 6-digit verification code sent to +91 ${mobile.replace(/(\d{5})(\d{5})/, "$1-$2")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      className="pl-[60px]"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block text-center">
                    Enter Verification Code
                  </label>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-12 text-center text-lg font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
                      />
                    ))}
                  </div>
                  <div className="text-center mt-1">
                    <p className="text-[11px] text-slate-400">
                      Use code <strong className="text-slate-600 font-semibold">123456</strong> for testing
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button type="submit" className="w-full flex items-center justify-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Verify & Proceed
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep(1);
                      setOtp(Array(6).fill(""));
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

        <div className="mt-8 flex justify-center items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          <span>Powered by Gomzi Life Science Systems</span>
        </div>
      </div>
    </div>
  );
}
