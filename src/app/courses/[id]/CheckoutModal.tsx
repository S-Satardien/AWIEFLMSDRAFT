"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { processCourseCheckout } from "./actions";
import { X, CreditCard, Globe, Smartphone, Gift, ShieldCheck } from "lucide-react";

interface CheckoutModalProps {
  course: {
    id: string;
    title: string;
    priceZar: number;
    priceUsd: number;
    isFree: boolean;
    royaltyRate: number | null;
    authorName: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

type GatewayType = "PAYFAST" | "PAYPAL" | "PAYSTACK" | "SCHOLARSHIP";

/**
 * Interactive multi-gateway checkout modal simulating live African payments:
 * - PayFast (ZAR Cards, Instant EFT, SnapScan)
 * - PayPal (USD International)
 * - Paystack / Flutterwave (M-Pesa, MTN Mobile Money, Airtel Money)
 * - AWIEF Partner Scholarship Grant Code (e.g. AWIEF-JNJ-DEMO)
 *
 * Provides real-time calculation and preview of gateway fees, net revenue,
 * faculty author royalty, and AWIEF retained share.
 *
 * @param {CheckoutModalProps} props - The component properties.
 * @returns {JSX.Element} The rendered modal.
 */
export default function CheckoutModal({ course, isOpen, onClose, userEmail }: CheckoutModalProps) {
  const router = useRouter();
  const [gateway, setGateway] = useState<GatewayType>("PAYFAST");
  const [phoneOrAccount, setPhoneOrAccount] = useState("+27 82 123 4567");
  const [scholarshipCode, setScholarshipCode] = useState("AWIEF-JNJ-DEMO");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine pricing and currency
  const currency = gateway === "PAYPAL" ? "USD" : "ZAR";
  const amountOriginal = gateway === "PAYPAL" ? course.priceUsd : course.priceZar;
  const amountZar = course.priceZar;
  const royaltyRate = (course.royaltyRate || 35) / 100;

  // Calculate live fees & split
  let gatewayFeeZar = 0;
  if (gateway === "PAYFAST") {
    // 3.5% + R2.00
    gatewayFeeZar = Math.round(amountZar * 0.035 + 2.0);
  } else if (gateway === "PAYPAL") {
    // 4.4% + $0.30 equivalent in ZAR
    gatewayFeeZar = Math.round(amountZar * 0.044 + 5.5);
  } else if (gateway === "PAYSTACK") {
    // 2.9% + R1.00
    gatewayFeeZar = Math.round(amountZar * 0.029 + 1.0);
  } else if (gateway === "SCHOLARSHIP") {
    gatewayFeeZar = 0;
  }

  const netAmountZar = gateway === "SCHOLARSHIP" ? 0 : Math.max(0, amountZar - gatewayFeeZar);
  const authorRoyaltyZar = gateway === "SCHOLARSHIP" ? 0 : Math.round(netAmountZar * royaltyRate);
  const awiefShareZar = gateway === "SCHOLARSHIP" ? 0 : netAmountZar - authorRoyaltyZar;

  const handleCheckout = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await processCourseCheckout({
        courseId: course.id,
        gateway,
        currency,
        amountZar: gateway === "SCHOLARSHIP" ? 0 : amountZar,
        amountOriginal: gateway === "SCHOLARSHIP" ? 0 : amountOriginal,
        gatewayFeeZar,
        netAmountZar,
        authorRoyaltyZar,
        awiefShareZar,
        paymentDetail:
          gateway === "PAYFAST"
            ? "PayFast Card / Instant EFT (Ref: PF-" + Math.floor(100000 + Math.random() * 900000) + ")"
            : gateway === "PAYPAL"
            ? "PayPal International (Ref: PAYID-" + Math.random().toString(36).substring(2, 9).toUpperCase() + ")"
            : gateway === "PAYSTACK"
            ? `Paystack M-Pesa / MoMo (${phoneOrAccount})`
            : `AWIEF Partner Grant (${scholarshipCode})`,
        scholarshipCode: gateway === "SCHOLARSHIP" ? scholarshipCode : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Payment processing failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Success -> navigate to course
      router.push(res.redirectUrl || `/course/${course.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-[#EAD7E0] max-w-xl w-full overflow-hidden text-gray-900"
        >
          {/* Header */}
          <div className="bg-[#1D0B14] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-1">
              <span>AWIEF Commercial Checkout &amp; Settlement</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold leading-tight">
              {course.title}
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Faculty Author: {course.authorName || "AWIEF Faculty"} • Royalty Split Engine Active
            </p>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Gateway Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7F3D59]">
                Select Payment Method / African Gateway:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PayFast */}
                <button
                  type="button"
                  onClick={() => setGateway("PAYFAST")}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    gateway === "PAYFAST"
                      ? "border-[#7F3D59] bg-[#FDF8F9] ring-2 ring-[#7F3D59]/30"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-gray-900">PayFast (South Africa)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ZAR
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Visa, Mastercard, Instant EFT, SnapScan</p>
                  <p className="text-xs font-bold text-[#7F3D59] mt-2">R{course.priceZar.toLocaleString()}</p>
                </button>

                {/* PayPal */}
                <button
                  type="button"
                  onClick={() => setGateway("PAYPAL")}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    gateway === "PAYPAL"
                      ? "border-[#7F3D59] bg-[#FDF8F9] ring-2 ring-[#7F3D59]/30"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-gray-900">PayPal (International)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      USD
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Global credit cards &amp; PayPal wallet</p>
                  <p className="text-xs font-bold text-[#7F3D59] mt-2">${course.priceUsd}</p>
                </button>

                {/* Paystack / Mobile Money */}
                <button
                  type="button"
                  onClick={() => setGateway("PAYSTACK")}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    gateway === "PAYSTACK"
                      ? "border-[#7F3D59] bg-[#FDF8F9] ring-2 ring-[#7F3D59]/30"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-gray-900">Paystack / Mobile Money</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Pan-Africa
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">M-Pesa, MTN MoMo, Airtel Money, Cards</p>
                  <p className="text-xs font-bold text-[#7F3D59] mt-2">R{course.priceZar.toLocaleString()}</p>
                </button>

                {/* Scholarship Grant Code */}
                <button
                  type="button"
                  onClick={() => setGateway("SCHOLARSHIP")}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    gateway === "SCHOLARSHIP"
                      ? "border-[#D4AF37] bg-amber-50/50 ring-2 ring-[#D4AF37]/40"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-gray-900">Partner Grant / Voucher</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      Grant
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">J&amp;J Impact Lab / AWIEF Cohort Code</p>
                  <p className="text-xs font-bold text-[#D4AF37] mt-2">100% Sponsored</p>
                </button>
              </div>
            </div>

            {/* Gateway-specific details */}
            {gateway === "PAYSTACK" && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Mobile Money Phone Number (Kenya M-Pesa, Ghana/SA MTN MoMo):
                </label>
                <input
                  type="text"
                  value={phoneOrAccount}
                  onChange={(e) => setPhoneOrAccount(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
                  placeholder="+254 712 345678"
                />
                <p className="text-[11px] text-gray-500">
                  Simulated sandbox: an instant USSD prompt will be approved automatically for demo purposes.
                </p>
              </div>
            )}

            {gateway === "SCHOLARSHIP" && (
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-2">
                <label className="block text-xs font-bold text-purple-900">
                  Enter Partner Grant or Scholarship Code:
                </label>
                <input
                  type="text"
                  value={scholarshipCode}
                  onChange={(e) => setScholarshipCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="AWIEF-JNJ-DEMO"
                />
                <p className="text-[11px] text-purple-700">
                  Default Demo Voucher: <span className="font-bold underline">AWIEF-JNJ-DEMO</span> grants immediate unrestricted access.
                </p>
              </div>
            )}

            {/* Financial Ledger & Split Preview */}
            <div className="bg-[#FDF8F9] rounded-2xl p-4 border border-[#EAD7E0] space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAD7E0]">
                <span className="font-bold text-[#7F3D59] uppercase tracking-wider text-[11px]">
                  Transparent Financial Settlement:
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {currency === "USD" ? `$${course.priceUsd} USD` : `R${course.priceZar} ZAR`}
                </span>
              </div>

              {gateway === "SCHOLARSHIP" ? (
                <div className="text-purple-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Course Tuition:</span>
                    <span className="line-through">R{amountZar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Partner Subsidy Applied:</span>
                    <span>-R{amountZar.toLocaleString()} (100%)</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-purple-200">
                    <span>Total Due Now:</span>
                    <span>R0.00 (Sponsored)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-gray-700">
                  <div className="flex justify-between">
                    <span>Gross Learner Tuition:</span>
                    <span className="font-semibold">R{amountZar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Estimated Gateway Fee ({gateway}):</span>
                    <span>-R{gatewayFeeZar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Net Distributable Revenue:</span>
                    <span>R{netAmountZar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#7F3D59] pt-1">
                    <span>Faculty Author Royalty ({Math.round(royaltyRate * 100)}%):</span>
                    <span className="font-bold">R{authorRoyaltyZar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>AWIEF Retained Operations ({Math.round((1 - royaltyRate) * 100)}%):</span>
                    <span className="font-semibold">R{awiefShareZar.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Processing Settlement...</span>
                ) : gateway === "SCHOLARSHIP" ? (
                  <span>Redeem Sponsored Access &amp; Launch Course →</span>
                ) : (
                  <span>
                    Confirm Simulated {gateway} Payment (
                    {currency === "USD" ? `$${course.priceUsd}` : `R${course.priceZar.toLocaleString()}`}) →
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                Cancel and return to course overview
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
