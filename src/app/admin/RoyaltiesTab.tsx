"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionItem {
  id: string;
  reference: string;
  gateway: string;
  currency: string;
  amountZar: number;
  amountOriginal: number;
  gatewayFeeZar: number;
  netAmountZar: number;
  authorRoyaltyZar: number;
  awiefShareZar: number;
  status: string;
  paymentMethodDetail: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
    country: string | null;
    organization: string | null;
  };
  course?: {
    id: string;
    title: string;
    authorName: string | null;
    authorRole: string | null;
    royaltyRate: number | null;
  };
}

interface RoyaltiesTabProps {
  transactions: TransactionItem[];
  courses: any[];
}

/**
 * Author Royalty Calculation & Monthly Statement Engine.
 * Provides transparent revenue sharing calculations, gateway fee deductions,
 * per-author monthly breakdown tables, 1-click CSV exports, and printable PDF statements.
 *
 * @param {RoyaltiesTabProps} props - Component properties.
 * @returns {JSX.Element} The rendered royalty engine.
 */
export default function RoyaltiesTab({ transactions, courses }: RoyaltiesTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("ALL");
  const [activeStatementCourse, setActiveStatementCourse] = useState<any | null>(null);

  // Available authors
  const authorsList = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.authorName) set.add(c.authorName);
    });
    return Array.from(set);
  }, [courses]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const dateStr = t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 7) : "";
      if (selectedMonth !== "ALL" && dateStr !== selectedMonth) return false;
      if (selectedCourseId !== "ALL" && t.course?.id !== selectedCourseId) return false;
      if (selectedAuthor !== "ALL" && t.course?.authorName !== selectedAuthor) return false;
      return true;
    });
  }, [transactions, selectedMonth, selectedCourseId, selectedAuthor]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    let grossZar = 0;
    let feesZar = 0;
    let netZar = 0;
    let royaltiesZar = 0;
    let awiefShareZar = 0;

    filteredTransactions.forEach((t) => {
      grossZar += t.amountZar || 0;
      feesZar += t.gatewayFeeZar || 0;
      netZar += t.netAmountZar || 0;
      royaltiesZar += t.authorRoyaltyZar || 0;
      awiefShareZar += t.awiefShareZar || 0;
    });

    return {
      grossZar,
      feesZar,
      netZar,
      royaltiesZar,
      awiefShareZar,
      totalCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Per-Course / Per-Author Breakdown
  const courseBreakdowns = useMemo(() => {
    const map = new Map<string, any>();

    courses.forEach((c) => {
      if (!c.isFree) {
        map.set(c.id, {
          courseId: c.id,
          title: c.title,
          authorName: c.authorName || c.instructor || "AWIEF Faculty",
          authorRole: c.authorRole || c.instructorRole || "Lead SME Practitioner",
          royaltyRate: c.royaltyRate || 35,
          unitsSold: 0,
          grossZar: 0,
          feesZar: 0,
          netZar: 0,
          royaltiesZar: 0,
          awiefShareZar: 0,
          transactions: [] as TransactionItem[],
        });
      }
    });

    filteredTransactions.forEach((t) => {
      if (t.course?.id && map.has(t.course.id)) {
        const item = map.get(t.course.id);
        item.unitsSold += 1;
        item.grossZar += t.amountZar || 0;
        item.feesZar += t.gatewayFeeZar || 0;
        item.netZar += t.netAmountZar || 0;
        item.royaltiesZar += t.authorRoyaltyZar || 0;
        item.awiefShareZar += t.awiefShareZar || 0;
        item.transactions.push(t);
      }
    });

    return Array.from(map.values()).filter((item) => {
      if (selectedAuthor !== "ALL" && item.authorName !== selectedAuthor) return false;
      if (selectedCourseId !== "ALL" && item.courseId !== selectedCourseId) return false;
      return true;
    });
  }, [courses, filteredTransactions, selectedAuthor, selectedCourseId]);

  // Export CSV function
  const handleExportCSV = () => {
    let csv = "Reference,Date,Learner Name,Learner Email,Country,Course Title,Author,Gateway,Currency,Gross ZAR,Gateway Fee ZAR,Net Distributable ZAR,Author Royalty ZAR,AWIEF Share ZAR,Status\n";

    filteredTransactions.forEach((t) => {
      const date = t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "";
      csv += `"${t.reference}","${date}","${t.user?.name || ""}","${t.user?.email || ""}","${t.user?.country || ""}","${t.course?.title || ""}","${t.course?.authorName || ""}","${t.gateway}","${t.currency}",${t.amountZar},${t.gatewayFeeZar},${t.netAmountZar},${t.authorRoyaltyZar},${t.awiefShareZar},"${t.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `awief-royalty-statement-${selectedMonth}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EAD7E0] shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gross Tuition Revenue</p>
          <div className="text-2xl font-serif font-extrabold text-gray-900 mt-1">
            R{kpis.grossZar.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{kpis.totalCount} transactions settled</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAD7E0] shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gateway Fees (Deducted)</p>
          <div className="text-2xl font-serif font-extrabold text-amber-700 mt-1">
            -R{kpis.feesZar.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">PayFast, PayPal, Paystack</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAD7E0] shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Distributable Pool</p>
          <div className="text-2xl font-serif font-extrabold text-gray-900 mt-1">
            R{kpis.netZar.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">100% of distributable pool</p>
        </div>

        <div className="bg-[#FDF8F9] p-5 rounded-2xl border border-[#7F3D59]/30 shadow-xs">
          <p className="text-[10px] font-bold text-[#7F3D59] uppercase tracking-wider">Faculty Author Royalties</p>
          <div className="text-2xl font-serif font-extrabold text-[#7F3D59] mt-1">
            R{kpis.royaltiesZar.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#7F3D59]/80 mt-1">Fair revenue share to authors</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAD7E0] shadow-xs">
          <p className="text-[10px] font-bold text-[#1D0B14] uppercase tracking-wider">AWIEF Retained Share</p>
          <div className="text-2xl font-serif font-extrabold text-[#1D0B14] mt-1">
            R{kpis.awiefShareZar.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Academy &amp; scholarship funds</p>
        </div>
      </div>

      {/* Control Strip & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-[#EAD7E0] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Billing Month:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
            >
              <option value="ALL">All Recorded Months</option>
              <option value="2026-11">November 2026 (Current)</option>
              <option value="2026-10">October 2026</option>
            </select>
          </div>

          {/* Author selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Faculty Author:
            </label>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
            >
              <option value="ALL">All Faculty Authors</option>
              {authorsList.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Course selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Masterclass:
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] max-w-xs truncate"
            >
              <option value="ALL">All Commercial Masterclasses</option>
              {courses.filter(c => !c.isFree).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>📥 Export Monthly CSV Statement</span>
          </button>
        </div>
      </div>

      {/* Per-Author & Per-Course Summary Table */}
      <div className="bg-white rounded-2xl border border-[#EAD7E0] shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900">
              Monthly Faculty Royalty Summary ({courseBreakdowns.length} Courses)
            </h3>
            <p className="text-xs text-gray-500">
              Contracted revenue splits, gateway deductions, and net disbursements owed.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDF8F9] border-y border-[#EAD7E0] text-[11px] font-bold uppercase tracking-wider text-[#7F3D59]">
              <tr>
                <th className="py-3 px-4">Masterclass &amp; Faculty</th>
                <th className="py-3 px-4 text-center">Royalty %</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross (ZAR)</th>
                <th className="py-3 px-4 text-right">Fees (ZAR)</th>
                <th className="py-3 px-4 text-right">Net Distributable</th>
                <th className="py-3 px-4 text-right font-bold text-[#7F3D59]">Author Owed</th>
                <th className="py-3 px-4 text-right">AWIEF Share</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courseBreakdowns.map((item) => (
                <tr key={item.courseId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 max-w-xs">
                    <p className="font-bold text-gray-900 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-[#7F3D59] font-medium">{item.authorName} • {item.authorRole}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-gray-700">
                    {item.royaltyRate}%
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">
                    {item.unitsSold}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-700">
                    R{item.grossZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700">
                    -R{item.feesZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                    R{item.netZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#7F3D59]">
                    R{item.royaltiesZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-700">
                    R{item.awiefShareZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveStatementCourse(item)}
                      className="px-3 py-1.5 bg-[#FDF8F9] hover:bg-[#EAD7E0] text-[#7F3D59] rounded-lg border border-[#7F3D59]/30 font-bold text-[11px] transition-colors"
                    >
                      Print Statement 🖨
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Transaction Ledger */}
      <div className="bg-white rounded-2xl border border-[#EAD7E0] shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900">
              Live Gateway Settlement Ledger ({filteredTransactions.length} Transactions)
            </h3>
            <p className="text-xs text-gray-500">
              Auditable transaction records across PayFast, PayPal, Paystack, M-Pesa, and Scholarships.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDF8F9] border-y border-[#EAD7E0] text-[11px] font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Reference &amp; Date</th>
                <th className="py-3 px-4">Learner &amp; Venture</th>
                <th className="py-3 px-4">Masterclass</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-right">Fee</th>
                <th className="py-3 px-4 text-right font-bold text-[#7F3D59]">Author Royalty</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-gray-900">{tx.reference}</p>
                    <p className="text-gray-400 font-sans text-[10px]">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}
                    </p>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <p className="font-bold text-gray-800">{tx.user?.name || "Learner"}</p>
                    <p className="text-gray-500 text-[10px]">{tx.user?.organization || tx.user?.email}</p>
                  </td>
                  <td className="py-3 px-4 font-sans max-w-xs truncate">
                    <p className="font-medium text-gray-800">{tx.course?.title || "Masterclass"}</p>
                    <p className="text-[10px] text-[#7F3D59]">{tx.course?.authorName || "Faculty"}</p>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[10px]">
                      {tx.gateway}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 font-bold">
                    R{tx.amountZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-700">
                    -R{tx.gatewayFeeZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-[#7F3D59] font-bold">
                    R{tx.authorRoyaltyZar.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Monthly Author Statement Modal */}
      <AnimatePresence>
        {activeStatementCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#EAD7E0] max-w-2xl w-full overflow-hidden text-gray-900 p-8 space-y-6"
            >
              {/* Modal Actions */}
              <div className="flex items-center justify-between no-print border-b border-gray-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7F3D59]">
                  Official Monthly Statement Preview
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Print or Save PDF 🖨
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStatementCourse(null)}
                    className="text-gray-400 hover:text-gray-800 text-sm ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Statement Header */}
              <div className="flex items-start justify-between border-b-2 border-[#7F3D59] pb-4">
                <div>
                  <img src="/images/awief-logo.jpg" alt="AWIEF" className="h-10 w-auto mb-2" />
                  <h2 className="text-lg font-serif font-bold text-[#1D0B14]">
                    Africa Women Innovation &amp; Entrepreneurship Forum
                  </h2>
                  <p className="text-[11px] text-gray-500">16 Bell Crescent, Westlake Business Park, Tokai 7945, Cape Town</p>
                  <p className="text-[11px] text-gray-500">UN ECOSOC Consultative Status • Registration NPC: 2015/028456/08</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-[#7F3D59] uppercase tracking-wider">Royalty Statement</p>
                  <p className="text-xs font-mono font-bold">STMT-{selectedMonth}-{activeStatementCourse.courseId.substring(0, 4).toUpperCase()}</p>
                  <p className="text-[11px] text-gray-500">Period: {selectedMonth === "ALL" ? "All Recorded Periods" : selectedMonth}</p>
                </div>
              </div>

              {/* Beneficiary Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#FDF8F9] p-4 rounded-xl border border-[#EAD7E0]">
                <div>
                  <p className="font-bold text-gray-500 uppercase text-[10px]">Beneficiary Faculty Author:</p>
                  <p className="text-sm font-serif font-bold text-gray-900 mt-0.5">{activeStatementCourse.authorName}</p>
                  <p className="text-gray-600">{activeStatementCourse.authorRole}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-500 uppercase text-[10px]">Contracted Masterclass:</p>
                  <p className="text-sm font-serif font-bold text-[#7F3D59] mt-0.5">{activeStatementCourse.title}</p>
                  <p className="text-gray-600">Agreed Revenue Share: {activeStatementCourse.royaltyRate}% of Net</p>
                </div>
              </div>

              {/* Financial Calculation Table */}
              <div className="space-y-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-gray-200 text-gray-500 text-[10px] uppercase">
                    <tr>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-center">Units</th>
                      <th className="py-2 text-right">Amount (ZAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    <tr>
                      <td className="py-2 font-sans font-medium">Gross Enrolled Learner Tuition</td>
                      <td className="py-2 text-center">{activeStatementCourse.unitsSold}</td>
                      <td className="py-2 text-right">R{activeStatementCourse.grossZar.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-sans text-amber-700">Less: Payment Gateway Processing Fees</td>
                      <td className="py-2 text-center text-gray-400">—</td>
                      <td className="py-2 text-right text-amber-700">-R{activeStatementCourse.feesZar.toLocaleString()}</td>
                    </tr>
                    <tr className="font-bold bg-gray-50">
                      <td className="py-2 font-sans">Net Distributable Platform Revenue</td>
                      <td className="py-2 text-center text-gray-400">—</td>
                      <td className="py-2 text-right">R{activeStatementCourse.netZar.toLocaleString()}</td>
                    </tr>
                    <tr className="text-[#7F3D59] font-bold text-sm bg-[#FDF8F9]">
                      <td className="py-2 font-serif">Net Faculty Author Payout ({activeStatementCourse.royaltyRate}%)</td>
                      <td className="py-2 text-center text-gray-400">—</td>
                      <td className="py-2 text-right">R{activeStatementCourse.royaltiesZar.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="h-8 border-b border-gray-400 flex items-center font-serif italic text-gray-700 font-bold">
                    Ekene Ochem
                  </div>
                  <p className="font-bold text-gray-800 mt-1">Ekene Ochem</p>
                  <p className="text-[10px] text-gray-500">Director of Programs &amp; Innovation, AWIEF</p>
                </div>
                <div>
                  <div className="h-8 border-b border-gray-400 flex items-center font-serif italic text-gray-700">
                    Verified Disbursement Seal
                  </div>
                  <p className="font-bold text-gray-800 mt-1">AWIEF NPC Treasury</p>
                  <p className="text-[10px] text-gray-500">Status: Approved for Electronic Bank Transfer</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
