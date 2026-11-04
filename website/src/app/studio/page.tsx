import type { Metadata } from "next";
import { PublishingStudio } from "../_components/publishing-studio";

export const metadata: Metadata = {
  title: "Publishing Studio",
};

export default function StudioPage() {
  return <PublishingStudio />;
}
