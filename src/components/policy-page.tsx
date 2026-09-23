'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Mail, Phone, Truck, ShieldCheck, Clock, Package, MapPin, CreditCard, RotateCcw, Lock, FileText, Building2, AlertTriangle, Info, UserCheck, Scale, Wrench, Zap, Users } from 'lucide-react';
import type { StoreSettings } from '@/lib/settings';
import { FOOTER_POLICY_LINKS, POLICY_TITLES, type PolicySlug } from '@/lib/policies';

type Block =
  | { icon: 'truck' | 'clock' | 'card' | 'pin' | 'return' | 'box' | 'shield' | 'mail' | 'lock' | 'file' | 'building' | 'alert' | 'info' | 'user' | 'scale' | 'wrench' | 'zap' | 'users'; title: string; body: string[]; table?: { head: string[]; rows: string[][] } };

const ICONS = {
  truck: Truck, clock: Clock, card: CreditCard, pin: MapPin, return: RotateCcw, box: Package,
  shield: ShieldCheck, mail: Mail, lock: Lock, file: FileText, building: Building2,
  alert: AlertTriangle, info: Info, user: UserCheck, scale: Scale, wrench: Wrench, zap: Zap, users: Users,
};

const CONTENT: Record<PolicySlug, { lead: string; blocks: Block[] }> = {
  about: {
    lead: 'Experiments_Projects is an Indian electronic components store built by builders, for builders. We supply genuine boards, sensors, modules and rare parts to students, hobbyists, engineers and startups across India.',
    blocks: [
      { icon: 'zap', title: 'What we do', body: [
        'We stock and ship electronic components — development boards, sensors, actuators, modules, connectors, rare and hard-to-find parts, and curated STEM kits. Every component is sourced from authorised channels and dispatched from our own inventory, not drop-shipped from unknown suppliers.',
      ]},
      { icon: 'users', title: 'Who we serve', body: [
        'Engineering students building their first project, hobbyists prototyping on a weekend, teachers running school and college labs, and product teams needing small quantities fast. If you are learning or building in electronics in India, this store is for you.',
      ]},
      { icon: 'wrench', title: 'Why builders choose us', body: [
        'Honest specifications copied from real datasheets, not marketing copy. Prices in Indian Rupees with no hidden charges. Genuine parts — we do not sell clones described as originals. Real support from people who have wired the parts themselves.',
        'Every product page lists exactly what is in the box, the operating limits, and the compatibility notes, so you know what you are buying before you pay.',
      ]},
      { icon: 'card', title: 'Payments & trust', body: [
        'All payments are processed through Razorpay, an RBI-authorised Payment Aggregator that is PCI DSS Level 1 certified. We accept UPI, credit and debit cards, net-banking and wallets. Your card details never reach our servers.',
        'Customer reviews on this site are written by real registered accounts. Reviews from customers with a confirmed paid order carry a Verified purchase badge.',
      ]},
      { icon: 'building', title: 'Legal & business details', body: [
        'Store name: Experiments_Projects',
        'Country of operation: India. We ship pan-India.',
        'Grievance Officer: RAJU — electricalandelectronics64@gmail.com · +91 86393 96238 (Mon–Sat, 10:00 AM – 7:00 PM IST)',
        'In line with the Consumer Protection (E-Commerce) Rules, 2020, we publish our contact details, policies and grievance mechanism on this website.',
      ]},
    ],
  },

  contact: {
    lead: 'Real builders, real replies. Reach us for order help, technical questions, bulk STEM kits or anything electronics.',
    blocks: [
      { icon: 'mail', title: 'Email', body: ['electricalandelectronics64@gmail.com', 'Replies within 24 business hours. Include your EXP- order ID for anything order-related so we can pull up payment and shipping status instantly.'] },
      { icon: 'user', title: 'Phone & WhatsApp', body: ['+91 86393 96238', 'Monday – Saturday · 10:00 AM – 7:00 PM IST. Sundays and public holidays excluded.'] },
      { icon: 'box', title: 'Order, payment & shipping support', body: ['Open My Orders for live payment confirmation and shipping status at every stage: Order placed → Packed → Shipped → Out for delivery → Delivered. If your tracking has not updated for 48 hours, message us and we will raise it with the courier.'] },
      { icon: 'card', title: 'Payment escalations', body: ['For payment failures, double debits or refund escalations you can also contact Razorpay Support directly at razorpay.com/support. Have your payment ID or order ID ready.'] },
      { icon: 'scale', title: 'Grievance Officer', body: [
        'Under the Consumer Protection (E-Commerce) Rules, 2020, any consumer complaint can be escalated to our Grievance Officer.',
        'Grievance Officer: RAJU',
        'Email: electricalandelectronics64@gmail.com · Phone: +91 86393 96238',
        'Acknowledgement within 48 hours and resolution within 15 days of receipt.',
      ]},
    ],
  },

  shipping: {
    lead: 'We ship genuine electronic components across India. Every stage — payment, packing, dispatch and delivery — is visible in My Orders.',
    blocks: [
      { icon: 'pin', title: 'Delivery coverage', body: ['We deliver across India including metro cities, tier-2 and tier-3 towns, and the North-East. Physical components cannot be shipped outside India at this time; digital components are delivered worldwide by download.'] },
      { icon: 'truck', title: 'Delivery timelines', body: [
        'Metro cities (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune): 2–4 business days after dispatch.',
        'Rest of India: 3–7 business days after dispatch.',
        'Remote, hilly and North-East locations: up to 10 business days after dispatch.',
        'Business days exclude Sundays and public holidays.',
      ]},
      { icon: 'clock', title: 'Dispatch time', body: [
        'Orders are packed and dispatched within 1–2 business days of a confirmed payment.',
        'Orders placed after 4:00 PM IST, or on Sundays and public holidays, are processed the next business day.',
        'Digital components and downloadable files are delivered instantly — the download unlocks in My Orders the moment payment succeeds.',
      ]},
      { icon: 'card', title: 'How payment works (Razorpay)', body: [
        'Checkout is processed by Razorpay, an RBI-authorised Payment Aggregator holding PCI DSS Level 1 certification — the highest security standard in the payments industry.',
        'Accepted methods: UPI (GPay, PhonePe, Paytm, BHIM), credit and debit cards (Visa, Mastercard, RuPay, Amex), net-banking (50+ Indian banks) and wallets (Paytm, PhonePe, Amazon Pay, Mobikwik).',
        'Card details are tokenised at the point of entry and never reach our servers. We never see or store your card number, CVV, expiry, UPI PIN or OTP.',
        'Your order is confirmed automatically the moment Razorpay verifies the payment. If the payment window closes, your order stays saved as “payment pending” in My Orders and can be retried.',
      ]},
      { icon: 'box', title: 'Live shipping updates', body: ['Track every stage in My Orders. Once dispatched, we add the courier partner name and a direct tracking link. Digital-only orders show delivery status as instant download.'] },
      { icon: 'alert', title: 'Delays beyond our control', body: ['During sales, festivals, monsoon disruption, strikes or courier network congestion, dispatch and delivery may take longer. We will keep the shipping status updated in My Orders and notify you if there is a material delay.'] },
      { icon: 'mail', title: 'Shipping questions', body: ['Email electricalandelectronics64@gmail.com or call/WhatsApp +91 86393 96238 with your EXP- order ID.'] },
    ],
  },

  'return-policy': {
    lead: 'Electronic components are sensitive parts. This policy explains exactly what can be returned, in what condition, and within how many days — so there is no ambiguity.',
    blocks: [
      { icon: 'return', title: 'Return window', body: [
        'Damaged in transit, defective on arrival, or wrong item received: 48 hours from delivery.',
        'Manufacturing defect discovered during normal use: 7 days from delivery.',
        'Unopened, unused components in original sealed packaging: 7 days from delivery (change-of-mind returns).',
      ]},
      { icon: 'alert', title: 'Mandatory: unboxing video', body: [
        'For any transit damage, wrong item or dead-on-arrival claim, an unboxing video is required as proof. Start recording before you open the parcel and keep the shipping label and packaging visible.',
        'Without an unboxing video we cannot file a damage claim with the courier or verify the condition, and the return may be declined.',
      ]},
      { icon: 'box', title: 'Condition requirements', body: [
        'The component must be returned in its original packaging with all included accessories, cables, manuals, stickers and anti-static bags.',
        'The component must not be soldered, depanelled, reprogrammed, repinned, scratched, or physically altered.',
        'Serial numbers, batch codes and warranty stickers must be intact and unreadable-tamper-free.',
      ]},
      { icon: 'zap', title: 'What cannot be returned', body: [
        'Components damaged by incorrect wiring, reverse polarity, over-voltage, over-current, electrostatic discharge, or any use outside the manufacturer’s datasheet limits. This is the most common cause of failure and is not a manufacturing defect.',
        'Digital downloads and software files once delivered — the files cannot be returned.',
        'Components ordered by mistake in the wrong package variant (please check the product specifications before ordering).',
        'Items returned without original packaging and accessories.',
        'Custom, cut-to-length, made-to-order or specially procured rare parts (marked on the product page).',
      ]},
      { icon: 'wrench', title: 'Replacement or refund — your choice', body: [
        'Once a return is approved, you choose either a free replacement (dispatched as soon as we receive the returned part) or a full refund to your original payment method.',
        'If the same component is out of stock, we will offer an equivalent alternative, store credit, or a full refund — whichever you prefer.',
      ]},
      { icon: 'clock', title: 'How to raise a return', body: [
        'Email electricalandelectronics64@gmail.com with your EXP- order ID, the unboxing video or defect photos, and a short description.',
        'We respond within 24 business hours with approval and return instructions, including the return address.',
        'Approved returns are picked up by our courier partner or can be self-shipped; contact us before self-shipping.',
      ]},
      { icon: 'shield', title: 'Warranty note', body: [
        'Manufacturer warranties, where applicable, are honoured as per the component brand’s own warranty terms and are separate from this return policy. Contact us and we will help you route a warranty claim to the right brand.',
      ]},
    ],
  },

  'refund-policy': {
    lead: 'Refunds are always returned to your original payment method through Razorpay. This page states the exact timelines per payment method, as required by Razorpay and the Consumer Protection (E-Commerce) Rules, 2020.',
    blocks: [
      { icon: 'card', title: 'Refund to source — a banking requirement', body: [
        'Refunds can only be credited back to the exact account, card, UPI ID or wallet that was used to pay. This is enforced by the banking and card networks and by Razorpay.',
        'We cannot redirect a refund to a different bank account, a different UPI ID, another person, or pay it as cash or bank transfer. Please do not request this — we will have to decline.',
      ]},
      { icon: 'return', title: 'When a refund is approved', body: [
        'Order cancelled before dispatch: full refund, approved immediately.',
        'Approved return received and inspected: full refund, approved within 1–2 business days of the returned part passing inspection.',
        'Damaged, defective or wrong item with a valid unboxing video: full refund or free replacement, your choice.',
        'Payment debited but order not created (failed transaction): auto-reversed by Razorpay; see the failed-payment section below.',
        'Digital downloads already delivered: not refundable, since the files cannot be returned.',
      ]},
      { icon: 'clock', title: 'Refund timelines by payment method', body: [
        'We initiate every approved refund through Razorpay within 1–2 business days. After initiation, the arrival time depends on how you paid:',
      ], table: {
        head: ['Payment method', 'Refund reaches you in'],
        rows: [
          ['Wallets (Paytm, PhonePe, Amazon Pay, Mobikwik)', '0–3 working days'],
          ['UPI (GPay, PhonePe, Paytm, BHIM)', '2–7 working days'],
          ['Net-banking', '2–10 working days'],
          ['Credit / debit card (Visa, Mastercard, RuPay, Amex)', '5–10 working days'],
          ['EMI / PayLater', '30–180 working days (bank-dependent)'],
        ],
      }},
      { icon: 'info', title: 'Working days', body: ['Working days exclude Saturdays, Sundays and bank holidays. If a refund has not appeared after 10 working days from initiation, contact us with your order ID and we will trace it with Razorpay and your bank.'] },
      { icon: 'alert', title: 'Failed payment but money debited', body: [
        'This happens occasionally with UPI and net-banking and resolves itself: if the transaction failed but the amount was debited, Razorpay auto-reverses it, typically within 5–7 working days.',
        'Do not retry the payment repeatedly. If the amount has not returned after 7 working days, contact us with your order ID and payment ID and we will escalate with Razorpay.',
      ]},
      { icon: 'return', title: 'Cancellation', body: [
        'You can cancel free of charge any time before dispatch — email us with your order ID. After dispatch the order cannot be cancelled; the return process above applies instead.',
        'Orders already dispatched cannot be cancelled because the parcel is in the courier network.',
      ]},
      { icon: 'file', title: 'Gateway charges', body: [
        'Per Razorpay’s standard practice, payment gateway fees on the original transaction are not returned to us and are deducted from the refund amount where applicable. The refund amount will be shown to you before you confirm a refund request.',
      ]},
      { icon: 'mail', title: 'Refund questions', body: ['Email electricalandelectronics64@gmail.com or call/WhatsApp +91 86393 96238 with your EXP- order ID. Payment escalations can also be raised directly at razorpay.com/support.'] },
    ],
  },

  privacy: {
    lead: 'This policy explains exactly what data we collect, why, how long we keep it, and how payments are handled by Razorpay. We keep it short and honest — no legal fog.',
    blocks: [
      { icon: 'building', title: 'Who is responsible for your data', body: [
        'Experiments_Projects is the data controller for your account and order information.',
        'Razorpay Software Private Limited acts as the processor for all payment data, under its own privacy policy at razorpay.com/privacy.',
      ]},
      { icon: 'box', title: 'What we collect', body: [
        'Account: your name, email address, and a salted password hash. We can never see or recover your actual password.',
        'Orders: items purchased, order total, and — for physical shipments — your delivery address, city, state and PIN code.',
        'Login activity: timestamps of sign-ups, sign-ins and failed attempts, used for security and abuse prevention.',
        'Reviews: the name, rating and text you choose to publish.',
        'Newsletter: your email address, only if you subscribe.',
      ]},
      { icon: 'card', title: 'What we never see — payments', body: [
        'When you pay, you are moved to Razorpay’s secure checkout. We never receive or store your card number, CVV, expiry date, UPI PIN, OTP or net-banking credentials.',
        'Razorpay is an RBI-authorised Payment Aggregator holding PCI DSS Level 1 certification. Card data is tokenised at the point of entry and protected by 3-D Secure and AI-based fraud detection.',
        'We store only the payment outcome: a Razorpay payment ID, the amount, and whether it succeeded. That is what lets us show your order as “Paid” and unlock downloads.',
      ]},
      { icon: 'lock', title: 'How your data is protected', body: [
        'Passwords are hashed with scrypt and a per-user salt — never stored in readable form.',
        'Sessions use signed, HTTP-only cookies and short-lived tokens. All traffic runs over HTTPS.',
        'Customer account and login-activity records are stored in MongoDB Atlas with encryption in transit (TLS) and at rest. Product, order, review and settings data is stored in a managed PostgreSQL database.',
      ]},
      { icon: 'clock', title: 'Why we collect it', body: [
        'To create and secure your account, process and deliver your order, show your purchase history and shipping status, publish reviews you write, send order and delivery updates, and reply to support requests.',
        'We do not sell, rent or trade your personal data to anyone. We do not use your data for advertising or profiling.',
      ]},
      { icon: 'mail', title: 'Marketing emails', body: [
        'Strictly optional. Every newsletter email includes a working unsubscribe link, and you can ask us to remove you at any time.',
        'Transactional emails — order confirmation, shipping, payment receipts — are essential and are sent only for orders you placed.',
      ]},
      { icon: 'users', title: 'Third parties we rely on', body: [
        'Razorpay — payment processing, refunds and fraud screening.',
        'Courier partners — delivery of physical orders; they receive your name, address and phone for delivery only.',
        'MongoDB Atlas and managed database hosting — secure data storage.',
        'No other third party receives your personal data.',
      ]},
      { icon: 'shield', title: 'Your rights', body: [
        'You can ask us to access, correct or delete your account and order data at any time — email electricalandelectronics64@gmail.com and we will action it within 7 days.',
        'You may withdraw consent for marketing emails at any time, or request a copy of the data linked to your account.',
        'Deleting your account removes your profile and reviews. Order and payment records may be retained where required by Indian tax and accounting law.',
      ]},
      { icon: 'file', title: 'Cookies', body: [
        'We use only essential cookies and equivalent session tokens to keep you signed in and hold your cart. We do not run advertising or third-party tracking cookies.',
      ]},
      { icon: 'scale', title: 'Grievance & contact', body: [
        'Any question, concern or request about your data: electricalandelectronics64@gmail.com or +91 86393 96238.',
        'Payment-specific queries can also be raised with Razorpay Support at razorpay.com/support.',
      ]},
    ],
  },

  disclaimer: {
    lead: 'Electronic components carry inherent technical risk. This disclaimer sets out the limits of our liability so you can build safely and know exactly what we are and are not responsible for.',
    blocks: [
      { icon: 'alert', title: 'Technical competence required', body: [
        'Electronic components must be used by people who understand basic electronics, or under the supervision of someone who does. Improper wiring, exceeding voltage or current ratings, missing current-limiting resistors, or reversing polarity can destroy a component instantly and, in some cases, create a fire or injury hazard.',
        'Always read the component datasheet and the specifications on the product page before wiring anything.',
      ]},
      { icon: 'zap', title: 'No liability for misuse or consequential damage', body: [
        'Experiments_Projects is not liable for damage to the component itself, or to any other device, project, board or property, caused by misuse, incorrect wiring, over-voltage, over-current, reverse polarity, electrostatic discharge, or use outside the manufacturer’s published limits.',
        'We are not liable for indirect or consequential losses — including lost data, lost profits, project downtime, or academic deadlines — arising from component failure or misuse.',
      ]},
      { icon: 'file', title: 'Specifications are indicative', body: [
        'Specifications on product pages are taken from manufacturer datasheets and are provided in good faith. Manufacturers revise datasheets, silicons and revisions without notice, so values may vary slightly between batches. Verify critical parameters against the manufacturer’s current datasheet before finalising a design.',
      ]},
      { icon: 'wrench', title: 'Not a design or engineering service', body: [
        'We sell components. We are not your design partner, and nothing on this site constitutes professional engineering, electrical or safety advice. Any wiring diagram, tutorial or project suggestion is illustrative only and must be independently verified for your application.',
      ]},
      { icon: 'info', title: 'Product images', body: [
        'Product images are representative. Minor cosmetic differences in silkscreen, labelling, colour or batch marking may exist between the image and the item you receive. Such differences do not constitute a defect and are not grounds for return.',
      ]},
      { icon: 'box', title: 'Availability & pricing', body: [
        'Stock levels and prices in Indian Rupees can change without notice due to component market volatility. An order is only confirmed once payment is verified by Razorpay. If a component goes out of stock after you paid, we will offer a replacement, store credit or a full refund.',
      ]},
      { icon: 'shield', title: 'Limitation of liability', body: [
        'To the maximum extent permitted by Indian law, our total liability for any claim relating to a product or order is limited to the amount you paid for that product. Nothing in this disclaimer excludes liability that cannot be excluded under the Consumer Protection Act, 2019 or other applicable Indian law.',
      ]},
      { icon: 'scale', title: 'Governing law', body: [
        'These terms and this disclaimer are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of Indian courts.',
      ]},
    ],
  },

  terms: {
    lead: 'By using this website or placing an order you agree to these terms. They are written to comply with the Consumer Protection (E-Commerce) Rules, 2020 and Razorpay’s marketplace requirements.',
    blocks: [
      { icon: 'info', title: 'Using the store', body: [
        'You must provide accurate account and delivery details. You are responsible for keeping your password confidential; we will never ask for it by email or phone.',
        'You may use this site for lawful personal or commercial purchasing only. Automated scraping, reselling our catalogue data, or attempting to disrupt the service is prohibited.',
      ]},
      { icon: 'card', title: 'Orders, pricing & payment', body: [
        'All prices are in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise on the product page.',
        'An order becomes a confirmed contract once Razorpay verifies your payment. Until then the order is saved as “payment pending”.',
        'We may cancel and fully refund an order if a component is out of stock, if the item was mispriced due to a technical error, or if we detect fraudulent or abusive ordering. You will be notified and refunded in full.',
      ]},
      { icon: 'box', title: 'Delivery & risk', body: [
        'Risk in the goods passes to you on delivery to the address you provided. Please inspect the parcel on arrival and report transit damage within 48 hours with an unboxing video, as set out in the Return Policy.',
      ]},
      { icon: 'file', title: 'Intellectual property', body: [
        'The Experiments_Projects name, logo, site design, product photography and written content belong to us and may not be copied or reused commercially without permission. Manufacturer names and part numbers belong to their respective owners and are used for identification only.',
      ]},
      { icon: 'users', title: 'Reviews & community conduct', body: [
        'Reviews must be your own honest experience. We remove reviews containing abuse, personal information, spam, competitor attacks or content unrelated to the product. Reviews from accounts with a confirmed paid order carry a Verified purchase badge.',
      ]},
      { icon: 'shield', title: 'Account termination', body: [
        'We may suspend or close accounts engaged in fraud, abuse of the returns process, chargeback abuse, or harassment of our staff or customers.',
      ]},
      { icon: 'scale', title: 'Grievance & jurisdiction', body: [
        'Grievance Officer: RAJU — electricalandelectronics64@gmail.com · +91 86393 96238. Acknowledgement within 48 hours, resolution within 15 days.',
        'These terms are governed by the laws of India. Continued use of the store after we update these terms means you accept the updated version; the revision date is shown on each policy page.',
      ]},
    ],
  },
};

