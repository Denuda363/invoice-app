import React from "react";
import { Invoice } from "../types";
import { formatCurrency, cn } from "../utils";
import { FileText, Plus, Search, TrendingUp, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { format, differenceInDays, isSameMonth } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  invoices: Invoice[];
  onAddFaktur: () => void;
  onPayFaktur: (invoice: Invoice) => void;
}

export function Dashboard({ invoices, onAddFaktur, onPayFaktur }: DashboardProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredInvoices = invoices.filter((inv) =>
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Metrics
  const today = new Date();
  
  let totalPiutang = 0;
  let piutangJatuhTempo = 0;
  let totalLunas = 0;
  let fakturJatuhTempoCount = 0;

  invoices.forEach(inv => {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = inv.totalAmount - totalPaid;
    const dueDate = new Date(inv.dueDate);
    const diffDays = differenceInDays(dueDate, today);

    if (inv.status !== "PAID") {
      totalPiutang += remaining;
      if (diffDays < 0) {
        piutangJatuhTempo += remaining;
        fakturJatuhTempoCount++;
      }
    }
    
    // Calculate payments made this month
    inv.payments.forEach(p => {
      if (isSameMonth(new Date(p.date), today)) {
        totalLunas += p.amount;
      }
    });
  });

  // Calculate Chart Data (last 6 months)
  const chartDataMap: Record<string, { month: string; pemasukan: number; tagihan: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = format(d, "MMM yyyy", { locale: id });
    chartDataMap[m] = { month: m, pemasukan: 0, tagihan: 0 };
  }

  invoices.forEach(inv => {
    const invDate = new Date(inv.date);
    const invMonth = format(invDate, "MMM yyyy", { locale: id });
    if (chartDataMap[invMonth]) {
      chartDataMap[invMonth].tagihan += inv.totalAmount;
    }

    inv.payments.forEach(p => {
      const pDate = new Date(p.date);
      const pMonth = format(pDate, "MMM yyyy", { locale: id });
      if (chartDataMap[pMonth]) {
        chartDataMap[pMonth].pemasukan += p.amount;
      }
    });
  });

  const chartData = Object.values(chartDataMap);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="space-y-8"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</motion.h2>
          <motion.p variants={itemVariants} className="text-gray-500 mt-1">Ringkasan tagihan dan piutang Anda hari ini.</motion.p>
        </div>
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddFaktur}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Faktur Baru
        </motion.button>
      </div>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full transition-transform group-hover:scale-150 duration-500 ease-out"></div>
          <div className="relative">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg"><DollarSign size={20} /></div>
              <h3 className="font-semibold text-sm text-gray-600">Total Piutang</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPiutang)}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full transition-transform group-hover:scale-150 duration-500 ease-out"></div>
          <div className="relative">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <div className="p-2 bg-red-100 rounded-lg"><AlertCircle size={20} /></div>
              <h3 className="font-semibold text-sm text-gray-600">Jatuh Tempo</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(piutangJatuhTempo)}</p>
            <p className="text-xs text-red-500 mt-1">{fakturJatuhTempoCount} Faktur terlewat</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full transition-transform group-hover:scale-150 duration-500 ease-out"></div>
          <div className="relative">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg"><TrendingUp size={20} /></div>
              <h3 className="font-semibold text-sm text-gray-600">Pemasukan Bulan Ini</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalLunas)}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full transition-transform group-hover:scale-150 duration-500 ease-out"></div>
          <div className="relative">
            <div className="flex items-center gap-3 text-purple-600 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg"><CheckCircle2 size={20} /></div>
              <h3 className="font-semibold text-sm text-gray-600">Total Faktur</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Chart Section */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Statistik Pemasukan vs Tagihan (6 Bulan Terakhir)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTagihan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPemasukan)" />
              <Area type="monotone" dataKey="tagihan" name="Tagihan" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTagihan)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-bold text-gray-900">Daftar Faktur</h3>
        <div className="flex w-full sm:w-72 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari faktur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-5 py-4 font-semibold">No. Faktur</th>
                <th className="px-5 py-4 font-semibold">Konsumen</th>
                <th className="px-5 py-4 font-semibold">Jatuh Tempo</th>
                <th className="px-5 py-4 font-semibold">Total / Sisa</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredInvoices.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-gray-50 rounded-full mb-3">
                          <FileText size={32} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-600">Tidak ada faktur yang ditemukan.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredInvoices.map((inv, index) => {
                    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
                    const remaining = inv.totalAmount - totalPaid;
                    
                    const dueDate = new Date(inv.dueDate);
                    const diffDays = differenceInDays(dueDate, today);

                    return (
                      <motion.tr 
                        key={inv.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-5 py-4 text-gray-600 font-medium">{inv.customerName}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600">
                              {format(new Date(inv.dueDate), "dd MMM yyyy", { locale: id })}
                            </span>
                            {inv.status !== "PAID" && (
                              <span
                                className={cn(
                                  "text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full w-fit",
                                  diffDays < 0
                                    ? "bg-red-100 text-red-600"
                                    : diffDays <= 7
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-gray-100 text-gray-500"
                                )}
                              >
                                {diffDays < 0
                                  ? `Lewat ${Math.abs(diffDays)} hari`
                                  : `${diffDays} hari lagi`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-900 font-semibold">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                            {inv.status !== "PAID" && remaining > 0 && (
                              <span className="text-xs font-medium text-red-500">
                                Sisa: {formatCurrency(remaining)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "PARTIAL"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {inv.status === "PAID"
                              ? "Lunas"
                              : inv.status === "PARTIAL"
                              ? "Sebagian"
                              : "Belum Bayar"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={inv.status === "PAID"}
                            onClick={() => onPayFaktur(inv)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 transition-all"
                          >
                            Bayar
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
