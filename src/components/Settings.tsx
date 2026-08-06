import React, { useRef } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx-js-style";

interface SettingsProps {
  onRestore: (jsonData: string) => boolean;
  getBackupData: () => string;
}

export function Settings({ onRestore, getBackupData }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const data = getBackupData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_faktur_app_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupExcel = () => {
    try {
      const dataStr = getBackupData();
      const data = JSON.parse(dataStr);
      const wb = XLSX.utils.book_new();

      const customersAoa = [["id", "name", "phone", "address", "exportSeparateSheet"]];
      (data.customers || []).forEach((c: any) => {
        customersAoa.push([c.id, c.name, c.phone || "", c.address || "", c.exportSeparateSheet ? "true" : "false"]);
      });
      
      const invoicesAoa = [["id", "invoiceNumber", "customerName", "date", "dueDate", "totalAmount", "status"]];
      const paymentsAoa = [["id", "invoiceId", "date", "amount"]];
      
      (data.invoices || []).forEach((inv: any) => {
        invoicesAoa.push([inv.id, inv.invoiceNumber, inv.customerName, inv.date, inv.dueDate, inv.totalAmount, inv.status]);
        (inv.payments || []).forEach((p: any) => {
          paymentsAoa.push([p.id, inv.id, p.date, p.amount]);
        });
      });
      
      const wsCustomers = XLSX.utils.aoa_to_sheet(customersAoa);
      const wsInvoices = XLSX.utils.aoa_to_sheet(invoicesAoa);
      const wsPayments = XLSX.utils.aoa_to_sheet(paymentsAoa);
      
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");
      XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices");
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");
      
      XLSX.writeFile(wb, `backup_faktur_app_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat membackup ke Excel.");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (window.confirm("Restore data akan menimpa data saat ini. Lanjutkan?")) {
          const success = onRestore(content);
          if (success) {
            alert("Data berhasil dipulihkan!");
          } else {
            alert("Gagal memulihkan data. Format file tidak valid.");
          }
        }
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        
        const wsCustomers = wb.Sheets["Customers"];
        const wsInvoices = wb.Sheets["Invoices"];
        const wsPayments = wb.Sheets["Payments"];
        
        if (!wsCustomers || !wsInvoices) {
          alert("Format file Excel tidak valid. Sheet Customers atau Invoices tidak ditemukan.");
          return;
        }
        
        const customersRaw: any[] = XLSX.utils.sheet_to_json(wsCustomers);
        const invoicesRaw: any[] = XLSX.utils.sheet_to_json(wsInvoices);
        const paymentsRaw: any[] = wsPayments ? XLSX.utils.sheet_to_json(wsPayments) : [];
        
        const customers = customersRaw.map(c => ({
          id: String(c.id),
          name: String(c.name),
          phone: c.phone && c.phone !== "undefined" ? String(c.phone) : "",
          address: c.address && c.address !== "undefined" ? String(c.address) : "",
          exportSeparateSheet: c.exportSeparateSheet === "true" || c.exportSeparateSheet === true
        }));
        
        const paymentsMap: Record<string, any[]> = {};
        paymentsRaw.forEach(p => {
          const invId = String(p.invoiceId);
          if (!paymentsMap[invId]) paymentsMap[invId] = [];
          paymentsMap[invId].push({
            id: String(p.id),
            date: String(p.date),
            amount: Number(p.amount)
          });
        });
        
        const invoices = invoicesRaw.map(inv => ({
          id: String(inv.id),
          invoiceNumber: String(inv.invoiceNumber),
          customerName: String(inv.customerName),
          date: String(inv.date),
          dueDate: String(inv.dueDate),
          totalAmount: Number(inv.totalAmount),
          status: String(inv.status),
          payments: paymentsMap[String(inv.id)] || []
        }));
        
        const appData = { customers, invoices };
        
        if (window.confirm("Restore data dari Excel akan menimpa data saat ini. Lanjutkan?")) {
          const success = onRestore(JSON.stringify(appData));
          if (success) {
            alert("Data Excel berhasil dipulihkan!");
          } else {
            alert("Gagal memulihkan data. Format data tidak valid.");
          }
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat membaca file Excel.");
      }
      
      // Reset input
      if (fileInputExcelRef.current) {
        fileInputExcelRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pengaturan</h2>
        <p className="mt-1 text-sm text-gray-500">Kelola preferensi dan data aplikasi Anda.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Backup & Restore Data (JSON)</h3>
        <p className="mb-6 text-sm text-gray-600">
          Simpan data Anda dengan mengunduh file backup berformat JSON. Anda dapat mengembalikan data dari file backup kapan saja.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handleBackup}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={18} />
            Backup JSON
          </button>

          <div className="flex-1">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Upload size={18} />
              Restore JSON
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Backup & Restore Data (Excel)</h3>
        <p className="mb-6 text-sm text-gray-600">
          Anda juga dapat membackup data Anda menjadi file Excel, dan mengembalikannya lagi dari file Excel tersebut.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handleBackupExcel}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            Backup Excel
          </button>

          <div className="flex-1">
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputExcelRef}
              onChange={handleRestoreExcel}
              className="hidden"
            />
            <button
              onClick={() => fileInputExcelRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Upload size={18} />
              Restore Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
