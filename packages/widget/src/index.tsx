import { render } from "preact";
import { App } from "./App";
import themeCss from "./theme.css?inline";

// One <script src="https://<your-domain>/widget.js"></script> tag embed.
// apiBase defaults to the origin the script itself was loaded from.
const currentScript = document.currentScript as HTMLScriptElement | null;
const apiBase = currentScript?.dataset.apiBase ?? new URL(currentScript?.src ?? location.href).origin;

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
