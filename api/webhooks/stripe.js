import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const body = JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completed:', session.id);
  
  const customer = await stripe.customers.retrieve(session.customer);
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  const companyName = session.metadata?.company_name || customer.name || 'Unknown Company';
  const subdomain = session.metadata?.subdomain || generateSubdomain(companyName);
  const planType = getPlanFromPrice(subscription.items.data[0].price.id);
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      company_name: companyName,
      subdomain: subdomain,
      email: customer.email,
      plan: planType,           // Required field
      plan_type: planType,      // For consistency
      status: 'active'
    })
    .select()
    .single();

  if (tenantError) {
    console.error('Error creating tenant:', tenantError);
    throw tenantError;
  }

  console.log('Created tenant:', tenant.id);
  await createDefaultFAQs(tenant);
  console.log('Tenant onboarding completed:', tenant.id);
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  const planType = getPlanFromPrice(subscription.items.data[0].price.id);
  
  const { error } = await supabase
    .from('tenants')
    .update({
      plan: planType,
      plan_type: planType,
      status: subscription.status === 'active' ? 'active' : 'suspended'
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating tenant subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deleted:', subscription.id);
  
  const { error } = await supabase
    .from('tenants')
    .update({
      status: 'cancelled'
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating tenant status:', error);
    throw error;
  }
}

function getPlanFromPrice(priceId) {
  const priceMap = {
    'price_1Rd2eMDk6rYLLZz8NWWydDKh': 'professional',
  };
  
  return priceMap[priceId] || 'starter';
}

function generateSubdomain(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15) + 
    Math.random().toString(36).substring(2, 5);
}

async function createDefaultFAQs(tenant) {
  const defaultFAQs = [
    {
      tenant_id: tenant.id,
      question: "What are your business hours?",
      answer: "We're open Monday through Friday, 9 AM to 6 PM. Please contact us to schedule an appointment.",
      category: "general"
    },
    {
      tenant_id: tenant.id,
      question: "How can I schedule an appointment?",
      answer: "You can call or text us to schedule an appointment. We'll find a convenient time that works for you.",
      category: "scheduling"
    },
    {
      tenant_id: tenant.id,
      question: "What services do you offer?",
      answer: "We offer comprehensive repair and maintenance services. Contact us to discuss your specific needs.",
      category: "services"
    }
  ];

  const { error: faqError } = await supabase
    .from('client_faqs')
    .insert(defaultFAQs);

  if (faqError) {
    console.error('Error creating default FAQs:', faqError);
  } else {
    console.log('Created default FAQs for tenant:', tenant.id);
  }
}
