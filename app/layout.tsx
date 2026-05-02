import "./globals.css";
export const metadata = { title: "ASB Intranet", description: "Intranet cloud ASB", manifest: "/manifest.webmanifest" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
