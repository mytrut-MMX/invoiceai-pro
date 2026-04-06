import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const body = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const eventType = body.event_type;
  const data = body.data;

  // Găsești user_id după email (Paddle trimite customer email)
  const { data: user } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", data.customer?.email)
    .single();

  if (!user) return new Response("User not found", { status: 404 });

  if (
    eventType === "subscription.created" ||
    eventType === "subscription.updated"
  ) {
    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      plan_id: data.items?.[0]?.price?.id,
      status: data.status,
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: "paddle_subscription_id" });
  }

  if (eventType === "subscription.canceled") {
    await supabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", data.id);
  }

  return new Response("ok", { status: 200 });
});
