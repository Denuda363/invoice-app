import React, { useState } from "react";
import { X, Trash2, Edit2, Save } from "lucide-react";
import { Invoice, Payment } from "../types";
import { formatCurrency, cn } from "../utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface PaymentHistoryModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onEditPayment: (invoiceId: string, paymentId: string, amount: number, date: string) => void;
  onDeletePayment: (invoiceId: string, paymentId: string) => void;
}

export function PaymentHistoryModal({ invoice, onClose, onEditPayment, onDeletePayment }: PaymentHistoryModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");

  if (!invoice) return null;

  const handleEditClick = (payment: Payment) => {
    setEditingId(payment.id);
    setEditAmount(payment.amount.toString());
    setEditDate(payment.date);
  };

  const handleSaveEdit = (paymentId: string) => {
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Masukkan jumlah pembayaran yang valid.");
      return;
    }
    onEditPayment(invoice.id, paymentId, numAmount, editDate);
    setEditingId(null);
  };

  const handleDeleteClick = (paymentId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pembayaran ini?")) {
      onDeletePayment(invoice.id, paymentId);
    }
  };

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.totalAmount - totalPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 sm:p-6 shadow-xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
            Riwayat Pembayaran
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 space-y-2 text-sm text-gray-600 shrink-0 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium text-gray-700">Faktur:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-medium text-gray-700">Konsumen:</span> {invoice.customerName}</p>
            </div>
            <div>
              <p><span className="font-medium text-gray-700">Total Tagihan:</span> {formatCurrency(invoice.totalAmount)}</p>
              <p><span className="font-medium text-gray-700">Sisa Tagihan:</span> <span className="font-semibold text-red-600">{formatCurrency(remaining)}</span></p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 border rounded-lg border-gray-200">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Nominal</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.payments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Belum ada riwayat pembayaran.
                  </td>
                </tr>
              ) : (
                invoice.payments.map((p) => {
                  const isEditing = editingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2 align-middle">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 align-middle text-right space-x-2">
                            <button
                              onClick={() => handleSaveEdit(p.id)}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Simpan"
                            >
                              <Save size={18} />
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
                          <td className="px-4 py-3">{format(new Date(p.date), "dd MMM yyyy", { locale: idLocale })}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(p.id)}
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
