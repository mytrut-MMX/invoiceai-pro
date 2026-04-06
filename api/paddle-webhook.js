import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verifică semnătura Paddle (din Dashboard → Developer → Webhooks → secret key)
function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  const [tsPart, h1Part] = signatureHeader.split(';');
  const ts = tsPart.replace('ts=', '');
  const receivedHash = h1Part.replace('h1=', '');
  const signedPayload = `${ts}:${rawBody}`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(receivedHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['paddle-signature'];

  // Verifică semnătura în producție
  if (process.env.PADDLE_WEBHOOK_SECRET && signature) {
    const valid = verifyPaddleSignature(rawBody, signature, process.env.PADDLE_WEBHOOK_SECRET);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event_type, data } = req.body;

  // Găsește user după email
  const customerEmail = data.customer?.email;
  if (!customerEmail) return res.status(400).json({ error: 'No customer email' });

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === customerEmail);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const payload = {
    user_id:                user.id,
    paddle_subscription_id: data.id,
    paddle_customer_id:     data.customer_id,
    plan_id:                data.items?.[0]?.price?.id,
    status:                 data.status,
    current_period_end:     data.current_billing_period?.ends_at,
    cancel_at_period_end:   data.scheduled_change?.action === 'cancel',
    updated_at:             new Date().toISOString(),
  };

  if (['subscription.created', 'subscription.updated', 'subscription.activated'].includes(event_type)) {
    await supabase
      .from('subscriptions')
      .upsert(payload, { onConflict: 'paddle_subscription_id' });
  }

  if (event_type === 'subscription.canceled') {
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('paddle_subscription_id', data.id);
  }

  return res.status(200).json({ ok: true });
}
