import { useState, useEffect } from "react";
import { JobCard, RepairBillDto } from "@/services/jobcard.api";

interface RepairBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RepairBillDto) => Promise<void>;
  job: JobCard;
  shopId: string;
}

export function RepairBillingModal({
  isOpen,
  onClose,
  onSubmit,
  job,
  shopId,
}: RepairBillingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [billingMode, setBillingMode] = useState<"WITH_GST" | "WITHOUT_GST">("WITHOUT_GST");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [serviceDescription, setServiceDescription] = useState("Repair Charges");
  const [serviceAmount, setServiceAmount] = useState<number>(0);
  const [serviceGstRate, setServiceGstRate] = useState<number>(18); // Default 18%
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);

  // Helper for currency format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
  };

  // Initialize service charge
  useEffect(() => {
    if (isOpen && job) {
        const partsCost = job.parts?.reduce((sum, p) => sum + (p.product?.salePrice || 0) * p.quantity, 0) || 0;
        const partsTotalRupees = (partsCost / 100);
        const estimatedTotal = job.estimatedCost || 0;
        
        // Ensure diagnosticCharge is treated as 0 if undefined
        const diagCharge = job.diagnosticCharge || 0;

        let initialService = Math.max(0, estimatedTotal - partsTotalRupees);
        if (diagCharge > 0) {
            initialService = Math.max(initialService, diagCharge);
        }
        
        setServiceAmount(initialService);
    }
  }, [isOpen, job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dto: RepairBillDto = {
        shopId,
        jobCardId: job.id,
        billingMode,
        paymentMode,
        pricesIncludeTax,
        services: [
            {
                description: serviceDescription,
                amount: serviceAmount,
                gstRate: billingMode === "WITH_GST" ? serviceGstRate : 0
            }
        ],
        parts: job.parts?.map(p => ({
            shopProductId: p.shopProductId,
            quantity: p.quantity,
            rate: (p.product?.salePrice || 0) / 100,
            gstRate: billingMode === "WITH_GST" ? (p.product?.gstRate || 0) : 0
        }))
      };

      await onSubmit(dto);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to generate bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for Preview
  const partsTotal = job.parts?.reduce((sum, p) => sum + ((p.product?.salePrice || 0) / 100) * p.quantity, 0) || 0;
  const serviceTotal = serviceAmount;
  
  let tax = 0;
  if (billingMode === "WITH_GST") {
      const serviceTax = (serviceAmount * serviceGstRate) / 100;
      const partsTax = job.parts?.reduce((sum, p) => sum + (((p.product?.salePrice || 0) / 100) * p.quantity * (p.product?.gstRate || 0) / 100), 0) || 0;
      tax = serviceTax + partsTax;
  }
  
  const total = partsTotal + serviceTotal + tax;
  const advance = job.advancePaid || 0; 
  const payable = Math.max(0, total - advance);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Generate Repair Bill</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Billing Handling */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Billing Details</h3>
                
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-400">Billing Mode</label>
                    <select 
                        value={billingMode}
                        onChange={(e) => setBillingMode(e.target.value as any)}
                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    >
                        <option value="WITHOUT_GST">Estimate / Non-GST</option>
                        <option value="WITH_GST">Tax Invoice (GST)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-400">Payment Mode</label>
                    <select 
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK">Bank Transfer</option>
                    </select>
                </div>
            </div>

            {/* Service Charges */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Labor / Service</h3>
                
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-400">Description</label>
                    <input 
                        type="text"
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-400">Amount (₹)</label>
                        <input 
                            type="number"
                            min="0"
                            value={serviceAmount}
                            onChange={(e) => setServiceAmount(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                        />
                    </div>
                     {billingMode === "WITH_GST" && (
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-400">GST %</label>
                            <input 
                                type="number"
                                value={serviceGstRate}
                                onChange={(e) => setServiceGstRate(parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Parts Summary */}
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
             <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Bill Summary</h3>
             
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Parts Cost ({job.parts?.length || 0} items)</span>
                    <span>{formatCurrency(partsTotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Service Charges</span>
                    <span>{formatCurrency(serviceTotal)}</span>
                </div>
                {billingMode === "WITH_GST" && (
                    <div className="flex justify-between text-gray-500">
                        <span>GST (Approx)</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                )}
                 <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 dark:text-white">
                    <span>Total Bill</span>
                    <span>{formatCurrency(total)}</span>
                </div>
                
                {advance > 0 && (
                     <div className="flex justify-between text-teal-600 font-medium pt-2">
                        <span>Less: Advance Paid</span>
                        <span>- {formatCurrency(advance)}</span>
                    </div>
                )}
                 <div className="flex justify-between font-bold text-xl text-indigo-600 pt-2 border-t border-dashed border-gray-300 mt-2">
                    <span>Payable Now</span>
                    <span>{formatCurrency(payable)}</span>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Generating..." : "Generate Bill & Deliver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
