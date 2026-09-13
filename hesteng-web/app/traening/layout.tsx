import type { ReactNode } from "react";

import TrainingQuickLinks from "@/components/training/TrainingQuickLinks";

export default function TrainingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TrainingQuickLinks />
    </>
  );
}
