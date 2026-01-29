import type { ComponentType } from "react";
import type { PrintDocumentData, DocumentType, TemplateVariant } from "./types";

// Registry Type: Maps DocumentType -> Variant -> Component
export type PrintTemplateComponent = ComponentType<{ data: PrintDocumentData }>;

type RegistryMap = {
  [K in DocumentType]?: {
    [V in string]?: PrintTemplateComponent;
  };
};

// Global Registry
export const TEMPLATE_REGISTRY: RegistryMap = {
  INVOICE: {},
  JOBCARD: {},
};

/**
 * Register a template component
 */
export function registerTemplate(
  type: DocumentType,
  variant: string,
  component: PrintTemplateComponent
) {
  if (!TEMPLATE_REGISTRY[type]) {
    TEMPLATE_REGISTRY[type] = {};
  }
  TEMPLATE_REGISTRY[type]![variant] = component;
}

/**
 * Resolve a template. Fallback to default if variant not found.
 */
export function resolveTemplate(
  type: DocumentType,
  variant?: string
): PrintTemplateComponent | null {
  const typeRegistry = TEMPLATE_REGISTRY[type];
  if (!typeRegistry) return null;

  // 1. Try requested variant
  if (variant && typeRegistry[variant]) {
    return typeRegistry[variant]!;
  }

  // 2. Fallback to 'CLASSIC' or 'SIMPLE' or first available
  return (
    typeRegistry["CLASSIC"] ||
    typeRegistry["SIMPLE"] ||
    Object.values(typeRegistry)[0] ||
    null
  );
}
