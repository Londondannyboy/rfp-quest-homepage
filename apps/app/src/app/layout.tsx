"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";
import "@neondatabase/neon-js/ui/css";

import { CopilotKit } from "@copilotkit/react-core";
import { ThemeProvider } from "@/hooks/use-theme";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react";
import { authClient } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RFP.quest Beta</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪁</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <NeonAuthUIProvider
            authClient={authClient}
            navigate={router.push}
            replace={router.replace}
            onSessionChange={router.refresh}
            Link={Link}
          >
            <CopilotKit runtimeUrl="/api/copilotkit">
              {children}
            </CopilotKit>
          </NeonAuthUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
