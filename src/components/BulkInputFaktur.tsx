import React, { useState } from "react";
import { Customer, Invoice } from "../types";
import { formatCurrency } from "../utils";
import { Plus, Trash2, UserPlus, FileDown, Upload } from "lucide-react";
import { addDays, format, differenceInDays } from "date-fns";
import { CustomerSelect } from "./CustomerSelect";
import * as XLSX from "xlsx";

interface BulkInputFakturProps {
  customers: Customer[];
  onSave: (invoices: Omit<Invoice, "id" | "payments" | "status">[]) => void;
  onCancel: () => void;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  date: string;
  termDays: number | "";
  dueDate: string;
  totalAmount: string;
}

interface InvoiceGroup {
  id: string;
  customerName: string;
  rows: InvoiceRow[];
}

export function BulkInputFaktur({ customers, onSave, onCancel }: BulkInputFakturProps) {
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  const createEmptyRow = (): InvoiceRow => {
    const today = new Date();
    return {
      id: crypto.randomUUID(),
      invoiceNumber: "",
      date: format(today, "yyyy-MM-dd"),
      termDays: 30,
      dueDate: format(addDays(today, 30), "yyyy-MM-dd"),
      totalAmount: "",
    };
  };

  const createEmptyGroup = (): InvoiceGroup => ({
    id: crypto.randomUUID(),
    customerName: "",
    rows: [createEmptyRow(), createEmptyRow()],
  });

  const [groups, setGroups] = useState<InvoiceGroup[]>([createEmptyGroup()]);

  const updateGroupCustomer = (groupId: string, val: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, customerName: val } : g))
    );
  };

  const updateRow = (groupId: string, rowId: string, field: keyof InvoiceRow, value: string | number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        
        const newRows = g.rows.map((row) => {
          if (row.id !== rowId) return row;

          const newRow = { ...row, [field]: value };

          // Handle date/term dependencies
          if (field === "date" || field === "termDays") {
            if (newRow.date && typeof newRow.termDays === "number") {
              newRow.dueDate = format(addDays(new Date(newRow.date), newRow.termDays), "yyyy-MM-dd");
            }
          } else if (field === "dueDate") {
            if (newRow.date && newRow.dueDate) {
              const diff = differenceInDays(new Date(newRow.dueDate), new Date(newRow.date));
              newRow.termDays = diff >= 0 ? diff : "";
            }
          }

          return newRow;
        });

        return { ...g, rows: newRows };
      })
    );
  };

  const addRowToGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, rows: [...g.rows, createEmptyRow()] } : g))
    );
  };

  const removeRowFromGroup = (groupId: string, rowId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.rows.length <= 1) return g; // keep at least one row
        return { ...g, rows: g.rows.filter((r) => r.id !== rowId) };
      })
    );
  };

  const addGroup = () => {
    setGroups((prev) => [...prev, createEmptyGroup()]);
  };

  const removeGroup = (groupId: string) => {
    if (groups.length > 1) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    }
  };

  const downloadTemplate = () => {
    const aoa = [
      ["KONSUMEN", "NO FAKTUR", "TANGGAL FAKTUR", "TERMIN (HARI)", "TOTAL TAGIHAN"],
      ["BD DIAN JATITUJUH", "INV-1001", format(new Date(), "yyyy-MM-dd"), "30", "500000"],
      ["BD DIAN JATITUJUH", "INV-1002", format(new Date(), "yyyy-MM-dd"), "30", "750000"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Faktur");
    XLSX.writeFile(wb, "Template_Import_Faktur.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        // Skip header row
        const rows = jsonData.slice(1);
        
        const errors: string[] = [];
        const groupsByCustomer: Record<string, InvoiceRow[]> = {};
        
        rows.forEach((row, index) => {
          if (!row || row.length === 0) return; // skip completely empty rows

          const rowIndex = index + 2; // row 1 is header, so data starts at row 2 in Excel
          const custName = (row[0] || "").toString().trim();
          const invNum = (row[1] || "").toString().trim();
          
          let dateStr = row[2];
          if (dateStr === undefined || dateStr === null || dateStr === "") {
             dateStr = format(new Date(), "yyyy-MM-dd");
          } else if (typeof dateStr === "number") {
             const d = new Date((dateStr - (25567 + 1)) * 86400 * 1000);
             dateStr = format(d, "yyyy-MM-dd");
          } else {
             // Try to parse string date just in case
             dateStr = String(dateStr);
          }
          
          let termRaw = row[3];
          let term = 30;
          if (termRaw !== undefined && termRaw !== null && termRaw !== "") {
             term = parseInt(String(termRaw), 10);
             if (isNaN(term)) term = 30;
          }

          const amountRaw = row[4];
          let amount = "";
          if (amountRaw !== undefined && amountRaw !== null && amountRaw !== "") {
             amount = amountRaw.toString().trim();
          }

          let rowHasErrors = false;
          let rowErrors: string[] = [];
          
          if (!custName) rowErrors.push("Konsumen kosong");
          if (!invNum) rowErrors.push("No Faktur kosong");
          if (!amount) rowErrors.push("Total Tagihan kosong");
          else if (isNaN(parseFloat(amount))) rowErrors.push("Total Tagihan bukan angka");

          if (rowErrors.length > 0) {
            errors.push(`Baris ${rowIndex}: ${rowErrors.join(", ")}`);
            rowHasErrors = true;
          }

          if (!rowHasErrors) {
            if (!groupsByCustomer[custName]) {
              groupsByCustomer[custName] = [];
            }
            groupsByCustomer[custName].push({
              id: crypto.randomUUID(),
              invoiceNumber: invNum,
              date: dateStr,
              termDays: term,
              dueDate: format(addDays(new Date(dateStr), term), "yyyy-MM-dd"),
              totalAmount: amount.toString(),
            });
          }
        });

        if (errors.length > 0) {
           setImportErrors(errors);
        }

        const newGroups = Object.entries(groupsByCustomer).map(([custName, custRows]) => ({
          id: crypto.randomUUID(),
          customerName: custName,
          rows: custRows,
        }));

        if (newGroups.length > 0) {
          setGroups((prev) => {
             const isEmpty = prev.length === 1 && prev[0].customerName === "" && prev[0].rows.length === 2 && prev[0].rows[0].invoiceNumber === "";
             return isEmpty ? newGroups : [...prev, ...newGroups];
          });
        } else if (errors.length === 0) {
          alert("Tidak ada data valid di file Excel.");
        }
      } catch (err) {
        console.error("Error reading file", err);
        alert("Gagal membaca file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let allValidRows: (Omit<Invoice, "id" | "payments" | "status">)[] = [];

    for (const group of groups) {
      const validRows = group.rows.filter(
        (r) => r.invoiceNumber && group.customerName && r.date && r.dueDate && r.totalAmount
      );

      const processedInvoices = validRows.map((r) => {
        const amount = parseFloat(r.totalAmount);
        return {
          invoiceNumber: r.invoiceNumber,
          customerName: group.customerName.trim(),
          date: r.date,
          dueDate: r.dueDate,
          totalAmount: isNaN(amount) ? 0 : amount,
        };
      });

      allValidRows = [...allValidRows, ...processedInvoices];
    }

    if (allValidRows.length === 0) {
      alert("Harap isi setidaknya satu baris faktur dengan lengkap (termasuk nama konsumen).");
      return;
    }

    if (allValidRows.some((inv) => inv.totalAmount <= 0)) {
      alert("Terdapat tagihan dengan nilai tidak valid.");
      return;
    }

    onSave(allValidRows);
  };

  return (
    <div className="mx-auto w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Input Banyak Faktur</h2>
          <p className="text-sm text-gray-500 mt-1">Masukkan beberapa faktur sekaligus, dikelompokkan per konsumen.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileDown size={18} />
            Download Template
          </button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Import Data dari Excel"
            />
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Upload size={18} />
              Import Excel
            </button>
          </div>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          <p className="font-semibold mb-2">Terdapat {importErrors.length} kesalahan saat import data:</p>
          <ul className="list-disc pl-5 space-y-1">
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {groups.map((group, groupIndex) => (
            <div key={group.id} className="rounded-xl border border-gray-200 p-4 sm:p-6 bg-gray-50/50">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Konsumen {groupIndex + 1} *
                  </label>
                  <CustomerSelect
                    customers={customers}
                    value={group.customerName}
                    onChange={(val) => updateGroupCustomer(group.id, val)}
                    required={groupIndex === 0}
                  />
                </div>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    className="flex items-center gap-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 self-start sm:self-end mt-2 sm:mt-0"
                  >
                    <Trash2 size={16} />
                    Hapus Konsumen
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 font-medium">No. Faktur *</th>
                      <th className="px-3 py-3 font-medium w-36">Tgl Faktur *</th>
                      <th className="px-3 py-3 font-medium w-24">Termin</th>
                      <th className="px-3 py-3 font-medium w-36">Jatuh Tempo *</th>
                      <th className="px-3 py-3 font-medium">Total Tagihan (Rp) *</th>
                      <th className="px-3 py-3 font-medium w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.rows.map((row, rowIndex) => (
                      <tr key={row.id}>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            required={groupIndex === 0 && rowIndex === 0}
                            value={row.invoiceNumber}
                            onChange={(e) => updateRow(group.id, row.id, "invoiceNumber", e.target.value)}
                            placeholder="INV-..."
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="date"
                            required={groupIndex === 0 && rowIndex === 0}
                            value={row.date}
                            onChange={(e) => updateRow(group.id, row.id, "date", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="0"
                            value={row.termDays}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                              updateRow(group.id, row.id, "termDays", val);
                            }}
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="date"
                            required={groupIndex === 0 && rowIndex === 0}
                            value={row.dueDate}
                            onChange={(e) => updateRow(group.id, row.id, "dueDate", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="1"
                            required={groupIndex === 0 && rowIndex === 0}
                            value={row.totalAmount}
                            onChange={(e) => updateRow(group.id, row.id, "totalAmount", e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-3 text-center">
                          {group.rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRowFromGroup(group.id, row.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => addRowToGroup(group.id)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Tambah Baris Faktur untuk Konsumen Ini
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 w-full justify-center transition-colors"
          >
            <UserPlus size={18} />
            Input Konsumen Baru
          </button>
        </div>

        <div className="mt-8 flex items-center justify-end gap-4 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Simpan Semua Faktur
          </button>
        </div>
      </form>
    </div>
  );
}
