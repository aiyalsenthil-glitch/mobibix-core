'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';
import { createOrder, verifyPayment } from '@/services/payments.api';
import { getAvailablePlans, Plan } from '@/services/tenant.api';
import { Loader2 } from 'lucide-react';

export default function WhatsAppCrmPromo() {
  const router = useRouter();
  const { openPayment } = useRazorpay();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  useEffect(() => {
    async function fetchPlans() {
      try {
        const plans = await getAvailablePlans('WHATSAPP_CRM');
        setPlans(plans);
        if (plans.length > 0) {
          // Default to the middle plan if available, otherwise first
          const defaultPlan = plans.find(p => p.code === 'WHATSAPP_GROWTH') || plans[0];
          setSelectedPlan(defaultPlan);
        }
      } catch (error) {
        console.error('Failed to fetch WhatsApp plans', error);
      }
    }
    fetchPlans();
  }, []);

  const handleActivate = async (plan: Plan) => {
    setLoading(true);

    try {
      const billingCycle = 'MONTHLY';
      const order = await createOrder(plan.id, billingCycle);

      await openPayment({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: `MobiBix ${plan.name}`,
        description: `${plan.name} Add-on (${billingCycle})`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              orderId: order.orderId,
              paymentId: response.REMOVED_PAYMENT_INFRA_payment_id,
              signature: response.REMOVED_PAYMENT_INFRA_signature,
              planId: plan.id,
              billingCycle,
            });

            router.push('/whatsapp?onboarding=true');
          } catch (verifyError) {
            console.error('Payment verification failed', verifyError);
            alert('Payment successful but verification failed. Please contact support.');
            setLoading(false);
          }
        },
        theme: {
          color: '#16a34a',
        },
      });
    } catch (error: any) {
      console.error('Activation failed', error);
      alert(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            PREMIUM ADD-ON
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            WhatsApp CRM for
            <br />
            <span className="text-green-600">Growing Businesses</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transform WhatsApp into your most powerful sales channel. Manage
            conversations, nurture leads, and close deals faster.
          </p>
        </div>

        {/* Pricing Cards Section */}
        {loading && plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading available plans...</p>
          </div>
        ) : plans.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {plans.map((p) => {
              const isGrowth = p.code === 'WHATSAPP_GROWTH' || p.code === 'GROWTH';
              const monthlyPrice = p.billingCycles.find(c => c.cycle === 'MONTHLY')?.price || 0;
              const features = p.featuresJson && p.featuresJson.length > 0 ? p.featuresJson : p.features;
              
              return (
                <div 
                  key={p.id}
                  className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 flex flex-col ${
                    isGrowth ? 'border-green-500 scale-105 shadow-xl z-10' : 'border-gray-100 hover:border-green-200'
                  }`}
                >
                  {isGrowth && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="p-8 border-b border-gray-50 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{p.displayName || p.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black text-gray-900">₹{monthlyPrice / 100}</span>
                      <span className="text-gray-500 text-sm font-medium">/mo</span>
                    </div>
                    {p.tagline && <p className="text-gray-500 text-xs mt-2 uppercase tracking-tight">{p.tagline}</p>}
                  </div>

                  <div className="p-8 flex-1">
                     <ul className="space-y-4">
                       {features?.map((f: any, idx: number) => (
                         <li key={idx} className="flex items-start gap-3">
                           <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                           </svg>
                           <span className="text-gray-600 text-sm">{f.name || f}</span>
                         </li>
                       ))}
                     </ul>
                  </div>

                  <div className="p-8 pt-0">
                    <button
                      onClick={() => handleActivate(p)}
                      disabled={loading}
                      className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-70 ${
                        isGrowth 
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200' 
                          : 'bg-gray-50 text-gray-900 hover:bg-green-50 hover:text-green-700'
                      }`}
                    >
                      {loading && selectedPlan?.id === p.id ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        'Get Started'
                      )}
                    </button>

                    {/* Temporary Bypass Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`BYPASS PAYMENT: Activate ${p.name} directly?`)) return;
                        setLoading(true);
                        try {
                          const { bypassPayment } = await import('@/services/payments.api');
                          await bypassPayment(p.id, 'MONTHLY');
                          router.push('/whatsapp?onboarding=true');
                        } catch (err: any) {
                          alert(err.message || "Bypass failed");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full mt-2 py-2 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                      Unlock for Testing (Bypass)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
               </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No plans available</h3>
            <p className="text-gray-600 mb-6">We couldn't find any WhatsApp plans for your region. Please try again later or contact support if the issue persists.</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-green-600 font-semibold hover:text-green-700 underline"
            >
              Refresh Page
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
