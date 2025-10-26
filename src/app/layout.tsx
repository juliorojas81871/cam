import type { Metadata } from "next";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import { Container } from "@mui/material";

export const metadata: Metadata = {
  title: "CAM Ventures - Property Management",
  description: "Property management system for owned and leased properties",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <Container sx={{ mt: 4, mb: 4 }}>
            {children}
          </Container>
        </Providers>
      </body>
    </html>
  );
}
