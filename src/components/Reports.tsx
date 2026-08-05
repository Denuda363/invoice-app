import React, { useState } from "react";
import { Invoice } from "../types";
import { formatCurrency, cn } from "../utils";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { FileDown, Search, Filter, CheckSquare, Square, Check } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ReportsProps {
  invoices: Invoice[];
  onPayFaktur?: (invoice: Invoice) => void;
  onBulkPay?: (payments: {invoiceId: string, amount: number, date: string}[]) => void;
}

export function Reports({ invoices, onPayFaktur, onBulkPay }: ReportsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("UNPAID");
  const [dueDateFilter, setDueDateFilter] = useState("ALL");
  const [customAgeFilter, setCustomAgeFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  let filteredInvoices = invoices;

  // Status Filter
  if (statusFilter === "PAID") {
    filteredInvoices = filteredInvoices.filter((inv) => inv.status === "PAID");
  } else if (statusFilter === "UNPAID") {
    filteredInvoices = filteredInvoices.filter((inv) => inv.status !== "PAID");
  } else if (statusFilter === "OVERDUE") {
    filteredInvoices = filteredInvoices.filter((inv) => {
      if (inv.status === "PAID") return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return differenceInDays(dueDate, today) < 0;
    });
  }

  if (searchTerm) {
    filteredInvoices = filteredInvoices.filter((inv) =>
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (customAgeFilter) {
    const filterAge = parseInt(customAgeFilter, 10);
    if (!isNaN(filterAge)) {
      filteredInvoices = filteredInvoices.filter((inv) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = differenceInDays(dueDate, today);
        return diffDays >= 0 && diffDays <= filterAge;
      });
    }
  }

  filteredInvoices = filteredInvoices.filter((inv) => {
    if (customAgeFilter) return true; // skip this filter if custom age is used

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = differenceInDays(dueDate, today);

    switch (dueDateFilter) {
      case "OVERDUE":
        return diffDays < 0;
      case "TODAY":
        return diffDays === 0;
      case "7DAYS":
        return diffDays > 0 && diffDays <= 7;
      case "30DAYS":
        return diffDays > 7 && diffDays <= 30;
      case "MORE30DAYS":
        return diffDays > 30;
      default:
        return true;
    }
  });

  // Group by customer
  const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
    if (!acc[inv.customerName]) {
      acc[inv.customerName] = [];
    }
    acc[inv.customerName].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  const handleToggleSelect = (invoiceId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(invoiceId)) {
      newSet.delete(invoiceId);
    } else {
      newSet.add(invoiceId);
    }
    setSelectedIds(newSet);
  };

  const handleBulkPayClick = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Anda yakin ingin memproses pelunasan untuk ${selectedIds.size} faktur terpilih?`)) {
      const today = format(new Date(), "yyyy-MM-dd");
      const payments = [];
      for (const id of Array.from(selectedIds)) {
        const inv = invoices.find(i => i.id === id);
        if (inv && inv.status !== "PAID") {
          const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
          const remaining = inv.totalAmount - totalPaid;
          if (remaining > 0) {
            payments.push({ invoiceId: id, amount: remaining, date: today });
          }
        }
      }
      if (onBulkPay && payments.length > 0) {
        onBulkPay(payments);
        setSelectedIds(new Set());
      }
    }
  };

  const exportExcel = () => {
    const aoa: any[][] = [
      ["NO", "CUSTOMER", "TGL FAKTUR", "NO FAKTUR", "NOMINAL", "BAYAR", "SISA", "TGL JATUH TEMPO", "", "", "keterangan lunas"],
      ["", "", "", "", "", "", "", "TGL", "BULAN", "TAHUN", ""],
    ];

    const formatRp = (num: number) => `Rp${new Intl.NumberFormat("id-ID").format(num)}`;

    filteredInvoices.forEach((inv, index) => {
      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = inv.totalAmount - totalPaid;
      
      const invDate = new Date(inv.date);
      const dueDate = new Date(inv.dueDate);

      aoa.push([
        index + 1,
        inv.customerName,
        format(invDate, "dd-MMM-yy", { locale: id }).toLowerCase(),
        inv.invoiceNumber,
        formatRp(inv.totalAmount),
        totalPaid > 0 ? formatRp(totalPaid) : "",
        formatRp(remaining),
        format(dueDate, "dd", { locale: id }),
        format(dueDate, "MMMM", { locale: id }).toUpperCase(),
        format(dueDate, "yyyy", { locale: id }),
        inv.status === "PAID" || remaining <= 0 ? "Lunas" : ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Apply styles
    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "E5E7EB" } }
    };
    
    const paidStyle = {
      fill: { fgColor: { rgb: "BBF7D0" } } // Tailwind green-200
    };

    for (let R = 0; R < aoa.length; ++R) {
      const isHeader = R === 0 || R === 1;
      const isPaid = !isHeader && aoa[R][10] === "Lunas";
      
      for (let C = 0; C < aoa[R].length; ++C) {
        const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
        if (ws[cell_ref]) {
          if (isHeader) {
            ws[cell_ref].s = headerStyle;
          } else if (isPaid) {
            ws[cell_ref].s = paidStyle;
          }
        }
      }
    }

    // Merge cells for headers
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // NO
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // CUSTOMER
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // TGL FAKTUR
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // NO FAKTUR
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // NOMINAL
      { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } }, // BAYAR
      { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } }, // SISA
      { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } }, // TGL JATUH TEMPO
      { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } }, // keterangan lunas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Faktur");
    XLSX.writeFile(wb, "Laporan_Jatuh_Tempo.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Rekap Faktur Jatuh Tempo", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}`, 14, 22);

    const body = filteredInvoices.map((inv) => {
      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = inv.totalAmount - totalPaid;
      const today = new Date();
      const dueDate = new Date(inv.dueDate);
      const diffDays = differenceInDays(dueDate, today);

      let umur = diffDays < 0 ? `Lewat ${Math.abs(diffDays)} hari` : `${diffDays} hari lagi`;

      return [
        inv.customerName,
        inv.invoiceNumber,
        format(new Date(inv.dueDate), "dd/MM/yyyy"),
        umur,
        formatCurrency(remaining),
      ];
    });

    // @ts-ignore - jspdf-autotable extends jsPDF but types might complain
    doc.autoTable({
      startY: 28,
      head: [["Konsumen", "No. Faktur", "Jatuh Tempo", "Umur Faktur", "Sisa Tagihan"]],
      body: body,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("Laporan_Jatuh_Tempo.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rekap Faktur Jatuh Tempo</h2>
          <p className="text-sm text-gray-500 mt-1">Dikelompokkan berdasarkan konsumen</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileDown size={18} />
            Export Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <FileDown size={18} />
            Export PDF
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkPayClick}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Check size={18} />
              Bayar Terpilih ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama konsumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none cursor-pointer"
          >
            <option value="ALL">Semua Faktur</option>
            <option value="UNPAID">Faktur Belum Lunas</option>
            <option value="PAID">Faktur Lunas</option>
            <option value="OVERDUE">Faktur Jatuh Tempo</option>
          </select>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <Filter size={18} className="text-gray-400" />
          <input
            type="number"
            min="0"
            placeholder="Umur faktur (hari)..."
            value={customAgeFilter}
            onChange={(e) => setCustomAgeFilter(e.target.value)}
            className="w-40 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={dueDateFilter}
            onChange={(e) => {
              setDueDateFilter(e.target.value);
              setCustomAgeFilter(""); // reset custom age when selecting from dropdown
            }}
            disabled={!!customAgeFilter || statusFilter === "OVERDUE"}
            className="w-full bg-transparent text-sm outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="ALL">Semua Jatuh Tempo</option>
            <option value="OVERDUE">Lewat Jatuh Tempo</option>
            <option value="TODAY">Jatuh Tempo Hari Ini</option>
            <option value="7DAYS">Dalam 7 Hari</option>
            <option value="30DAYS">8 - 30 Hari</option>
            <option value="MORE30DAYS">Lebih dari 30 Hari</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedInvoices).length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Tidak ada faktur yang belum lunas.
          </div>
        ) : (
          Object.entries(groupedInvoices).map(([customerName, customerInvoices]) => (
            <div key={customerName} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">{customerName}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium w-12 text-center">
                        <button
                          onClick={() => {
                            const allIds = customerInvoices.filter(i => i.status !== "PAID").map(i => i.id);
                            const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
                            const newSet = new Set(selectedIds);
                            if (isAllSelected) {
                              allIds.forEach(id => newSet.delete(id));
                            } else {
                              allIds.forEach(id => newSet.add(id));
                            }
                            setSelectedIds(newSet);
                          }}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          {customerInvoices.filter(i => i.status !== "PAID").length > 0 && customerInvoices.filter(i => i.status !== "PAID").every(i => selectedIds.has(i.id)) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 font-medium">No. Faktur</th>
                      <th className="px-4 py-3 font-medium">Tgl Faktur</th>
                      <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                      <th className="px-4 py-3 font-medium">Umur Faktur</th>
                      <th className="px-4 py-3 font-medium text-right">Sisa Tagihan</th>
                      <th className="px-4 py-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customerInvoices.map((inv) => {
                      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
                      const remaining = inv.totalAmount - totalPaid;
                      const today = new Date();
                      const dueDate = new Date(inv.dueDate);
                      const diffDays = differenceInDays(dueDate, today);
                      const isSelected = selectedIds.has(inv.id);

                      return (
                        <tr key={inv.id} className={cn("hover:bg-gray-50", isSelected && "bg-blue-50/50")}>
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={inv.status === "PAID"}
                              onClick={() => handleToggleSelect(inv.id)}
                              className={cn(
                                "text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed",
                                isSelected && "text-blue-600"
                              )}
                            >
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{format(new Date(inv.date), "dd MMM yyyy", { locale: id })}</td>
                          <td className="px-4 py-3">{format(new Date(inv.dueDate), "dd MMM yyyy", { locale: id })}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                diffDays < 0
                                  ? "bg-red-100 text-red-700"
                                  : diffDays <= 7
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-green-100 text-green-700"
                              )}
                            >
                              {diffDays < 0
                                ? `Lewat ${Math.abs(diffDays)} hari`
                                : `${diffDays} hari lagi`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(remaining)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              disabled={inv.status === "PAID"}
                              onClick={() => onPayFaktur && onPayFaktur(inv)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Bayar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
