const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { plan, interval } = JSON.parse(event.body || "{}");

    if (!plan || !interval) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing plan or interval" }) };
    }

    // Log the environment variables to check if they exist
    console.log("Monthly Price ID:", process.env.STRIPE_MONTHLY_PRICE_ID);
    console.log("Yearly Price ID:", process.env.STRIPE_YEARLY_PRICE_ID);
	console.log("STRIPE_MONTHLY_PRICE_ID:", process.env.STRIPE_MONTHLY_PRICE_ID);
	console.log("STRIPE_YEARLY_PRICE_ID:", process.env.STRIPE_YEARLY_PRICE_ID);
	
    // Hardcoding the Price IDs directly for testing purposes
    const priceId = interval === "monthly"
      ? "price_1QqSSSAX9SrQVqtLzYqy5gci" // Hardcoded monthly price ID
      : "price_1QqSZ5AX9SrQVqtLZy5TtS17"; // Hardcoded yearly price ID

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId, // Using hardcoded price ID here
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }), // Return checkout URL
    };
  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};


