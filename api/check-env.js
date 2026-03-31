// api/check-env.js
// Diagnóstico de env vars — retorna quais estão configuradas (sem expor valores)
// Remover ou proteger com senha em produção após uso.

export default function handler(req, res) {
  const vars = {
    APP_URL:              process.env.APP_URL              ? '✅ set' : '❌ MISSING',
    SUPABASE_URL:         process.env.SUPABASE_URL         ? '✅ set' : '❌ MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ set' : '❌ MISSING',
    MP_ACCESS_TOKEN:      process.env.MP_ACCESS_TOKEN      ? '✅ set' : '❌ MISSING',
    MP_PLAN_ID:           process.env.MP_PLAN_ID           ? '✅ set' : '❌ MISSING',
    SETUP_SECRET:         process.env.SETUP_SECRET         ? '✅ set' : '⚠️  not set (optional)',
  };

  // Mostra o valor real de APP_URL (não é segredo)
  if (process.env.APP_URL) {
    vars.APP_URL = `✅ set → "${process.env.APP_URL}"`;
  }

  const allOk = ['APP_URL','SUPABASE_URL','SUPABASE_SERVICE_KEY','MP_ACCESS_TOKEN','MP_PLAN_ID']
    .every(k => process.env[k]);

  return res.status(200).json({
    status: allOk ? '✅ All required env vars present' : '❌ Some env vars MISSING',
    vars,
    note: 'Remova este endpoint após verificação.'
  });
}
