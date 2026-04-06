import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // calea ta

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('*')
      .single()
      .then(({ data }) => {
        setSubscription(data);
        setLoading(false);
      });
  }, []);

  const isActive = subscription?.status === 'active';
  return { subscription, isActive, loading };
}
