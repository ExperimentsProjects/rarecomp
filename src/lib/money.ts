/** Categories delivered as a downloadable file rather than a shipped part. */
export const DIGITAL_CATEGORIES = ['UI Components', '3D Components', 'Landing Pages', 'Dashboards', 'Templates', 'Freebies'];
export const isDigital = (category: string) => DIGITAL_CATEGORIES.includes(category);

export const formatINR = (paise: number) =>
  paise === 0
    ? 'Free'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
