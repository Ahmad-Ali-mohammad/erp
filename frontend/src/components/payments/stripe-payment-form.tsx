"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { STRIPE_PUBLISHABLE_KEY } from "@/lib/config";

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function PaymentForm({ returnPath }: { returnPath: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    const returnUrl = `${window.location.origin}${returnPath}`;
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "تعذر إتمام الدفع عبر Stripe.");
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      setSuccess(true);
    }
    setIsSubmitting(false);
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <PaymentElement />
      {error ? <p className="error-banner">{error}</p> : null}
      {success ? (
        <p className="status-chip status-success">تم إتمام الدفع بنجاح.</p>
      ) : null}
      <div className="payment-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !stripe}>
          {isSubmitting
            ? "جارٍ معالجة الدفع..."
            : "إتمام الدفع"}
        </button>
      </div>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  returnPath,
}: {
  clientSecret: string;
  returnPath: string;
}) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="error-banner">
        {"مفتاح Stripe غير مضبوط للواجهة الأمامية."}
      </p>
    );
  }
  if (!stripePromise) {
    return <p className="error-banner">{"تعذر تحميل Stripe.js."}</p>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm returnPath={returnPath} />
    </Elements>
  );
}
