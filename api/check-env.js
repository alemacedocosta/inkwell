// api/check-env.js
// Diagnostico de env vars - quais estao configuradas no Vercel (sem expor valores).
// DELETE this endpoint after verifying.

export default function handler(req, res) {
  const required = ['APP_URL','SUPABASE_URL','SUPABASE_SERVICE_KEY','MP_ACCESS_TOKEN','MP_PLAN_ID'];
  const vars = {};
  for (const k of required) {
    vars[k] = process.env[k] ? 'OK' : 'MISSING';
  }
  if (process.env.APP_URL) vars['APP_URL_value'] = process.env.APP_URL;
  vars['SETUP_SECRET'] = process.env.SETUP_SECRET ? 'set' : 'not set (optional)';
  const allOk = required.every(k => process.env[k]);
  return res.status(200).json({ status: allOk ? 'ALL_OK' : 'MISSING_VARS', vars });
}
