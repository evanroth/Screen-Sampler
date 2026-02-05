import { useEffect, useRef } from "react";

interface PayPalDonateButtonProps {
  hostedButtonId: string;
}

export default function PayPalDonateButton({ hostedButtonId }: PayPalDonateButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically load PayPal SDK
    const script = document.createElement("script");
    script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.PayPal && containerRef.current) {
        window.PayPal.Donation.Button({
          env: "production",
          hosted_button_id: hostedButtonId,
          image: {
            src: "https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif",
            alt: "Donate with PayPal button",
            title: "PayPal - The safer, easier way to pay online!",
          },
        }).render(containerRef.current);
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [hostedButtonId]);

  return <div ref={containerRef} />;
}
