import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  // Get company name from command line or use default
  const companyName = process.argv[2] || 'Acme Repair Co';
  const email = process.argv[3] || 'test@example.com';
  
  // Generate subdomain from company name
  const subdomain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15) + 
    Math.random().toString(36).substring(2, 4);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      { price: 'price_1Rd1NoDk6rYLLZz8rv9MpK6Z', quantity: 1 }
    ],
    success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/cancel',
    customer_email: email,
    metadata: {
      company_name: companyName,
      subdomain: subdomain
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required'
  });
  
  console.log('🚀 Checkout URL:', session.url);
  console.log('📊 Company:', companyName);
  console.log('🌐 Subdomain:', subdomain + '.yourapp.com');
  console.log('📧 Email:', email);
  console.log('\nUsage: node scripts/create-checkout.js "Company Name" "email@example.com"');
})();
