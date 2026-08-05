import React, { useId } from "react";
import { Customer } from "../types";

interface CustomerSelectProps {
  customers: Customer[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function CustomerSelect({ customers, value, onChange, required }: CustomerSelectProps) {
  const listId = useId();

  return (
    <div className="w-full">
      <input
        type="text"
        required={required}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ketik atau pilih konsumen..."
        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
      />
      <datalist id={listId}>
        {customers.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </div>
  );
}
