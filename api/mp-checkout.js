// api/mp-checkout.js
// Gera um link de checkout personalizado por usuário para assinar o plano.
// POST { email, name }

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_PLAN_ID = process.env.MP_PLAN_ID;
const APP_URL = process.env.APP_URL || 'https://inkwell.vercel.app';

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
    const body = {
      preapproval_plan_id: MP_PLAN_ID,
      reason: 'Inkwell — Leitor de E-books',
      payer_email: email,
      back_url: `${APP_URL}/app`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 7.00,
        currency_id: 'BRL'
      }
    };

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `inkwell_${email}_${Date.now()}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP checkout error:', data);
      return res.status(400).json({ error: data.message || 'Erro ao gerar checkout' });
    }

    return res.status(200).json({
      checkout_url: data.init_point,
      subscription_id: data.id
    });
  } catch (err) {
    console.error('mp-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
