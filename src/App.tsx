import React, { useState } from "react";
import { useAppStore } from "./store";
import { ViewState, Invoice } from "./types";
import { Dashboard } from "./components/Dashboard";
import { InvoiceHistory } from "./components/InvoiceHistory";
import { BulkInputFaktur } from "./components/BulkInputFaktur";
import { Reports } from "./components/Reports";
import { Customers } from "./components/Customers";
import { Settings } from "./components/Settings";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentHistoryModal } from "./components/PaymentHistoryModal";
import {
  LayoutDashboard,
  FilePlus,
  Files,
  PieChart,
  FileText,
  Menu,
  X,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "./utils";

export default function App() {
  const store = useAppStore();
  const [view, setView] = useState<ViewState>("DASHBOARD");
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", id: "DASHBOARD" as ViewState, icon: LayoutDashboard },
    { name: "Input Faktur", id: "BULK_INPUT_INVOICE" as ViewState, icon: FilePlus },
    { name: "Riwayat Faktur", id: "INVOICE_HISTORY" as ViewState, icon: Files },
    { name: "Data Konsumen", id: "CUSTOMERS" as ViewState, icon: Users },
    { name: "Laporan Jatuh Tempo", id: "REPORTS" as ViewState, icon: PieChart },
    { name: "Pengaturan", id: "SETTINGS" as ViewState, icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center">
          <FileText className="text-blue-600 mr-2" size={24} />
          <h1 className="font-bold text-lg text-gray-800 line-clamp-1">Data invoice Apt Assyifa Farma Cideres</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileText className="text-blue-600 mr-2 min-w-[24px]" size={24} />
            <h1 className="font-bold text-sm text-gray-800 hidden md:block line-clamp-2">Data invoice Apt Assyifa Farma Cideres</h1>
            <h1 className="font-bold text-lg text-gray-800 md:hidden">Menu</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                view === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon size={18} className={view === item.id ? "text-blue-700" : "text-gray-400"} />
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
          {view === "DASHBOARD" && (
            <Dashboard
              invoices={store.invoices}
              onAddFaktur={() => setView("BULK_INPUT_INVOICE")}
            />
          )}

          {view === "INVOICE_HISTORY" && (
            <InvoiceHistory
              invoices={store.invoices}
              customers={store.customers}
              onDelete={store.deleteInvoice}
              onViewHistory={(invoice) => setHistoryInvoice(invoice)}
              onEdit={store.editInvoice}
            />
          )}

          {view === "BULK_INPUT_INVOICE" && (
            <BulkInputFaktur
              customers={store.customers}
              existingInvoiceNumbers={store.invoices.map(i => i.invoiceNumber.toLowerCase())}
              onSave={(invoices) => {
                store.addInvoices(invoices);
                setView("DASHBOARD");
              }}
              onCancel={() => setView("DASHBOARD")}
            />
          )}

          {view === "CUSTOMERS" && (
            <Customers
              customers={store.customers}
              onAdd={store.addCustomer}
              onAddBulk={store.addCustomers}
              onUpdate={store.updateCustomer}
              onDelete={store.deleteCustomer}
              onSyncFromInvoices={store.syncCustomersFromInvoices}
            />
          )}

          {view === "REPORTS" && (
            <Reports
              invoices={store.invoices}
              customers={store.customers}
              onPayFaktur={(invoice) => setPaymentInvoice(invoice)}
              onBulkPay={(payments) => store.addBulkPayments(payments)}
            />
          )}

          {view === "SETTINGS" && (
            <Settings
              onRestore={store.restoreData}
              getBackupData={store.getBackupData}
              dbMode={store.dbMode}
              setDbMode={store.setDbMode}
              migrateLocalToFirebase={store.migrateLocalToFirebase}
              migrateFirebaseToLocal={store.migrateFirebaseToLocal}
              resetData={store.resetData}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSave={store.addPayment}
        />
      )}
      
      {historyInvoice && (
        <PaymentHistoryModal
          invoice={store.invoices.find(i => i.id === historyInvoice.id) || null}
          onClose={() => setHistoryInvoice(null)}
          onEditPayment={store.editPayment}
          onDeletePayment={store.deletePayment}
        />
      )}
    </div>
  );
}
