"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getJobCard,
  updateJobCardStatus,
  addJobCardPart,
  removeJobCardPart,
  JobCard,
  JobStatus,
} from "@/services/jobcard.api";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { listProducts, ShopProduct, createProduct, ProductType } from "@/services/products.api";
import { createPurchase } from "@/services/purchases.api";

// Helper for status colors (reused)
const STATUS_COLORS: Record<JobStatus, string> = {
  RECEIVED: "bg-teal-200 text-teal-900 border-teal-400 dark:bg-teal-500/20 dark:text-teal-200",
  ASSIGNED: "bg-indigo-200 text-indigo-900 border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200",
  DIAGNOSING: "bg-purple-200 text-purple-900 border-purple-400 dark:bg-purple-500/20 dark:text-purple-200",
  WAITING_APPROVAL: "bg-yellow-200 text-yellow-900 border-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-200",
  APPROVED: "bg-blue-200 text-blue-900 border-blue-400 dark:bg-blue-500/20 dark:text-blue-200",
  WAITING_FOR_PARTS: "bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200",
  IN_PROGRESS: "bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-500/20 dark:text-orange-200",
  READY: "bg-green-200 text-green-900 border-green-400 dark:bg-green-500/20 dark:text-green-200",
  DELIVERED: "bg-gray-300 text-gray-900 border-gray-500 dark:bg-gray-500/20 dark:text-gray-300",
  CANCELLED: "bg-rose-200 text-rose-900 border-rose-400 dark:bg-rose-500/20 dark:text-rose-200",
  RETURNED: "bg-pink-200 text-pink-900 border-pink-400 dark:bg-pink-500/20 dark:text-pink-200",
};

