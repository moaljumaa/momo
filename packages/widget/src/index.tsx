import { render } from "preact";
import { App } from "./App";
import themeCss from "./theme.css?inline";

// One <script src="https://<your-domain>/widget.js"></script> tag embed.
// apiBase defaults to the origin the script itself was loaded from.
//
// document.currentScript is null for async scripts (the HTML spec nulls it out during
// async execution), which is exactly how Next.js's <Script strategy="afterInteractive">
// inserts tags — so embedding sites built with it would silently lose apiBase. Fall back
// to matching the tag by its own src instead.
const thisScript =
  (document.currentScript as HTMLScriptElement | null) ??
  (document.querySelector('script[src*="/widget.js"]') as HTMLScriptElement | null);
const apiBase = thisScript?.dataset.apiBase ?? new URL(thisScript?.src ?? location.href).origin;

const host = document.createElement("div");
host.id = "momo-widget-root";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = themeCss;
shadow.appendChild(style);

const mount = document.createElement("div");
shadow.appendChild(mount);

render(<App apiBase={apiBase} />, mount);
