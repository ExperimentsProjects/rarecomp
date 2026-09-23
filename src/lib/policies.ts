export const POLICY_SLUGS = ['about', 'contact', 'shipping', 'return-policy', 'refund-policy', 'privacy', 'disclaimer', 'terms'] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

export const POLICY_TITLES: Record<PolicySlug, string> = {
  about: 'About us',
  contact: 'Contact us',
  shipping: 'Shipping Policy',
  'return-policy': 'Return & Replacement Policy',
  'refund-policy': 'Refund & Cancellation Policy',
  privacy: 'Privacy Policy',
  disclaimer: 'Disclaimer',
  terms: 'Terms of Service',
};

/** Order used in the footer and the policy page nav. */
export const FOOTER_POLICY_LINKS: { slug: PolicySlug; label: string }[] = [
  { slug: 'about', label: 'About us' },
  { slug: 'contact', label: 'Contact us' },
  { slug: 'shipping', label: 'Shipping Policy' },
  { slug: 'return-policy', label: 'Return Policy' },
  { slug: 'refund-policy', label: 'Refund Policy' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'disclaimer', label: 'Disclaimer' },
  { slug: 'terms', label: 'Terms of Service' },
];

export function isPolicySlug(value: string): value is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(value);
}
