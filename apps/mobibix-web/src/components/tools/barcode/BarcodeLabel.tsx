"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export type LabelSize = "SMALL" | "MEDIUM" | "LARGE";

interface BarcodeLabelProps {
  value: string;
  name?: string;
  price?: string;
  shopName?: string;
  size?: LabelSize;
  className?: string;
}

export function BarcodeLabel({
  value,
  name,
  price,
  shopName,
  size = "MEDIUM",
  className = "",
}: BarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          width: size === "SMALL" ? 1.0 : size === "MEDIUM" ? 1.4 : 1.8,
          height: size === "SMALL" ? 25 : size === "MEDIUM" ? 35 : 45,
          displayValue: true,
          fontSize: 8,
          margin: 0,
        });
      } catch (err) {
        console.error("Barcode generation failed", err);
      }
    }
  }, [value, size]);

  // Dimensions for the preview and print
  const dimensions = {
    SMALL: { w: "38mm", h: "19mm", nameSize: "text-[8px]", priceSize: "text-[9px]" },
    MEDIUM: { w: "50mm", h: "25mm", nameSize: "text-[10px]", priceSize: "text-[11px]" },
    LARGE: { w: "70mm", h: "40mm", nameSize: "text-[12px]", priceSize: "text-[14px]" },
  };

  const d = dimensions[size];

  return (
    <div 
      className={`label-container bg-white text-black flex flex-col items-center justify-center p-1 border border-gray-100 print:border-0 overflow-hidden shadow-sm print:shadow-none ${className}`}
      style={{ 
        width: d.w, 
        height: d.h,
        pageBreakInside: "avoid"
      }}
    >
      {shopName && (
        <span className="text-[6px] font-bold uppercase tracking-widest text-gray-400 mb-0.5 leading-none">
          {shopName}
        </span>
      )}
      {name && (
        <span className={`${d.nameSize} font-bold text-center leading-tight truncate w-full px-1 mb-0.5`}>
          {name}
        </span>
      )}
      <div className="flex-1 flex items-center justify-center min-h-0 w-full">
        <svg ref={barcodeRef} className="max-w-[95%] h-auto" />
      </div>
      {price && (
        <div className="flex items-center gap-0.5 mt-0.5">
           <span className={`${d.priceSize} font-black`}>₹{price}</span>
        </div>
      )}

      <style jsx>{`
        .label-container {
          transition: all 0.2s ease;
        }
        @media print {
          .label-container {
            border: 0 !important;
            margin: 0 !important;
            padding: 1mm !important;
          }
        }
      `}</style>
    </div>
  );
}
