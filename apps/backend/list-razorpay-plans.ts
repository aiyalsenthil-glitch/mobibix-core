import Razorpay from 'REMOVED_PAYMENT_INFRA';
import * as dotenv from 'dotenv';

dotenv.config();

const REMOVED_PAYMENT_INFRA = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function main() {
  console.log(`Using Key: ${process.env.RAZORPAY_KEY_ID}`);
  try {
    const plans: any = await REMOVED_PAYMENT_INFRA.plans.all();
    console.log('--- Razorpay Plans in this Account ---');
    if (plans.items) {
      for (const plan of plans.items) {
        console.log(`ID: ${plan.id}, Name: ${plan.item.name}, Amount: ${(plan.item.amount || 0) / 100}, Period: ${plan.period}`);
      }
    } else {
      console.log('No plans found.');
    }
  } catch (err: any) {
    console.error('Error fetching plans from Razorpay:', err.message);
  }
}

main();
