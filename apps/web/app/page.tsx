import Script from "next/script";
import { LandingPageController } from "../components/landing/landing-page-controller";

export default function HomePage() {
  const paystackPublicKey = process.env.NEXT_PUBLIC_ROOMXCHANGE_PAYSTACK_PUBLIC_KEY ?? process.env.ROOMXCHANGE_PAYSTACK_PUBLIC_KEY ?? null;

  return (
    <>
      {paystackPublicKey ? <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" /> : null}
      <LandingPageController paystackPublicKey={paystackPublicKey} />
    </>
  );
}
