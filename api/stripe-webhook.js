import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk) : chunk
    );
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({
      error: "Missing Stripe signature",
    });
  }

  const body = await getRawBody(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Invalid Stripe signature:", error.message);

    return res.status(400).json({
      error: "Invalid signature",
    });
  }

  console.log("Stripe event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return res.status(200).json({
        received: true,
        paid: false,
      });
    }

    const email = session.customer_details?.email;
    const name = session.customer_details?.name;

    const amount = session.amount_total
      ? session.amount_total / 100
      : 0;

    const currency = session.currency?.toUpperCase();

    console.log("PAYMENT CONFIRMED");

    console.log({
      email,
      name,
      amount,
      currency,
      session_id: session.id,
    });

    // META PURCHASE ENTRARÁ AQUI
  }

  return res.status(200).json({
    received: true,
  });
}
