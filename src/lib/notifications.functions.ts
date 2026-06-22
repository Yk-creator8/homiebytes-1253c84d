import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Status = "placed" | "pending" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";

const MESSAGES: Record<Status, { title: string; body: string }> = {
  placed:           { title: "Order received",      body: "Waiting for the cook to confirm." },
  pending:          { title: "Order received",      body: "Waiting for the cook to confirm." },
  accepted:         { title: "Order accepted ✅",    body: "Your cook is getting started." },
  preparing:        { title: "Cooking now 👨‍🍳",     body: "Your meal is being prepared fresh." },
  ready:            { title: "Ready for pickup",    body: "A rider will pick it up shortly." },
  out_for_delivery: { title: "On the way 🛵",        body: "Your rider is heading to you." },
  delivered:        { title: "Delivered 🎉",         body: "Enjoy your meal! Rate your experience." },
  rejected:         { title: "Order declined",      body: "The cook couldn't take this order. Any payment will be refunded." },
};

export const notifyOrderStatusChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; status: Status }) => ({
    orderId: String(data.orderId),
    status: data.status,
  }))
  .handler(async ({ data, context }) => {
    // Caller must own the order as cook or rider, or be admin.
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, customer_id, cook_id, rider_id, total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { ok: false, reason: "Order not found" };

    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const isAuthorized = isAdmin || order.cook_id === context.userId || order.rider_id === context.userId;
    if (!isAuthorized) return { ok: false, reason: "Forbidden" };

    const msg = MESSAGES[data.status];
    if (!msg) return { ok: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: order.customer_id,
      title: msg.title,
      body: `${msg.body} (Order #${order.id.slice(0, 8)} · ₹${order.total})`,
      type: data.status === "rejected" ? "warning" : "order",
      link: "/orders",
    });

    return { ok: true };
  });
