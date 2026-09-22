import "./globals.css";
import { Onest } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const onest = Onest({subsets:['latin'],weight:['300','400','500'],variable:'--font-sans'});

export const metadata = { title: "momo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", onest.variable)}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          theme="system"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex items-center gap-3 rounded-[1rem] border border-line bg-sheet px-4 py-3 text-sm font-light text-ink shadow-sm w-full",
              title: "font-normal",
              description: "text-faint",
              error: "border-clay/60",
              success: "border-sky/60",
            },
          }}
        />
      </body>
    </html>
  );
}
