import { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppCtx } from '../context/AppContext';

export function useSubscription() {
  const { user } = useContext(AppCtx);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data);
        setLoading(false);
      });
  }, [user?.id]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCanceled = subscription?.status === 'canceled';
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end;

  return { subscription, isActive, isCanceled, cancelAtPeriodEnd, loading };
}
