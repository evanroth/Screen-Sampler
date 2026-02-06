import paypalSupport from "@/assets/paypal-support.png";

interface PayPalDonateButtonProps {
  className?: string;
}

export function PayPalDonateButton({ className }: PayPalDonateButtonProps) {
  return (
    <div className={className}>
      <a href="https://www.paypal.com/donate/?hosted_button_id=B8ACUSKTNBTPJ" target="_blank" rel="noopener noreferrer">
        <img src={paypalSupport} alt="Donate with PayPal" className="w-[150px] h-auto" />
      </a>
    </div>
  );
}
