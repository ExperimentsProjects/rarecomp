'use client';
import { Package, PackageCheck, Truck, MapPin, CheckCircle2 } from 'lucide-react';

export const SHIPPING_STEPS = [
  { id: 'processing', name: 'Order placed', icon: Package },
  { id: 'packed', name: 'Packed', icon: PackageCheck },
  { id: 'shipped', name: 'Shipped', icon: Truck },
  { id: 'out_for_delivery', name: 'Out for delivery', icon: MapPin },
  { id: 'delivered', name: 'Delivered', icon: CheckCircle2 },
] as const;

export function ShippingSteps({ shipping }: { shipping: string }) {
  const index = Math.max(
    0,
    SHIPPING_STEPS.findIndex((s) => s.id === shipping),
  );
  return (
    <div className="ship-steps" aria-label={`Shipping status: ${SHIPPING_STEPS[index].name}`}>
      {SHIPPING_STEPS.map((step, i) => {
        const Icon = step.icon;
        const state = i < index ? 'done' : i === index ? 'active' : 'pending';
        return (
          <div key={step.id} className={`ship-step ship-${state}`} data-step={step.id}>
            <span className="ship-dot">
              <Icon size={13} />
            </span>
            {i < SHIPPING_STEPS.length - 1 && <i className="ship-line" />}
            <small>{step.name}</small>
          </div>
        );
      })}
    </div>
  );
}
