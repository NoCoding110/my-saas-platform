import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  try {
    console.log('Checking existing database structure...\n');
    
    // List of tables we expect
    const expectedTables = [
      'tenants',
      'tenant_users', 
      'faq_templates',
      'client_faqs',
      'customer_interactions',
      'social_accounts',
      'content_assets'
    ];
    
    for (const table of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${table}: Missing or error - ${error.message}`);
        } else {
          console.log(`✅ ${table}: Exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
    // Check tenants table structure specifically
    console.log('\n--- Checking tenants table columns ---');
    const { data: tenantsData, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, email, plan, stripe_customer_id, company_name, subdomain')
      .limit(1);
      
    if (!tenantsError) {
      console.log('✅ Tenants table has correct structure');
      console.log('📊 Sample columns accessible');
    } else {
      console.log('❌ Tenants table error:', tenantsError.message);
    }
    
    // Count existing tenants
    const { count, error: countError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`📈 Current tenant count: ${count}`);
    }
    
  } catch (err) {
    console.error('Error checking database:', err.message);
  }
})();
