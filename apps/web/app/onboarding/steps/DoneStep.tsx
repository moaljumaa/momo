"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DoneStep() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }),
    });
  }, []);

  const embedSnippet = `<script src="${origin}/widget.js" data-api-base="${origin}"></script>`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-normal text-soft">
        Paste this before the closing <code>&lt;/body&gt;</code> tag on your site.
      </p>
      <pre className="overflow-x-auto rounded-[1rem] border border-edge bg-well p-4 text-xs font-light">
        <code>{embedSnippet}</code>
      </pre>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(embedSnippet);
            setCopied(true);
          }}
          className="rounded-full px-4"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button onClick={() => router.push("/")} className="rounded-full px-5">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
