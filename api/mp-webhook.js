// api/mp-webhook.js
// Webhook do Mercado Pago — recebe eventos de pagamento/assinatura
// Vercel Serverless Function

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${err}`);
  }
  return method === 'PATCH' || (method === 'POST' && res.status === 204) ? null : res.json();
}

async function getMPPreapproval(id) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
  });
  if (!res.ok) throw new Error(`MP preapproval fetch failed: ${res.status}`);
  return res.json();
}

async function getMPPayment(id) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
  });
  if (!res.ok) throw new Error(`MP payment fetch failed: ${res.status}`);
  return res.json();
}

function addOneMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, data } = req.body;
    console.log(`[MP Webhook] type=${type} id=${data?.id}`);

    // ── Evento de assinatura (preapproval) ──────────────────────────
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const preapproval = await getMPPreapproval(data.id);
      const email = preapproval.payer_email;
      const status = preapproval.status; // authorized | paused | cancelled | pending

      let subscriptionStatus;
      let endDate;

      if (status === 'authorized') {
        subscriptionStatus = 'active';
        endDate = addOneMonth(new Date());
      } else if (status === 'paused' || status === 'pending') {
        subscriptionStatus = 'past_due';
      } else if (status === 'cancelled') {
        subscriptionStatus = 'cancelled';
        // Mantém acesso até o fim do período pago
      }

      if (subscriptionStatus) {
        await supabase('PATCH', `inkwell_users?email=eq.${encodeURIComponent(email)}`, {
          subscription_status: subscriptionStatus,
          subscription_id: preapproval.id,
          subscription_plan_id: preapproval.preapproval_plan_id,
          mp_payer_id: String(preapproval.payer_id),
          mp_payment_method: preapproval.payment_method_id || null,
          ...(endDate && { subscription_end_date: endDate }),
          ...(status === 'authorized' && !preapproval.start_date
            ? { subscription_start_date: new Date().toISOString() }
            : {}
          )
        });
        console.log(`[MP Webhook] User ${email} → ${subscriptionStatus}`);
      }
    }

    // ── Evento de pagamento individual ──────────────────────────────
    if (type === 'payment') {
      const payment = await getMPPayment(data.id);
      const email = payment.payer?.email;
      if (!email) return res.status(200).json({ ok: true });

      if (payment.status === 'approved') {
        // Renova mais 1 mês a partir de hoje
        await supabase('PATCH', `inkwell_users?email=eq.${encodeURIComponent(email)}`, {
          subscription_status: 'active',
          subscription_end_date: addOneMonth(new Date())
        });
        console.log(`[MP Webhook] Payment approved for ${email} — renewed 1 month`);
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await supabase('PATCH', `inkwell_users?email=eq.${encodeURIComponent(email)}`, {
          subscription_status: 'past_due'
        });
        console.log(`[MP Webhook] Payment ${payment.status} for ${email}`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[MP Webhook] Error:', err.message);
    // Retorna 200 para o MP não retentar desnecessariamente
    return res.status(200).json({ ok: true, warning: err.message });
  }
}
