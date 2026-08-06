export interface Payment {
  id: string;
  date: string;
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  exportSeparateSheet?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  payments: Payment[];
  status: "UNPAID" | "PARTIAL" | "PAID";
}

export interface AppData {
  invoices: Invoice[];
  customers: Customer[];
}

export type ViewState = "DASHBOARD" | "INVOICE_HISTORY" | "BULK_INPUT_INVOICE" | "REPORTS" | "CUSTOMERS" | "SETTINGS";
