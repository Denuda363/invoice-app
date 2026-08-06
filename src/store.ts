import { useState, useEffect } from "react";
import { Invoice, Payment, Customer, AppData } from "./types";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "faktur_app_data_v2";
const LEGACY_STORAGE_KEY = "faktur_app_data";

export function useAppStore() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse data from local storage", e);
      }
    }
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed)) {
          return { invoices: parsed, customers: [] };
        }
      } catch (e) {
        console.error("Failed to parse legacy data", e);
      }
    }
    return { invoices: [], customers: [] };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addInvoice = (
    invoiceNumber: string,
    customerName: string,
    date: string,
    dueDate: string,
    totalAmount: number
  ) => {
    const newInvoice: Invoice = {
      id: uuidv4(),
      invoiceNumber,
      customerName,
      date,
      dueDate,
      totalAmount,
      payments: [],
      status: "UNPAID",
    };
    setData((prev) => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
  };

  const addInvoices = (
    invoicesData: Omit<Invoice, "id" | "payments" | "status">[]
  ) => {
    const newInvoices: Invoice[] = invoicesData.map((inv) => ({
      ...inv,
      id: uuidv4(),
      payments: [],
      status: "UNPAID",
    }));
    setData((prev) => ({
      ...prev,
      invoices: [...prev.invoices, ...newInvoices],
    }));
  };

  const addBulkPayments = (payments: {invoiceId: string, amount: number, date: string}[]) => {
    setData((prev) => {
      let nextInvoices = [...prev.invoices];
      for (const p of payments) {
        nextInvoices = nextInvoices.map((inv) => {
          if (inv.id !== p.invoiceId) return inv;
          const newPayment: Payment = {
            id: uuidv4(),
            date: p.date,
            amount: p.amount,
          };
          const updatedPayments = [...inv.payments, newPayment];
          const totalPaid = updatedPayments.reduce((sum, pmt) => sum + pmt.amount, 0);
          let status: Invoice["status"] = "UNPAID";
          if (totalPaid >= inv.totalAmount) {
            status = "PAID";
          } else if (totalPaid > 0) {
            status = "PARTIAL";
          }
          return {
            ...inv,
            payments: updatedPayments,
            status,
          };
        });
      }
      return { ...prev, invoices: nextInvoices };
    });
  };

  const addPayment = (invoiceId: string, amount: number, date: string) => {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const newPayment: Payment = {
          id: uuidv4(),
          date,
          amount,
        };

        const updatedPayments = [...inv.payments, newPayment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

        let status: Invoice["status"] = "UNPAID";
        if (totalPaid >= inv.totalAmount) {
          status = "PAID";
        } else if (totalPaid > 0) {
          status = "PARTIAL";
        }

        return {
          ...inv,
          payments: updatedPayments,
          status,
        };
      }),
    }));
  };

  const editInvoice = (
    invoiceId: string,
    invoiceNumber: string,
    customerName: string,
    date: string,
    dueDate: string,
    totalAmount: number
  ) => {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        let status: Invoice["status"] = "UNPAID";
        if (totalPaid >= totalAmount) {
          status = "PAID";
        } else if (totalPaid > 0) {
          status = "PARTIAL";
        }

        return {
          ...inv,
          invoiceNumber,
          customerName,
          date,
          dueDate,
          totalAmount,
          status,
        };
      }),
    }));
  };

  const deleteInvoice = (invoiceId: string) => {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.filter((inv) => inv.id !== invoiceId),
    }));
  };

  const addCustomer = (name: string, phone?: string, address?: string, exportSeparateSheet?: boolean) => {
    const newCustomer: Customer = {
      id: uuidv4(),
      name,
      phone,
      address,
      exportSeparateSheet,
    };
    setData((prev) => ({ ...prev, customers: [...prev.customers, newCustomer] }));
  };

  const updateCustomer = (id: string, name: string, phone?: string, address?: string, exportSeparateSheet?: boolean) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === id ? { ...c, name, phone, address, exportSeparateSheet } : c
      ),
    }));
  };

  const deleteCustomer = (id: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  };

  const restoreData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && Array.isArray(parsed.invoices)) {
        setData({
          invoices: parsed.invoices,
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        });
        return true;
      }
    } catch (e) {
      console.error("Failed to restore data", e);
    }
    return false;
  };

  const getBackupData = () => JSON.stringify(data, null, 2);

  return {
    invoices: data.invoices,
    customers: data.customers,
    addInvoice,
    addInvoices,
    editInvoice,
    addPayment,
    addBulkPayments,
    deleteInvoice,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    restoreData,
    getBackupData,
  };
}
