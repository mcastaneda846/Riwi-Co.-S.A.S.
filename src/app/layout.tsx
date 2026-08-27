import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riwi Messenger",
  description: "Clean Architecture Messenger Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col m-0 p-0 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
