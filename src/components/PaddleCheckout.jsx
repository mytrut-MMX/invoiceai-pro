import { useEffect, useRef } from 'react';
import { useContext } from 'react';
import { AppCtx } from '../context/AppContext';

// Price ID-urile le iei din Paddle Dashboard → Catalog → Prices
const PRICE_ID_PRO = 'pri_XXXXXXXXXXXXXXX'; // înlocuiește cu al tău

export default function PaddleCheckout({ onSuccess }) {
  const { user } = useContext(AppCtx);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload = () => {
      // 'sandbox' pentru test, 'production' pentru live
      window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
        eventCallback: (e) => {
          if (e.name === 'checkout.completed') {
            onSuccess?.();
          }
        },
      });
    };
    document.head.appendChild(script);
  }, []);

  const openCheckout = () => {
    if (!window.Paddle) return;
    window.Paddle.Checkout.open({
      items: [{ priceId: PRICE_ID_PRO, quantity: 1 }],
      customer: { email: user?.email },
      customData: { user_id: user?.id }, // util pentru reconciliere
    });
  };

  return (
    <button
      onClick={openCheckout}
      style={{
        background: '#111110',
        color: '#FAFAF7',
        border: 'none',
        borderRadius: 8,
        padding: '13px 28px',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      Upgrade to Pro →
    </button>
  );
}
