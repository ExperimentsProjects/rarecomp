import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./admin.css";
import "./shop.css";
import "./hero3d.css";
import "./admin-users.css";
import "./reviews.css";
import "./policy.css";
import "./responsive.css";
import "./hardware.css";
import "./footer.css";

export const metadata: Metadata = {
  applicationName: "Experiments_Projects",
  title: {
    default: "Experiments_Projects — Electronics Components, Devices & Source Code",
    template: "%s — Experiments_Projects",
  },
  description:
    "Genuine electronic components, development boards, wireless RF modules, assembled devices and production source code. Priced in ₹ with secure Razorpay checkout — shipped across India.",
  keywords: ['ESP32', 'ESP32-S3', 'CC1101', 'nRF24L01', 'LoRa', 'electronics', 'India', 'IoT', 'components store'],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Experiments_Projects',
    title: 'Experiments_Projects — Touch. Build. Electrify ideas.',
    description:
      'Dev boards · sensors · wireless RF modules · assembled devices · production source code — priced in ₹, shipped across India.',
    url: 'https://experimentsprojects.in',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Experiments_Projects — Electronic Components & Source Code Store' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Experiments_Projects — Electronics Components',
    description: 'Boards, sensors, wireless modules, devices and source code. Priced in ₹, shipped across India.',
    images: ['/og-image.png'],
  },
};

export const viewport = {
  themeColor: '#101112',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
