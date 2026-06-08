// app/layout.tsx
import type { Metadata } from "next";
import { MedusaAuthProvider } from "@/providers/MedusaAuthProvider";
import { Providers } from "@/providers/queryProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocationProvider } from '@/lib/context/LocationContext';
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import "@workspace/ui/globals.css"
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { fontVars } from "@/lib/fonts/registry";


export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

    const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html  
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning>
        <head>
                  <ThemeBootScript />
        </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <TooltipProvider>
             <PreferencesStoreProvider
            themeMode={theme_mode}
            themePreset={theme_preset}
            contentLayout={content_layout}
            navbarStyle={navbar_style}
            font={font}
          >
     <LocationProvider>
        <MedusaAuthProvider>
        <Providers>
        <ThemeProvider>
            <AuthProvider>

          {children}
          </AuthProvider>
          </ThemeProvider>
        </Providers>
        </MedusaAuthProvider>
</LocationProvider>
</PreferencesStoreProvider>
        </TooltipProvider>

      </body>
    </html>
  );
}