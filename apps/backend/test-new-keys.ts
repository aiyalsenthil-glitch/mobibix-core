import { RazorpayService } from './src/core/billing/REMOVED_PAYMENT_INFRA.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env explicitly for script
dotenv.config({ path: path.join(__dirname, '.env') });

const rzp = new RazorpayService();

async function main() {
  console.log('Testing with Key:', process.env.RAZORPAY_KEY_ID);
  
  try {
    const link = await rzp.createPaymentLink(
      100, // INR 1.00
      'INR',
      'Test Connectivity Check - New Keys',
      { name: 'Test User', email: 'test@example.com', contact: '9123456789' },
      'TEST_CONN_2'
    );
    console.log('✅ Success! Connection verified.');
    console.log('Short URL:', link.short_url);
  } catch (error: any) {
    console.error('❌ Connection Failed!');
    console.error(error.message);
  }
}

main();
