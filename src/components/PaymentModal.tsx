import React, { useState } from "react";
import { X } from "lucide-react";
import { Invoice } from "../types";
import { formatCurrency } from "../utils";

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (invoiceId: string, amount: number, date: string) => void;
}

export function PaymentModal({ invoice, onClose, onSave }: PaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  if (!invoice) return null;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.totalAmount - totalPaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Masukkan jumlah pembayaran yang valid.");
      return;
    }
    if (numAmount > remaining) {
      alert("Jumlah pembayaran melebihi sisa tagihan.");
      return;
    }
    onSave(invoice.id, numAmount, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Pembayaran Tagihan
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Faktur:</span>{" "}
            {invoice.invoiceNumber}
          </p>
          <p>
            <span className="font-medium text-gray-700">Konsumen:</span>{" "}
            {invoice.customerName}
          </p>
          <p>
            <span className="font-medium text-gray-700">Sisa Tagihan:</span>{" "}
            <span className="font-semibold text-red-600">
              {formatCurrency(remaining)}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tanggal Pembayaran
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jumlah Bayar (Rp)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="1"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 1500000"
                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setAmount(remaining.toString())}
                className="shrink-0 rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-200"
              >
                Lunasi Full
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
