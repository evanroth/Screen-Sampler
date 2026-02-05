import { useEffect, useRef } from "react";

declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: {
          env: string;
          hosted_button_id: string;
          image: {
            src: string;
            alt: string;
            title: string;
          };
        }) => {
          render: (selector: string) => void;
        };
      };
    };
  }
}

interface PayPalDonateButtonProps {
  className?: string;
}

export function PayPalDonateButton({ className }: PayPalDonateButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = useRef(`donate-button-${Math.random().toString(36).substr(2, 9)}`);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current) return;

    const renderButton = () => {
      if (window.PayPal && containerRef.current) {
        rendered.current = true;
        window.PayPal.Donation.Button({
          env: "production",
          hosted_button_id: "B8ACUSKTNBTPJ",
          image: {
            src: "https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif",
            alt: "Donate with PayPal button",
            title: "PayPal - The safer, easier way to pay online!",
          },
        }).render(`#${buttonId.current}`);
      }
    };

    // Check if PayPal SDK is already loaded
    if (window.PayPal) {
      renderButton();
      return;
    }

    // Load PayPal SDK script
    const existingScript = document.querySelector('script[src*="paypalobjects.com/donate/sdk"]');
    if (existingScript) {
      // Script exists but PayPal not ready yet, wait for it
      const checkInterval = setInterval(() => {
        if (window.PayPal) {
          clearInterval(checkInterval);
          renderButton();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement("script");
    script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    script.charset = "UTF-8";
    script.async = true;
    script.onload = renderButton;
    document.body.appendChild(script);

    return () => {
      // Cleanup is tricky with PayPal SDK, so we just leave it loaded
    };
  }, []);

  return (
    <div className={className}>
      <div id={buttonId.current} ref={containerRef} />
    </div>
  );
}
