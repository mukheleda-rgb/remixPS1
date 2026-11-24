import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createRouter } from "./router";
import "./styles.css";

// Polyfill for URL.parse (needed for pdfjs-dist 5+ on some Android devices)
if (typeof URL !== "undefined" && !URL.parse) {
  (URL as any).parse = function (url: string | URL, base?: string | URL) {
    try {
      return new URL(url as string, base);
    } catch {
      return null;
    }
  };
}

const router = createRouter();

const rootElement = document.getElementById("root")!;
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
