import PolicyPage from '@/components/policy-page';
import { notFound } from 'next/navigation';
import { POLICY_TITLES, isPolicySlug } from '@/lib/policies';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = isPolicySlug(slug) ? POLICY_TITLES[slug] : 'Page';
  return {
    title: `${title} — Experiments_Projects`,
    description: `${title} for Experiments_Projects — electronic components store for builders in India. Payments secured by Razorpay.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();
  return <PolicyPage slug={slug} />;
}
