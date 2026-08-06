import { useState, useEffect } from "react";
import { Invoice, Payment, Customer, AppData, DbMode } from "./types";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const STORAGE_KEY = "faktur_app_data_v2";
const LEGACY_STORAGE_KEY = "faktur_app_data";
const DB_MODE_KEY = "faktur_app_db_mode";

const INITIAL_DATA: AppData = { invoices: [], customers: [] };

export function useAppStore() {
  const [dbMode, setDbModeState] = useState<DbMode>(() => {
    return (localStorage.getItem(DB_MODE_KEY) as DbMode) || "LOCAL";
  });
  
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
    return INITIAL_DATA;
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Sync state to current DB mode
  useEffect(() => {
    let unsubscribe: () => void;
    
    if (dbMode === "FIREBASE") {
      setIsLoading(true);
      const docRef = doc(db, "appData", "main");
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as AppData;
          setData({
            invoices: remoteData.invoices || [],
            customers: remoteData.customers || []
          });
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Firestore sync error:", error);
        setIsLoading(false);
      });
    } else {
      // LOCAL mode, load from localStorage is already done in useState, but if we switch modes:
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setData(JSON.parse(saved));
        } catch (e) { }
      }
      setIsLoading(false);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dbMode]);

  // Persist local mutations
  const mutateData = (mutator: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = mutator(prev);
      
      // Save to localStorage regardless of mode (as backup)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      
      // Save to Firebase if active
      if (dbMode === "FIREBASE") {
        setDoc(doc(db, "appData", "main"), next).catch(e => {
          console.error("Error saving to Firestore", e);
        });
      }
      return next;
    });
  };

  const setDbMode = async (mode: DbMode) => {
    setDbModeState(mode);
    localStorage.setItem(DB_MODE_KEY, mode);
  };

  const migrateLocalToFirebase = async () => {
    setIsLoading(true);
    try {
      const localDataStr = localStorage.getItem(STORAGE_KEY);
      const localData = localDataStr ? JSON.parse(localDataStr) : { invoices: [], customers: [] };
      await setDoc(doc(db, "appData", "main"), localData);
      alert("Migrasi dari Local ke Firebase berhasil!");
    } catch (e) {
      console.error(e);
      alert("Gagal migrasi ke Firebase.");
    }
    setIsLoading(false);
  };

  const migrateFirebaseToLocal = async () => {
    setIsLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "appData", "main"));
      if (docSnap.exists()) {
        const remoteData = docSnap.data();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
        if (dbMode === "LOCAL") {
          setData({
             invoices: remoteData.invoices || [],
             customers: remoteData.customers || []
          });
        }
        alert("Migrasi dari Firebase ke Local berhasil!");
      } else {
        alert("Tidak ada data di Firebase untuk di-migrate.");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal migrasi ke Local.");
    }
    setIsLoading(false);
  };

  const resetData = () => {
    mutateData(() => INITIAL_DATA);
  };

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
    mutateData((prev) => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
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
    mutateData((prev) => ({
      ...prev,
      invoices: [...prev.invoices, ...newInvoices],
    }));
  };

  const addBulkPayments = (payments: {invoiceId: string, amount: number, date: string}[]) => {
    mutateData((prev) => {
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
    mutateData((prev) => ({
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
    mutateData((prev) => ({
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
    mutateData((prev) => ({
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
    mutateData((prev) => ({ ...prev, customers: [...prev.customers, newCustomer] }));
  };

  const updateCustomer = (id: string, name: string, phone?: string, address?: string, exportSeparateSheet?: boolean) => {
    mutateData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === id ? { ...c, name, phone, address, exportSeparateSheet } : c
      ),
    }));
  };

  const deleteCustomer = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  };

  const restoreData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && Array.isArray(parsed.invoices)) {
        mutateData(() => ({
          invoices: parsed.invoices,
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        }));
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
    dbMode,
    isLoading,
    setDbMode,
    migrateLocalToFirebase,
    migrateFirebaseToLocal,
    resetData,
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
