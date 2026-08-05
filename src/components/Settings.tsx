import React, { useRef } from "react";
import { Download, Upload } from "lucide-react";

interface SettingsProps {
  onRestore: (jsonData: string) => boolean;
  getBackupData: () => string;
}

export function Settings({ onRestore, getBackupData }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pengaturan</h2>
        <p className="mt-1 text-sm text-gray-500">Kelola preferensi dan data aplikasi Anda.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Backup & Restore Data</h3>
        <p className="mb-6 text-sm text-gray-600">
          Simpan data Anda dengan mengunduh file backup. Anda dapat mengembalikan data dari file backup kapan saja.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handleBackup}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={18} />
            Backup Data (JSON)
          </button>

          <div>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto sm:flex-1"
            >
              <Upload size={18} />
              Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
