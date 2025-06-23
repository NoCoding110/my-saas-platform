import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/test', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data, error } = await supabase.from('tenants').select('count').limit(1);
      
    res.json({ 
      success: true, 
      message: 'Webhook handler ready!',
      supabaseConnected: !error
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/test-tenant', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const testTenant = {
      stripe_customer_id: 'cus_test_' + Date.now(),
      company_name: 'Test Company ' + Date.now(),
      subdomain: 'test' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      plan: 'professional',        // Add this for the required plan column
      plan_type: 'professional',   // Keep this for consistency
      status: 'active'
    };
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert(testTenant)
      .select()
      .single();
      
    if (error) throw error;
    
    res.json({ 
      success: true, 
      tenant: tenant,
      message: 'Test tenant created successfully!'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server: http://localhost:${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/test`);
  console.log(`🔗 Create tenant: POST http://localhost:${PORT}/test-tenant`);
});