export default function JobCardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const { authUser: user } = useAuth(); // To check role
  const { selectedShopId } = useShop();
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);

  // Load Job Details
  const {
    data: job,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(
      () =>
        selectedShopId && params.id
          ? getJobCard(selectedShopId, params.id as string)
          : Promise.resolve(null),
      [selectedShopId, params.id],
    ),
    [selectedShopId, params.id],
    null,
  );

  const handleStatusChange = async (status: JobStatus) => {
    if (!job || !selectedShopId) return;

    // Delivery Guard
    if (status === "DELIVERED") {
      const validInvoice = job.invoices?.find(
        (i) => i.status !== "VOIDED"
      );
      
      if (!validInvoice) {
        alert("Cannot deliver: Job must be READY and have an invoice first.");
        return;
      }
      
      if (validInvoice.status === "DRAFT") {
         // Auto-redirect to Invoice for completion
         router.push(`/sales/${validInvoice.id}?shopId=${selectedShopId}`);
         return; 
      }

      // Check balance (optional but good UX)
      // Usually backend also checks, but we warn here.
    }

    try {
      await updateJobCardStatus(selectedShopId, job.id, status);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm("Remove this part? Stock will be restored.")) return;
    try {
      await removeJobCardPart(selectedShopId!, job!.id, partId);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to remove part");
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading job details...</div>;
  if (error || !job) return <div className="p-8 text-center text-red-500">Error: {error || "Job not found"}</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold dark:text-white">Job #{job.jobNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${STATUS_COLORS[job.status] || "bg-gray-200"}`}>
              {job.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {job.deviceBrand} {job.deviceModel} • {job.customerName}
          </p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => router.push("/jobcards")}
             className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/10 dark:text-white transition"
           >
             Back
           </button>
           <a
              href={`/print/jobcard/${job.id}?shopId=${selectedShopId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
           >
             Print Job Card
           </a>
           {job.status === 'CANCELLED' ? (
             <button
               onClick={() => handleStatusChange('RECEIVED')}
               className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition"
             >
               Reopen Job
             </button>
           ) : job.status !== 'DELIVERED' && job.status !== 'RETURNED' && (
             <select
               value={job.status}
               onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
               className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold cursor-pointer outline-none"
             >
                <option value={job.status} disabled>Change Status</option>
                <option value="READY">Mark READY</option>
                <option value="DELIVERED">Mark DELIVERED</option>
                <option value="CANCELLED">CANCEL Job</option>
             </select>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Job Info */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* ISSUES CARD */}
           <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 dark:text-white">Diagnosis & Issues</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs uppercase font-bold text-gray-500">Complaint</label>
                    <p className="mt-1 dark:text-gray-300">{job.customerComplaint}</p>
                 </div>
                 <div>
                    <label className="text-xs uppercase font-bold text-gray-500">Condition</label>
                    <p className="mt-1 dark:text-gray-300">{job.physicalCondition || "N/A"}</p>
                 </div>
                 <div>
                    <label className="text-xs uppercase font-bold text-gray-500">Access</label>
                    <p className="mt-1 dark:text-gray-300">Password: {job.devicePassword || "None"}</p>
                 </div>
                 <div>
                    <label className="text-xs uppercase font-bold text-gray-500">Serial/IMEI</label>
                    <p className="mt-1 dark:text-gray-300">{job.deviceSerial || "N/A"}</p>
                 </div>
              </div>
           </div>

           {/* PARTS MANAGEMENT */}
           <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold dark:text-white">Parts & Material</h2>
                 {['RECEIVED', 'ASSIGNED', 'DIAGNOSING', 'IN_PROGRESS', 'WAITING_FOR_PARTS'].includes(job.status) && (
                   <button 
                     onClick={() => setIsAddPartModalOpen(true)}
                     className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold hover:bg-teal-100 transition"
                   >
                     + Add Part
                   </button>
                 )}
              </div>
              
              {!job.parts || job.parts.length === 0 ? (
                 <p className="text-gray-500 text-sm italic py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">No parts added yet.</p>
              ) : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                             <th className="px-4 py-3">Product</th>
                             <th className="px-4 py-3">Qty</th>
                             <th className="px-4 py-3 text-right">Unit Price</th>
                             <th className="px-4 py-3 text-right">Total</th>
                             <th className="px-4 py-3"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {job.parts.map(part => (
                             <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                <td className="px-4 py-3 font-medium dark:text-gray-200">{part.product?.name || "Unknown Product"}</td>
                                <td className="px-4 py-3 dark:text-gray-300">{part.quantity}</td>
                                <td className="px-4 py-3 text-right dark:text-gray-300">₹{part.product?.salePrice?.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-medium dark:text-white">₹{((part.product?.salePrice || 0) * part.quantity).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                   <button 
                                      onClick={() => handleRemovePart(part.id)}
                                      className="text-red-500 hover:text-red-700"
                                      title="Remove Part (Restores Stock)"
                                   >
                                      ✕
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </div>

           {/* INVOICES */}
           {job.invoices && job.invoices.length > 0 && (
             <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 dark:text-white">Invoices</h2>
                <div className="space-y-2">
                   {job.invoices.map(inv => (
                      <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition">
                         <div>
                            <span className="font-bold text-gray-900 dark:text-white">{inv.invoiceNumber}</span>
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                               inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                               inv.status === 'VOIDED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                               {inv.status}
                            </span>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="font-bold dark:text-white">₹{(inv.totalAmount / 100).toFixed(2)}</span>
                            {inv.status !== 'VOIDED' && (
                               <a 
                                 href={`/print/invoice/${inv.id}?noQr=true`} 
                                 target="_blank"
                                 className="text-indigo-600 hover:underline text-sm"
                               >
                                 Print
                               </a>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* RIGHT COLUMN: Customer & Financials */}
        <div className="space-y-8">
           {/* CUSTOMER CARD */}
           <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 dark:text-white">Customer</h2>
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl">
                    {job.customerName.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-bold text-lg dark:text-white">{job.customerName}</h3>
                    <p className="text-gray-500 text-sm">{job.customerPhone}</p>
                 </div>
              </div>
              <div className="pt-4 border-t dark:border-gray-800">
                 <a href={`tel:${job.customerPhone}`} className="block w-full text-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 transition mb-2">
                    Start Call
                 </a>
                 <a href={`https://wa.me/91${job.customerPhone}?text=Hi ${job.customerName}, regarding job #${job.jobNumber}`} target="_blank" className="block w-full text-center py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition">
                    WhatsApp
                 </a>
              </div>
           </div>

           {/* PROFIT CARD (OWNER ONLY) */}
           {user?.role === 'OWNER' && job.profit !== undefined && (
              <div className="bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 shadow-xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💰</div>
                 <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span>Job Profitability</span>
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded">Private</span>
                 </h2>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-gray-300">
                       <span>Total Revenue</span>
                       <span className="font-medium text-white">₹{job.revenue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                       <span>Parts Cost</span>
                       <span className="font-medium text-red-200">- ₹{job.jobCost?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="h-px bg-white/20 my-2"></div>
                    <div className="flex justify-between items-center text-xl font-bold">
                       <span>Net Profit</span>
                       <span className={job.profit >= 0 ? 'text-green-400' : 'text-red-400'} >
                          ₹{job.profit?.toFixed(2)}
                       </span>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Add Part Modal */}
      {isAddPartModalOpen && (
        <AddPartModal 
           shopId={selectedShopId!} 
           jobId={job.id} 
           onClose={() => setIsAddPartModalOpen(false)} 
           onSuccess={reload}
        />
      )}
    </div>
  );
}

function AddPartModal({ shopId, jobId, onClose, onSuccess }: { shopId: string, jobId: string, onClose: () => void, onSuccess: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Creation Mode State
  const [createMode, setCreateMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newSalePrice, setNewSalePrice] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(0);
  const [createPurchaseEntry, setCreatePurchaseEntry] = useState(false);
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
     if (searchTerm.length > 1 && !createMode) {
        listProducts(shopId).then(all => {
           setProducts(all.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())));
        });
     }
  }, [searchTerm, shopId, createMode]);

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSubmitting(true);
     try {
        let productId = selectedProduct?.id;

        if (createMode) {
           if (!newProductName || newSalePrice <= 0) {
              alert("Name and Selling Price are required.");
              setIsSubmitting(false);
              return;
           }
           
           if (createPurchaseEntry) {
              if (newCostPrice <= 0 || !supplierName) {
                 alert("Cost Price and Supplier Name are required for Purchase Entry.");
                 setIsSubmitting(false);
                 return;
              }
           }

           // 1. Create Product
           const newProduct = await createProduct(shopId, {
              name: newProductName,
              type: ProductType.SPARE, // Default to SPARE for Job Cards
              salePrice: newSalePrice,
              costPrice: newCostPrice > 0 ? newCostPrice : undefined,
              isSerialized: false,
           });
           productId = newProduct.id;

           // 2. Create Purchase Entry (Optional)
           if (createPurchaseEntry) {
               await createPurchase({
                  shopId,
                  supplierName: supplierName,
                  invoiceNumber: `JOB-AUTO-${Date.now().toString().slice(-6)}`, // Random Invoice
                  paymentMethod: "CASH",
                  items: [{
                     shopProductId: productId,
                     description: newProductName,
                     quantity: quantity,
                     purchasePrice: newCostPrice,
                  }]
               });
           }
        }

        if (!productId) {
           alert("Please select or create a product.");
           setIsSubmitting(false);
           return;
        }

        await addJobCardPart(shopId, jobId, productId, quantity);
        onSuccess();
        onClose();
        
     } catch (err: any) {
        alert(err.message || "Failed to add part");
     } finally {
        setIsSubmitting(false);
     }
  };

  return (
     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
           <h3 className="text-xl font-bold mb-4 dark:text-white">
              {createMode ? "Create Part" : "Add Part"}
           </h3>
           
           <form onSubmit={handleSubmit} className="space-y-4">
              {!createMode ? (
                 <>
                    {/* SEARCH MODE */}
                    <div>
                       <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Search Product</label>
                       <div className="relative">
                         <input 
                            autoFocus
                            type="text" 
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Type product name..."
                            value={selectedProduct ? selectedProduct.name : searchTerm}
                            onChange={(e) => {
                               setSearchTerm(e.target.value);
                               setSelectedProduct(null);
                            }}
                         />
                         {searchTerm.length > 0 && !selectedProduct && (
                            <button 
                               type="button" 
                               onClick={() => {
                                  setCreateMode(true);
                                  setNewProductName(searchTerm);
                               }}
                               className="absolute right-2 top-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200"
                            >
                               + Create New
                            </button>
                         )}
                         {selectedProduct && (
                            <button 
                              type="button" 
                              onClick={() => { setSelectedProduct(null); setSearchTerm(""); }}
                              className="absolute right-12 top-2 text-gray-500 hover:text-red-500 px-2"
                            >
                               ✕
                            </button>
                         )}
                       </div>
                       
                       {/* Dropdown Results */}
                       {!selectedProduct && searchTerm.length > 1 && products.length > 0 && (
                          <div className="absolute z-10 w-full max-w-sm mt-1 bg-white dark:bg-gray-700 border rounded-lg shadow-xl max-h-48 overflow-y-auto ring-1 ring-black/5">
                             {products.map(p => (
                                <div 
                                   key={p.id} 
                                   onClick={() => { setSelectedProduct(p); setSearchTerm(""); }}
                                   className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-gray-600 cursor-pointer border-b dark:border-gray-600 last:border-0"
                                >
                                   <div className="font-semibold dark:text-gray-200">{p.name}</div>
                                   <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {p.stockQty ?? 'N/A'} • ₹{p.salePrice}</div>
                                </div>
                             ))}
                          </div>
                       )}
                       
                       {/* Create New Prompt (if no results) */}
                       {!selectedProduct && searchTerm.length > 1 && products.length === 0 && (
                           <div className="mt-2 text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <p className="text-sm text-gray-500 mb-2">Item not found.</p>
                              <button
                                 type="button"
                                 onClick={() => {
                                     setCreateMode(true);
                                     setNewProductName(searchTerm);
                                 }}
                                 className="text-teal-600 hover:text-teal-700 font-bold text-sm"
                              >
                                 Create "{searchTerm}"
                              </button>
                           </div>
                       )}
                    </div>
                 </>
              ) : (
                 <>
                    {/* CREATE MODE */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                           <label className="block text-sm font-semibold dark:text-gray-300">Product Name</label>
                           <button 
                              type="button" 
                              onClick={() => setCreateMode(false)}
                              className="text-xs text-blue-500 hover:underline"
                           >
                              Switch to Search
                           </button>
                        </div>
                        <input 
                           type="text" 
                           required
                           className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                           value={newProductName}
                           onChange={e => setNewProductName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Selling Price</label>
                           <input 
                              type="number" 
                              required
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={newSalePrice}
                              onChange={e => setNewSalePrice(Number(e.target.value))}
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Cost Price</label>
                           <input 
                              type="number" 
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={newCostPrice}
                              onChange={e => setNewCostPrice(Number(e.target.value))}
                           />
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                           <input 
                              type="checkbox" 
                              checked={createPurchaseEntry}
                              onChange={e => setCreatePurchaseEntry(e.target.checked)}
                              className="w-4 h-4 text-teal-600 rounded"
                           />
                           <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Create Purchase Entry?</span>
                        </label>
                        
                        {createPurchaseEntry && (
                           <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                               <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Supplier Name</label>
                               <input 
                                  type="text" 
                                  placeholder="e.g. Local Market / Vendor"
                                  className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                                  value={supplierName}
                                  onChange={e => setSupplierName(e.target.value)}
                               />
                               <p className="text-xs text-gray-400 mt-1">
                                  Will create a CASH purchase record for stock tracking.
                               </p>
                           </div>
                        )}
                    </div>
                 </>
              )}

              <div>
                 <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Quantity</label>
                 <input 
                   type="number" 
                   min="1" 
                   value={quantity}
                   onChange={e => setQuantity(Number(e.target.value))}
                   className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 />
              </div>

              <div className="flex gap-3 pt-4">
                 <button 
                   type="button"
                   onClick={onClose}
                   className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg dark:bg-gray-700 dark:text-gray-300"
                 >
                    Cancel
                 </button>
                 <button 
                   type="submit"
                   disabled={isSubmitting || (createMode && (!newProductName || !newSalePrice)) || (!createMode && !selectedProduct)}
                   className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-50"
                 >
                    {isSubmitting ? "Processing..." : (createMode ? "Create & Add" : "Add Part")}
                 </button>
              </div>
           </form>
        </div>
     </div>
  );
}
