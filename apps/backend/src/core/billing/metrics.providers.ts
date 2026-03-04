import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

export const billingMetricsProviders = [
  makeCounterProvider({
    name: 'renewals_success_total',
    help: 'Total successful subscription renewals',
  }),
  makeCounterProvider({
    name: 'renewals_failed_total',
    help: 'Total failed subscription renewals',
  }),
  makeCounterProvider({
    name: 'webhooks_processed_total',
    help: 'Total Razorpay webhooks processed',
    labelNames: ['event'],
  }),
  makeCounterProvider({
    name: 'invoices_generated_total',
    help: 'Total invoices generated',
  }),
];
