import { RazorpayService } from './src/core/billing/REMOVED_PAYMENT_INFRA.service';

const rzp = new RazorpayService();

async function main() {
  console.log('Testing with Key:', process.env.RAZORPAY_KEY_ID);
  const link = await rzp.createPaymentLink(
    100,
    'INR',
    'Test Mode Connectivity Check',
    { name: 'Test User', email: 'test@example.com', contact: '9123456789' },
    'TEST_CONN_1'
  );
  console.log('Success! Link:', link.short_url);
}

main().catch(e => {
    console.error('Connection Failed!');
    console.error(e.message);
});
