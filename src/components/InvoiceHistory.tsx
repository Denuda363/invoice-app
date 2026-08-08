import React, { useState } from "react";
import { Invoice, Customer } from "../types";
import { formatCurrency } from "../utils";
import { Search, Edit2, Trash2, X, Check, Eye, List } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { CustomerSelect } from "./CustomerSelect";

interface InvoiceHistoryProps {
  invoices: Invoice[];
  customers: Customer[];
  onDelete: (id: string) => void;
  onViewHistory?: (invoice: Invoice) => void;
  onEdit: (
    id: string,
    invoiceNumber: string,
    customerName: string,
    date: string,
    dueDate: string,
    totalAmount: number
  ) => void;
}

export function InvoiceHistory({
  invoices,
  customers,
  onDelete,
  onViewHistory,
  onEdit,
}: InvoiceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit state
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState<number | "">("");

  const filteredInvoices = invoices
    .filter(
      (inv) =>
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleEditClick = (inv: Invoice) => {
    setEditingId(inv.id);
    setEditInvoiceNumber(inv.invoiceNumber);
    setEditCustomerName(inv.customerName);
    setEditDate(inv.date);
    setEditDueDate(inv.dueDate);
    setEditTotalAmount(inv.totalAmount);
  };

  const handleSaveEdit = (id: string) => {
    if (!editInvoiceNumber || !editCustomerName || !editDate || !editDueDate || editTotalAmount === "") {
      alert("Harap isi semua bidang");
      return;
    }

    let finalInvoiceNumber = editInvoiceNumber;
    const duplicate = invoices.find(
      (inv) => inv.id !== id && inv.invoiceNumber.toLowerCase() === finalInvoiceNumber.toLowerCase()
    );
    if (duplicate) {
      const generateNew = window.confirm(`No faktur ${finalInvoiceNumber} sudah digunakan. Buatkan no faktur otomatis yang berbeda?`);
      if (!generateNew) {
        return;
      }
      
      const existingNumbers = new Set(invoices.map(inv => inv.id !== id ? inv.invoiceNumber.toLowerCase() : ""));
      let counter = 1;
      while (existingNumbers.has(finalInvoiceNumber.toLowerCase())) {
        finalInvoiceNumber = `${editInvoiceNumber}-${counter}`;
        counter++;
      }
    }

    onEdit(
      id,
      finalInvoiceNumber,
      editCustomerName,
      editDate,
      editDueDate,
      Number(editTotalAmount)
    );
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus faktur ini?")) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Faktur</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola dan edit faktur yang telah diinput.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 w-full sm:w-64">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari faktur / konsumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">No. Faktur</th>
                <th className="px-4 py-3 font-medium">Konsumen</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                <th className="px-4 py-3 font-medium">Total (Rp)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada faktur yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isEditing = editingId === inv.id;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2 align-top">
                            <input
                              type="text"
                              value={editInvoiceNumber}
                              onChange={(e) => setEditInvoiceNumber(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-top">
                            <CustomerSelect
                              customers={customers}
                              value={editCustomerName}
                              onChange={setEditCustomerName}
                              required
                            />
                          </td>
                          <td className="px-4 py-2 align-top">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-top">
                            <input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-top">
                            <input
                              type="number"
                              min="0"
                              value={editTotalAmount}
                              onChange={(e) => setEditTotalAmount(e.target.value ? Number(e.target.value) : "")}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-top">
                             <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                inv.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : inv.status === "PARTIAL"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {inv.status === "PAID"
                                  ? "LUNAS"
                                  : inv.status === "PARTIAL"
                                  ? "SEBAGIAN"
                                  : "BELUM BAYAR"}
                              </span>
                          </td>
                          <td className="px-4 py-2 align-top text-right space-x-2">
                            <button
                              onClick={() => handleSaveEdit(inv.id)}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Simpan"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded p-1 text-gray-500 hover:bg-gray-100"
                              title="Batal"
                            >
                              <X size={18} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{inv.customerName}</td>
                          <td className="px-4 py-3">{format(new Date(inv.date), "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3">
                            <div>{format(new Date(inv.dueDate), "dd/MM/yyyy")}</div>
                            {differenceInDays(new Date(inv.dueDate), new Date()) < 0 && inv.status !== "PAID" && (
                              <span className="text-xs text-red-600 font-medium">Lewat waktu</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(inv.totalAmount)}</td>
                          <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                inv.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : inv.status === "PARTIAL"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {inv.status === "PAID"
                                  ? "LUNAS"
                                  : inv.status === "PARTIAL"
                                  ? "SEBAGIAN"
                                  : "BELUM BAYAR"}
                              </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            {onViewHistory && inv.payments.length > 0 && (
                              <button
                                onClick={() => onViewHistory(inv)}
                                className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
                                title="Riwayat Pembayaran"
                              >
                                <List size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditClick(inv)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
