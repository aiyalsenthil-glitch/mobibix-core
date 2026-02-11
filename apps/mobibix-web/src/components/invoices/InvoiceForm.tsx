"use client";

import { useState, useEffect, useCallback } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { listCustomers, type Customer } from "@/services/customers.api";
import {
  createInvoice,
  type CreateInvoiceDto,
  type PaymentMode,
} from "@/services/sales.api";
import { calculateInvoiceTotals, formatCurrency } from "@/lib/gst.utils";
import {
  validateInvoiceForm,
  type InvoiceFormInput,
  type InvoiceItemInput,
} from "@/lib/invoice.schemas";
import { CustomerLoyaltyInfo } from "../loyalty/CustomerLoyaltyInfo";
import { LoyaltyRedemptionInput } from "../loyalty/LoyaltyRedemptionInput";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";

interface InvoiceFormProps {
  onSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
}

interface FormState extends InvoiceFormInput {
  items: InvoiceItemInput[];
}

interface ItemRow extends InvoiceItemInput {
  tempId: string; // For UI key purposes
  productName?: string;
  lineTotal?: number;
}

export function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  // Dropdowns & API data
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form state
  const [shopId, setShopId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [invoiceType, setInvoiceType] = useState<"SALES" | "REPAIR">("SALES");
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);

  // Loyalty state
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);
  const [loyaltyDiscountPaise, setLoyaltyDiscountPaise] = useState<number>(0);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Load shops on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingShops(true);
        const [shopsData, customersData] = await Promise.all([
          listShops(),
          listCustomers(),
        ]);
        setShops(shopsData);
        setCustomers(customersData);
        if (shopsData.length > 0) {
          const firstShop = shopsData[0];
          setShopId(firstShop.id);
          // Set GST applicability based on shop's GST enabled setting
          setIsGstApplicable(firstShop.gstEnabled !== false);
        }
      } catch (err) {
        console.error("Failed to load shops or customers:", err);
        setErrors(["Failed to load shops or customers"]);
      } finally {
        setLoadingShops(false);
      }
    };
    loadData();
  }, []);

  // Update GST applicability when shop changes
  useEffect(() => {
    if (!shopId) return;
    const selectedShop = shops.find((s) => s.id === shopId);
    if (selectedShop) {
      // If shop doesn't support GST, force isGstApplicable to false
      const shopSupportsGst = selectedShop.gstEnabled !== false;
      setIsGstApplicable(shopSupportsGst ? true : false);
    }
  }, [shopId, shops]);

  // Load products when shop changes
  useEffect(() => {
    if (!shopId) return;

    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const productsData = await listProducts(shopId);
        const productsArray = Array.isArray(productsData)
          ? productsData
          : (productsData as any).data || [];
        setProducts(productsArray);
      } catch (err) {
        console.error("Failed to load products:", err);
        setErrors(["Failed to load products"]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [shopId]);

  // Load loyalty balance when customer changes
  useEffect(() => {
    if (!customerId) {
      setLoyaltyBalance(0);
      return;
    }

    const loadBalance = async () => {
      try {
        const balance = await getCustomerLoyaltyBalance(customerId);
        setLoyaltyBalance(balance);
      } catch (err) {
        console.error("Failed to load loyalty balance:", err);
        setLoyaltyBalance(0);
      }
    };

    loadBalance();
  }, [customerId]);

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
      setCustomerState(customer.state);
      setCustomerGstin(customer.gstNumber || "");
    }
  };

  // Add new item row
  const addItem = useCallback(() => {
    const newItem: ItemRow = {
      shopProductId: "",
      quantity: 1,
      rate: 0,
      gstRate: isGstApplicable ? 18 : 0,
      hsnCode: "",
      tempId: `item-${Date.now()}-${Math.random()}`,
    };
    setItems([...items, newItem]);
  }, [items, isGstApplicable]);

  // Remove item row
  const removeItem = useCallback(
    (tempId: string) => {
      setItems(items.filter((item) => item.tempId !== tempId));
    },
    [items],
  );

  // Update item field
  const updateItem = useCallback(
    (tempId: string, field: keyof ItemRow, value: any) => {
      setItems(
        items.map((item) => {
          if (item.tempId !== tempId) return item;

          const updated = { ...item, [field]: value };

          // If product changed, populate product name and HSN code
          if (field === "shopProductId") {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.productName = product.name;
              updated.hsnCode = product.hsnCode || "";
              updated.gstRate = product.gstRate || 18;
              updated.rate = (product.salePrice || 0) / 100;
            }
          }

          // Calculate line total
          if (field === "quantity" || field === "rate") {
            updated.lineTotal = (updated.quantity || 0) * (updated.rate || 0);
          }

          return updated;
        }),
      );
    },
    [items, products],
  );

  // Determine if items are intra-state or inter-state
  const shop = shops.find((s) => s.id === shopId);
  const isIntraState =
    shop?.state && customerState
      ? shop.state.toLowerCase() === customerState.toLowerCase()
      : true;

  // Calculate invoice totals (with loyalty discount applied before GST)
  const baseTotals = calculateInvoiceTotals(
    items.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      gstRate: item.gstRate,
      isIntraState,
    })),
  );

  // Apply loyalty discount (reduces subtotal before GST was calculated)
  // For Phase 1, we show the discount but the actual invoice creation on backend will handle it
  const invoiceTotals = {
    ...baseTotals,
    subtotal: Math.max(0, baseTotals.subtotal - loyaltyDiscountPaise),
    // GST rates don't change, only the subtotal changes due to discount
    grandTotal: Math.max(0, baseTotals.grandTotal - loyaltyDiscountPaise),
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Build items - set GST rate to 0 if GST not applicable
    const submitItems = items.map((item) => ({
      shopProductId: item.shopProductId,
      quantity: item.quantity,
      rate: item.rate,
      gstRate: isGstApplicable ? item.gstRate : 0,
      hsnCode: item.hsnCode,
      imeis: item.imeis,
    }));

    // Validate form
    const formData: InvoiceFormInput = {
      shopId,
      customerName,
      customerPhone: customerPhone || undefined,
      customerState: customerState || undefined,
      customerGstin: customerGstin || undefined,
      paymentMode,
      items: submitItems,
      invoiceType,
      isGstApplicable,
    };

    const validationErrors = validateInvoiceForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => `${e.field}: ${e.message}`));
      return;
    }

    // All items must have shopProductId
    if (items.some((item) => !item.shopProductId)) {
      setErrors(["All items must have a product selected"]);
      return;
    }

    try {
      setIsSubmitting(true);

      // Build create invoice DTO
      const createDto: CreateInvoiceDto = {
        shopId,
        customerName,
        customerPhone: customerPhone || undefined,
        customerState: isGstApplicable ? customerState : undefined,
        customerGstin: isGstApplicable ? customerGstin : undefined,
        paymentMode,
        items: submitItems.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          gstAmount: ((item.quantity * item.rate) / 100) * item.gstRate || 0,
          imeis: item.imeis,
        })),
        pricesIncludeTax: false,
      };

      const result = await createInvoice(createDto);
      setSuccess(true);
      setItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerState("");
      setCustomerGstin("");

      if (onSuccess) {
        onSuccess(result.id);
      }
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      setErrors([err.message || "Failed to create invoice"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingShops) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-3 text-gray-600">Loading shops...</div>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-green-700 font-medium">
            ✓ Invoice created successfully!
          </p>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <ul className="space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="text-red-700 text-sm">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shop Selection */}
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">Shop *</label>
        <select
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select a shop</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </div>

      {/* Invoice Type */}
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">Invoice Type</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="SALES"
              checked={invoiceType === "SALES"}
              onChange={(e) => setInvoiceType(e.target.value as "SALES")}
              className="cursor-pointer"
            />
            <span className="text-gray-700">Sales</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="REPAIR"
              checked={invoiceType === "REPAIR"}
              onChange={(e) => setInvoiceType(e.target.value as "REPAIR")}
              className="cursor-pointer"
            />
            <span className="text-gray-700">Repair</span>
          </label>
        </div>
      </div>

      {/* Customer Selection (Optional) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Select Existing Customer (Optional)
        </label>
        <select
          value={customerId || ""}
          onChange={(e) => {
            if (e.target.value) {
              handleCustomerSelect(e.target.value);
            } else {
              setCustomerId(undefined);
              setLoyaltyBalance(0);
            }
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Or enter new customer details below --</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.phone})
            </option>
          ))}
        </select>
      </div>

      {/* Customer Details */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium text-gray-900">Customer Details</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.slice(0, 10))}
              placeholder="10-digit phone"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              value={customerState}
              onChange={(e) => setCustomerState(e.target.value)}
              placeholder="e.g., Maharashtra"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              GSTIN (15 chars)
            </label>
            <input
              type="text"
              value={customerGstin}
              onChange={(e) =>
                setCustomerGstin(e.target.value.slice(0, 15).toUpperCase())
              }
              placeholder="e.g., 27AAFCR5055K1Z0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={15}
            />
          </div>
        </div>
      </div>

      {/* GST Settings - Only show if shop supports GST */}
      {shop && (
        <>
          {shop.gstEnabled === false ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-amber-800 font-medium">
                ℹ️ This shop doesn't have GST enabled
              </p>
              <p className="text-amber-700 text-sm mt-1">
                All invoices will be created without GST
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGstApplicable}
                  onChange={(e) => setIsGstApplicable(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="font-medium text-gray-900">
                  Apply GST to this invoice
                </span>
              </label>
              <p className="text-blue-700 text-sm ml-7">
                {isGstApplicable
                  ? "GST will be calculated and shown separately"
                  : "Invoice will be created without GST"}
              </p>
            </div>
          )}
        </>
      )}

      {/* Loyalty Section - Show customer balance and redemption input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Loyalty Points</h3>
          <CustomerLoyaltyInfo customerId={customerId} />
        </div>
        <LoyaltyRedemptionInput
          customerId={customerId}
          balance={loyaltyBalance}
          invoiceSubTotal={invoiceTotals.subtotal}
          onRedemptionChange={setLoyaltyPointsToRedeem}
          onDiscountChange={setLoyaltyDiscountPaise}
        />
      </div>

      {/* Items Section */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Invoice Items</h3>
          <button
            type="button"
            onClick={addItem}
            disabled={!shopId || loadingProducts}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Item
          </button>
        </div>

        {loadingProducts && (
          <div className="text-center text-sm text-gray-600">
            Loading products...
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
            <p>No items added yet</p>
            <p className="text-sm">Click "Add Item" to start</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-x-auto">
            {items.map((item) => (
              <ItemRowComponent
                key={item.tempId}
                item={item}
                products={products}
                onUpdate={updateItem}
                onRemove={removeItem}
                isGstApplicable={isGstApplicable}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Mode */}
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">
          Payment Mode *
        </label>
        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank Transfer</option>
          <option value="CREDIT">Credit</option>
        </select>
      </div>

      {/* Totals Display */}
      <div className="space-y-3 rounded-lg bg-white border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900">Invoice Summary</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">
              {formatCurrency(invoiceTotals.subtotal)}
            </span>
          </div>

          {isGstApplicable && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">CGST (50% of GST):</span>
                <span className="font-medium">
                  {formatCurrency(invoiceTotals.totalCGST)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">SGST (50% of GST):</span>
                <span className="font-medium">
                  {formatCurrency(invoiceTotals.totalSGST)}
                </span>
              </div>

              {invoiceTotals.totalIGST > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST:</span>
                  <span className="font-medium">
                    {formatCurrency(invoiceTotals.totalIGST)}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
            <span>Grand Total:</span>
            <span className="text-blue-600">
              {formatCurrency(invoiceTotals.grandTotal)}
            </span>
          </div>
          {!isGstApplicable && (
            <p className="text-amber-600 text-xs mt-2">
              This invoice is created without GST
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating...
            </>
          ) : (
            "Create Invoice"
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Individual invoice item row component
 */
function ItemRowComponent({
  item,
  products,
  onUpdate,
  onRemove,
  isGstApplicable,
}: {
  item: ItemRow;
  products: ShopProduct[];
  onUpdate: (tempId: string, field: keyof ItemRow, value: any) => void;
  onRemove: (tempId: string) => void;
  isGstApplicable: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-300 bg-white p-3">
      {/* Product & Quantity Row */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            Product *
          </label>
          <select
            value={item.shopProductId}
            onChange={(e) =>
              onUpdate(item.tempId, "shopProductId", e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            Qty *
          </label>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) =>
              onUpdate(item.tempId, "quantity", parseInt(e.target.value) || 0)
            }
            min="1"
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            Rate (₹) *
          </label>
          <input
            type="number"
            value={item.rate}
            onChange={(e) =>
              onUpdate(item.tempId, "rate", parseFloat(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            GST Rate (%)
          </label>
          <select
            value={item.gstRate}
            onChange={(e) =>
              onUpdate(item.tempId, "gstRate", parseFloat(e.target.value) || 0)
            }
            disabled={!isGstApplicable}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="9">9%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
            <option value="28">28%</option>
          </select>
          {!isGstApplicable && (
            <p className="text-xs text-amber-600">
              GST disabled for this invoice
            </p>
          )}
        </div>
      </div>

      {/* HSN Code Row */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            HSN Code
          </label>
          <input
            type="text"
            value={item.hsnCode || ""}
            onChange={(e) => onUpdate(item.tempId, "hsnCode", e.target.value)}
            placeholder="e.g., 8517"
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Line Total Display */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            Line Total
          </label>
          <div className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-sm font-medium">
            {formatCurrency((item.quantity || 0) * (item.rate || 0))}
          </div>
        </div>

        {/* GST Display */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            GST Amount
          </label>
          <div className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-sm font-medium">
            {formatCurrency(
              ((item.quantity || 0) * (item.rate || 0) * (item.gstRate || 0)) /
                100,
            )}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(item.tempId)}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Remove Item
        </button>
      </div>
    </div>
  );
}
