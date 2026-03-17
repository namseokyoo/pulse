import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // HMAC 서명 검증
  const hmac = crypto.createHmac("sha256", webhookSecret);
  const digest = hmac.update(rawBody).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.meta?.event_name;
  const eventId = payload.meta?.webhook_id;

  // Supabase service role client (RLS 우회)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // payment_events에 기록 (멱등: provider_event_id UNIQUE)
  const { error: eventError } = await supabase
    .from("payment_events")
    .upsert(
      {
        provider: "lemonsqueezy",
        provider_event_id: eventId,
        event_type: eventName,
        payload: payload,
        received_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_event_id" }
    );

  if (eventError) {
    console.error("Event upsert error:", eventError);
  }

  try {
    if (eventName === "order_created") {
      await handleOrderCreated(supabase, payload);
    } else if (eventName === "order_refunded") {
      await handleOrderRefunded(supabase, payload);
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleOrderCreated(supabase: any, payload: any) {
  const data = payload.data;
  const attrs = data.attributes;
  const customData = attrs.first_order_item?.custom_data || payload.meta?.custom_data || {};
  const profileId = customData.profile_id;
  const productType = customData.product_type || "paid_votes";
  const productQty = Number(customData.product_qty) || 0;
  const amountKrw = Number(attrs.total) || 0;
  const orderId = String(data.id);
  const idempotencyKey = `ls_${orderId}`;

  if (!profileId || !productQty) {
    console.error("Missing custom_data:", customData);
    return;
  }

  // 1. payment_order 생성 또는 조회 (멱등)
  const { data: existingOrder } = await supabase
    .from("payment_orders")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .single();

  let paymentOrderId: string;

  if (existingOrder) {
    paymentOrderId = existingOrder.id;
    if (existingOrder.status === "fulfilled") return; // 이미 처리됨
  } else {
    const { data: newOrder, error } = await supabase
      .from("payment_orders")
      .insert({
        profile_id: profileId,
        product_type: productType,
        product_qty: productQty,
        amount_krw: amountKrw,
        provider: "lemonsqueezy",
        provider_order_id: orderId,
        idempotency_key: idempotencyKey,
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Order insert error:", error);
      return;
    }
    paymentOrderId = newOrder.id;
  }

  // 2. fulfill (RPC)
  const { error } = await supabase.rpc("fulfill_payment_order", {
    p_order_id: paymentOrderId,
    p_provider_payment_id: orderId,
  });

  if (error) {
    console.error("Fulfill error:", error);
    await supabase
      .from("payment_orders")
      .update({ status: "failed", failed_reason: error.message, updated_at: new Date().toISOString() })
      .eq("id", paymentOrderId);
  }

  // payment_event에 처리 결과 기록
  await supabase
    .from("payment_events")
    .update({
      payment_order_id: paymentOrderId,
      processed_at: new Date().toISOString(),
      process_result: error ? `error: ${error.message}` : "fulfilled",
    })
    .eq("provider", "lemonsqueezy")
    .eq("provider_event_id", payload.meta?.webhook_id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleOrderRefunded(supabase: any, payload: any) {
  const orderId = String(payload.data.id);

  const { data: order } = await supabase
    .from("payment_orders")
    .select("id")
    .eq("provider", "lemonsqueezy")
    .eq("provider_order_id", orderId)
    .single();

  if (!order) {
    console.error("Order not found for refund:", orderId);
    return;
  }

  await supabase
    .from("payment_orders")
    .update({ status: "refund_pending", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  const { error } = await supabase.rpc("refund_payment_order", {
    p_order_id: order.id,
  });

  if (error) {
    console.error("Refund error:", error);
  }

  await supabase
    .from("payment_events")
    .update({
      payment_order_id: order.id,
      processed_at: new Date().toISOString(),
      process_result: error ? `error: ${error.message}` : "refunded",
    })
    .eq("provider", "lemonsqueezy")
    .eq("provider_event_id", payload.meta?.webhook_id);
}
