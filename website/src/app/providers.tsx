"use client";

import { FluentProvider } from "@fluentui/react-provider";
import { webLightTheme } from "@fluentui/react-theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return <FluentProvider theme={webLightTheme}>{children}</FluentProvider>;
}
