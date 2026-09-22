// Bare page that mounts only the embed script, meant to be iframed by the Channels page.
// The widget uses position:fixed internally, so it needs its own viewport (an iframe) to
// preview correctly rather than being injected into a div on the admin page itself.
export default function WidgetPreview() {
  return (
    <div className="fixed inset-0 bg-bg">
      <script src="/widget.js" />
    </div>
  );
}
