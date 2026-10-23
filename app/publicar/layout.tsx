import { headers } from "next/headers";
import { type ReactNode, Suspense } from "react";
import { navigationEntryPolicy } from "@/modules/listing-publication/domain/navigation-entry-policy";
import { NavigationEntryBoundary } from "../../components/client/NavigationEntryBoundary";

export default async function PublicationLayout({ children }: { children: ReactNode }) {
  const transport = await headers();
  // Public Fetch metadata survives Next's Flight header sanitization. Unknown
  // transport stays native; an action/body fetch is not a navigation entry.
  if (
    transport.get("sec-fetch-dest") !== "empty" ||
    transport.has("next-action") ||
    transport.has("content-type")
  )
    return children;

  return (
    <NavigationEntryBoundary policy={navigationEntryPolicy()}>
      <Suspense fallback={null}>{children}</Suspense>
    </NavigationEntryBoundary>
  );
}
