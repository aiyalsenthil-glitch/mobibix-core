import { type Party } from "@/services/parties.api";
import { PartySelector } from "@/components/common/PartySelector";

interface InvoiceCustomerSelectorProps {
  selectedCustomer: Party | null;
  onSelectCustomer: (customer: Party) => void;
  onClearCustomer: () => void;
  onNewCustomer: () => void;
}

export function InvoiceCustomerSelector({
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  onNewCustomer,
}: InvoiceCustomerSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 mb-8 shadow-sm">
      <div className="flex items-start justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Customer Details
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Customer
          </label>
          <div className="relative">
            {selectedCustomer ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50 flex items-start justify-between group">
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedCustomer.phone}
                  </div>
                  {(selectedCustomer.gstNumber || selectedCustomer.state) && (
                    <div className="text-xs text-gray-400 mt-2 flex gap-3">
                      {selectedCustomer.gstNumber && (
                        <span>GST: {selectedCustomer.gstNumber}</span>
                      )}
                      {selectedCustomer.state && (
                        <span>State: {selectedCustomer.state}</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={onClearCustomer}
                  className="text-gray-400 hover:text-red-500 transition px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <PartySelector
                  type="CUSTOMER"
                  onSelect={onSelectCustomer}
                  placeholder="Search customer by name or phone..."
                  className="flex-1"
                />
                <button
                  onClick={onNewCustomer}
                  className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-semibold transition border border-teal-200"
                >
                  + New
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
