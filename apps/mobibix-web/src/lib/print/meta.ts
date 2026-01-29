import type { DocumentType } from "./types";

export interface TemplateMeta {
  label: string;
  description: string;
  previewImage: string; // Path relative to public/ e.g. "/print-previews/invoice-classic.svg"
}

type TemplateMetaMap = {
  [K in DocumentType]?: {
     [V in string]?: TemplateMeta;
  };
};

export const TEMPLATE_META: TemplateMetaMap = {
  INVOICE: {
    CLASSIC: {
      label: "Classic A4",
      description: "Professional standard invoice with GST details.",
      previewImage: "/print-previews/invoice-classic.svg",
    },
    MODERN: {
      label: "Modern Clean",
      description: "Minimalist, open layout with clear typography.",
      previewImage: "/print-previews/invoice-modern.svg", // Reusing classic for now or create new
    },
    CORPORATE: {
      label: "Corporate Boxed",
      description: "Structured, bordered layout for B2B/Industrial.",
      previewImage: "/print-previews/invoice-corporate.svg",
    },
    COMPACT: {
      label: "Compact A5",
      description: "Dense layout, fits high volume printing.",
      previewImage: "/print-previews/invoice-compact.svg",
    },
    THERMAL: {
      label: "Thermal Receipt (80mm)",
      description: "Compact roll format for POS printers.",
      previewImage: "/print-previews/invoice-thermal.svg",
    },
  },
  JOBCARD: {
    CLASSIC: {
      label: "Standard Job Card (A4)",
      description: "Full-page detailed repair order.",
      previewImage: "/print-previews/jobcard-classic.svg",
    },
    THERMAL: {
        label: "Thermal Job Slip (80mm)",
        description: "Quick reference slip with QR code.",
        previewImage: "/print-previews/jobcard-thermal.svg",
    },
    SIMPLE: {
        label: "Simple Thermal",
        description: "Minimal thermal layout.",
        previewImage: "/print-previews/jobcard-thermal.svg", // Reusing thermal for now
    },
    DETAILED: {
        label: "Detailed Thermal",
        description: "Extended thermal layout with conditions.",
        previewImage: "/print-previews/jobcard-thermal.svg", // Reusing thermal for now
    }
  },
};
