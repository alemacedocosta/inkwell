// api/mp-checkout.js
// Retorna o init_point do plano MP para o usuário assinar.
// O MP exige card_token_id para criar preapprovals via API server-to-server;
// a forma correta é usar o init_point do preapproval_plan diretamente.
// POST { email, name }

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_PLAN_ID = process.env.MP_PLAN_ID;
const APP_URL = process.env.APP_URL || 'https://inkwell-seven-jade.vercel.app';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email obrigatório' });

  try {
    // Busca o plano para obter o init_point oficial
    const planRes = await fetch(`https://api.mercadopago.com/preapproval_plan/${MP_PLAN_ID}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!planRes.ok) {
      const err = await planRes.json();
      console.error('MP plan fetch error:', JSON.stringify(err));
      return res.status(400).json({ error: 'Plano não encontrado no MP', detail: err });
    }

    const plan = await planRes.json();
    const initPoint = plan.init_point;

    if (!initPoint) {
      return res.status(500).json({ error: 'init_point ausente no plano MP' });
    }

    // Adiciona payer_email como query param (MP preenche automaticamente no checkout)
    const checkoutUrl = `${initPoint}?preapprover_email=${encodeURIComponent(email)}`;

    console.log(`[MP Checkout] Returning plan init_point for ${email}`);
    return res.status(200).json({
      checkout_url: checkoutUrl,
      plan_id: plan.id,
      plan_status: plan.status
    });
  } catch (err) {
    console.error('mp-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
