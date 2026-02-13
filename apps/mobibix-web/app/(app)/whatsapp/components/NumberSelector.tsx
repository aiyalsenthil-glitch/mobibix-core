"use client";

import { useWhatsAppNumber } from "@/context/WhatsAppNumberContext";

export function NumberSelector() {
  const {
    numbers,
    selectedNumberId,
    selectedNumber,
    setSelectedNumberId,
    isLoading,
    error,
  } = useWhatsAppNumber();

  if (isLoading) {
    return <div className="text-xs text-slate-500">Loading numbers...</div>;
  }

  if (error) {
    return <div className="text-xs text-red-500">{error}</div>;
  }

  if (numbers.length === 0) {
    return <div className="text-xs text-slate-500">No WhatsApp numbers</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="text-xs border-slate-200 rounded-md py-1 pr-6 pl-2 bg-white focus:ring-teal-500 focus:border-teal-500"
        value={selectedNumberId}
        onChange={(e) => setSelectedNumberId(e.target.value)}
      >
        {numbers.length > 1 && <option value="ALL">All Numbers</option>}
        {numbers.map((num) => (
          <option key={num.id} value={num.id}>
            {num.label || num.displayNumber || num.phoneNumber}
          </option>
        ))}
      </select>
      <span className="text-[10px] uppercase tracking-widest text-slate-500">
        {selectedNumber ? "Active" : "All"}
      </span>
    </div>
  );
}
