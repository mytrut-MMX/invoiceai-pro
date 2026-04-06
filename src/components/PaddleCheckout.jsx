import { useEffect } from 'react';

// Price ID-urile le iei din dashboard Paddle
const PLANS = {
  starter: 'pri_XXXXXXXXXXXX',
  pro: 'pri_XXXXXXXXXXXX',
};

export function PaddleCheckout({ plan, userEmail }) {
  useEffect(() => {
    // Injectează Paddle.js o singură dată
    if (window.Paddle) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload = () => {
      window.Paddle.Environment.set('sandbox'); // schimbi cu 'production'
      window.Paddle.Initialize({ token: 'live_XXXXXXXXX' }); // client-side token
    };
    document.head.appendChild(script);
  }, []);

  const openCheckout = () => {
    window.Paddle.Checkout.open({
      items: [{ priceId: PLANS[plan], quantity: 1 }],
      customer: { email: userEmail },
    });
  };

  return (
    <button onClick={openCheckout}>
      Upgrade to {plan}
    </button>
  );
}
