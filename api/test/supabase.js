import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('tenants')
      .select('id, company_name, subdomain, created_at')
      .limit(5);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      tenants: data,
      count: data.length
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
