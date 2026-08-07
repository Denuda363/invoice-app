import React, { useState } from "react";
import { Customer } from "../types";
import { Users, Plus, Edit2, Trash2, X, Upload, FileDown, RefreshCcw } from "lucide-react";
import * as XLSX from "xlsx-js-style";

interface CustomersProps {
  customers: Customer[];
  onAdd: (name: string, phone?: string, address?: string, exportSeparateSheet?: boolean) => void;
  onAddBulk?: (customers: Omit<Customer, "id">[]) => void;
  onUpdate: (id: string, name: string, phone?: string, address?: string, exportSeparateSheet?: boolean) => void;
  onDelete: (id: string) => void;
  onSyncFromInvoices?: () => void;
}

export function Customers({ customers, onAdd, onAddBulk, onUpdate, onDelete, onSyncFromInvoices }: CustomersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", exportSeparateSheet: false });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || "",
        address: customer.address || "",
        exportSeparateSheet: customer.exportSeparateSheet || false,
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", address: "", exportSeparateSheet: false });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCustomer) {
      onUpdate(editingCustomer.id, formData.name, formData.phone, formData.address, formData.exportSeparateSheet);
    } else {
      onAdd(formData.name, formData.phone, formData.address, formData.exportSeparateSheet);
    }
    closeModal();
  };

  const downloadTemplate = () => {
    const aoa = [
      ["NAMA KONSUMEN", "NO HP", "ALAMAT", "PISAH SHEET (TRUE/FALSE)"],
      ["CV Bintang Terang", "08123456789", "Jl. Raya Cikarang No 1", "TRUE"],
      ["Toko Makmur", "08198765432", "Pasar Induk", "FALSE"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Konsumen");
    XLSX.writeFile(wb, "Template_Import_Konsumen.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        
        // Skip header
        const rows = jsonData.slice(1);
        const newCustomers: Omit<Customer, "id">[] = [];
        let skipped = 0;

        rows.forEach(row => {
          if (!row || row.length === 0) return;
          const name = (row[0] || "").toString().trim();
          if (!name) return; // name is required
          
          // Check if already exists in the current list
          const exists = customers.some(c => c.name.toLowerCase() === name.toLowerCase());
          if (exists) {
            skipped++;
            return;
          }

          const phone = (row[1] || "").toString().trim();
          const address = (row[2] || "").toString().trim();
          const exportSeparateStr = (row[3] || "").toString().trim().toUpperCase();
          const exportSeparateSheet = exportSeparateStr === "TRUE";

          newCustomers.push({
            name,
            phone,
            address,
            exportSeparateSheet
          });
        });

        if (newCustomers.length > 0) {
          if (onAddBulk) {
            onAddBulk(newCustomers);
            alert(`Berhasil mengimpor ${newCustomers.length} konsumen baru. ${skipped > 0 ? `(${skipped} konsumen dilewati karena nama sudah ada)` : ""}`);
          } else {
             // Fallback to adding one by one if onAddBulk is somehow not provided
             newCustomers.forEach(c => onAdd(c.name, c.phone, c.address, c.exportSeparateSheet));
             alert(`Berhasil mengimpor ${newCustomers.length} konsumen baru. ${skipped > 0 ? `(${skipped} konsumen dilewati karena nama sudah ada)` : ""}`);
          }
        } else {
          alert(skipped > 0 ? `Semua konsumen dalam file sudah ada di sistem (${skipped} dilewati).` : "Tidak ada data konsumen valid ditemukan.");
        }
      } catch (err) {
        console.error(err);
        alert("Gagal membaca file Excel.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Konsumen</h2>
          <p className="mt-1 text-sm text-gray-500">Kelola master data pelanggan Anda.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
          >
            <FileDown size={18} />
            Template
          </button>
          <div>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Upload size={18} />
              Import
            </button>
          </div>
          {onSyncFromInvoices && (
            <button
              onClick={onSyncFromInvoices}
              className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <RefreshCcw size={18} />
              Sync dari Faktur
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Tambah Konsumen
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nama Konsumen</th>
                <th className="px-4 py-3 font-medium">Nomor Telepon</th>
                <th className="px-4 py-3 font-medium">Alamat</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users size={40} className="mb-3 text-gray-300" />
                      <p>Belum ada data konsumen.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-4">{c.phone || "-"}</td>
                    <td className="px-4 py-4">{c.address || "-"}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(c)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Apakah Anda yakin ingin menghapus konsumen ini?")) {
                              onDelete(c.id);
                            }
                          }}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCustomer ? "Edit Konsumen" : "Tambah Konsumen"}
              </h2>
              <button onClick={closeModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama Konsumen *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nomor Telepon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Alamat</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exportSeparateSheet"
                  checked={formData.exportSeparateSheet}
                  onChange={(e) => setFormData({ ...formData, exportSeparateSheet: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="exportSeparateSheet" className="text-sm font-medium text-gray-700">
                  Rekap di sheet terpisah saat export laporan
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
