"use client";

import { useState, useEffect } from "react";
import { getJobQC, saveJobQC, type JobCardQC } from "@/services/jobcard.api";
import { CheckCircle2, Circle, Save } from "lucide-react";

interface QCChecklistProps {
  jobId: string;
  onComplete?: () => void;
}

export function QCChecklist({ jobId, onComplete }: QCChecklistProps) {
  const [qc, setQC] = useState<Partial<JobCardQC>>({
    cameraWorking: false,
    micWorking: false,
    speakerWorking: false,
    chargingWorking: false,
    wifiWorking: false,
    returnedCharger: false,
    returnedSimTray: false,
    returnedMemoryCard: false,
    technicianNotes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getJobQC(jobId)
      .then((data) => {
        if (data) setQC(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [jobId]);

  const toggle = (field: keyof JobCardQC) => {
    setQC((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveJobQC(jobId, qc);
      if (onComplete) onComplete();
      alert("QC Checklist saved successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save QC");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading checklist...</div>;

  const checks = [
    { label: "Camera Functionality", field: "cameraWorking" as keyof JobCardQC },
    { label: "Microphone & Call Quality", field: "micWorking" as keyof JobCardQC },
    { label: "Speaker & Audio", field: "speakerWorking" as keyof JobCardQC },
    { label: "Charging Port & Logic", field: "chargingWorking" as keyof JobCardQC },
    { label: "WiFi & Bluetooth", field: "wifiWorking" as keyof JobCardQC },
  ];

  const accessories = [
    { label: "Charger/Cable Returned", field: "returnedCharger" as keyof JobCardQC },
    { label: "SIM Tray Present", field: "returnedSimTray" as keyof JobCardQC },
    { label: "Memory Card Present", field: "returnedMemoryCard" as keyof JobCardQC },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-teal-600 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>✅</span> Quality Control Checklist
        </h2>
        <p className="text-teal-100 text-xs mt-1 uppercase tracking-wider font-semibold">
          Pre-delivery verification
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Functional Checks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checks.map((item) => (
              <button
                key={item.field}
                onClick={() => toggle(item.field)}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  qc[item.field]
                    ? "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-300"
                    : "bg-gray-50 border-gray-100 text-gray-600 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400 hover:border-teal-300"
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                {qc[item.field] ? <CheckCircle2 size={18} className="text-teal-600" /> : <Circle size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Customer Belongings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {accessories.map((item) => (
              <button
                key={item.field}
                onClick={() => toggle(item.field)}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  qc[item.field]
                    ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300"
                    : "bg-gray-50 border-gray-100 text-gray-600 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400 hover:border-indigo-300"
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                {qc[item.field] ? <CheckCircle2 size={18} className="text-indigo-600" /> : <Circle size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Internal Repair Notes (Private)</label>
          <textarea
            value={qc.technicianNotes || ""}
            onChange={(e) => setQC(prev => ({ ...prev, technicianNotes: e.target.value }))}
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            rows={3}
            placeholder="Document any minor issues or final repair details..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          {isSaving ? "Saving..." : <><Save size={20} /> Save & Validate Checklist</>}
        </button>
      </div>
    </div>
  );
}
