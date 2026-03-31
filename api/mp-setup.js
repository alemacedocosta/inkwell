// api/mp-setup.js
// Rota GET protegida para criar o plano de assinatura no Mercado Pago.
// Acesse UMA VEZ: https://seu-dominio.vercel.app/api/mp-setup?secret=SETUP_SECRET
// Guarde o plan_id retornado e coloque na env MP_PLAN_ID.

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const SETUP_SECRET = process.env.SETUP_SECRET;
const APP_URL = process.env.APP_URL || 'https://inkwell.vercel.app';

export default async function handler(req, res) {
  if (req.query.secret !== SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const plan = {
      reason: 'Inkwell — Leitor de E-books',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 7.00,
        currency_id: 'BRL'
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
      },
      back_url: `${APP_URL}/app`
    };

    const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(plan)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data });
    }

    return res.status(200).json({
      message: 'Plano criado com sucesso! Salve o plan_id abaixo como variável de ambiente MP_PLAN_ID',
      plan_id: data.id,
      init_point: data.init_point,
      data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
