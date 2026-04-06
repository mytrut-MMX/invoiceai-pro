import { useSubscription } from '../hooks/useSubscription';
import PaddleCheckout from '../components/PaddleCheckout';

export default function UpgradePage() {
  const { isActive, subscription, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;

  if (isActive) {
    return (
      <div>
        <h2>You're on Pro ✓</h2>
        <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString('en-GB')}</p>
        {/* Link pentru Paddle Customer Portal — gestionare subscription */}
        <a href="https://customer.paddle.com" target="_blank" rel="noreferrer">
          Manage subscription →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2>Upgrade to Pro</h2>
      <PaddleCheckout onSuccess={() => window.location.reload()} />
    </div>
  );
}
