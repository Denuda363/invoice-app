import React from "react";
import { Invoice } from "../types";
import { formatCurrency } from "../utils";
import { Plus, TrendingUp, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { format, isSameMonth, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  invoices: Invoice[];
  onAddFaktur: () => void;
  onPayFaktur: (invoice: Invoice) => void;
}

export function Dashboard({ invoices, onAddFaktur }: DashboardProps) {
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

    </motion.div>
  );
}