export default function PolicyPage({ slug }: { slug: PolicySlug }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  useEffect(() => {
    fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).then(setSettings).catch(() => {});
  }, []);

  const email = settings?.contactEmail || 'electricalandelectronics64@gmail.com';
  const phone = settings?.contactPhone || '+91 8639396238';
  const telHref = 'tel:' + phone.replace(/\s/g, '');
  const page = CONTENT[slug];
  const title = POLICY_TITLES[slug];

  return (
    <div className="policy-page">
      <header className="standalone-header">
        <Link href="/" className="brand" aria-label="Experiments_Projects home">
          <span className="brand-icon">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
          </span>
          Experiments<span className="brand-dot">_</span>Projects
        </Link>
        <nav className="policy-nav-links" aria-label="Policies">
          {FOOTER_POLICY_LINKS.slice(0, 6).map((l) => (
            <Link key={l.slug} href={'/pages/' + l.slug} className={slug === l.slug ? 'active' : ''}>{l.label.replace(' Policy', '')}</Link>
          ))}
        </nav>
        <Link className="text-link" href="/"><ArrowLeft size={14} /> Back to store</Link>
      </header>

      <main className="policy-card">
        <span className="eyebrow">EXPERIMENTS_PROJECTS · INDIA · SECURED BY RAZORPAY</span>
        <h1>{title}</h1>
        <p className="policy-updated">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p className="policy-lead" dangerouslySetInnerHTML={{ __html: page.lead.replace(/electricalandelectronics64@gmail\.com/g, '<a href="mailto:$&">$&</a>').replace(/\+91 86393 96238/g, `<a href="${telHref}">$&</a>`) }} />

        <div className="policy-list">
          {page.blocks.map((block, i) => {
            const Icon = ICONS[block.icon];
            return (
              <div key={i}>
                <Icon size={17} />
                <div>
                  <h3>{block.title}</h3>
                  {block.body.map((paragraph, j) => (
                    <p key={j} dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/electricalandelectronics64@gmail\.com/g, '<a href="mailto:$&">$&</a>')
                        .replace(/\+91 86393 96238/g, `<a href="${telHref}">$&</a>`)
                        .replace(/razorpay\.com\/([a-z/]+)/g, '<a href="https://razorpay.com/$1" target="_blank" rel="noopener noreferrer">razorpay.com/$1</a>'),
                    }} />
                  ))}
                  {block.table && (
                    <table className="refund-table">
                      <thead><tr>{block.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>{block.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>)}</tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="policy-note">
          <b>Questions about this page?</b> Email <a href={'mailto:' + email}>{email}</a> or call <a href={telHref}>{phone}</a> (Mon–Sat, 10:00 AM – 7:00 PM IST).
          Payment and refund escalations can also be raised with <a href="https://razorpay.com/support/" target="_blank" rel="noopener noreferrer">Razorpay Support</a>.
        </div>

        <footer className="policy-foot">
          <Link href="/" className="button button-secondary"><ArrowLeft size={14} /> Back to store</Link>
          {FOOTER_POLICY_LINKS.filter((l) => l.slug !== slug).map((l) => (
            <Link key={l.slug} href={'/pages/' + l.slug} className="button button-secondary">{l.label}</Link>
          ))}
        </footer>
      </main>
      <p className="standalone-footnote">© {new Date().getFullYear()} Experiments_Projects · Payments secured by Razorpay (PCI DSS Level 1) · Made in India</p>
    </div>
  );
}
