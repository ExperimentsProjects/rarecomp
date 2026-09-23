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

export const metadata: Metadata = {
  title: "Experiments_Projects — Build better. Ship faster.",
  description: "Premium UI components, 3D experiences, and templates. Beautifully crafted, ready to make your next big idea real.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
