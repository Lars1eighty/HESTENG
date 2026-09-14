import type { ReactNode } from "react";

import TrainingGameHelp from "@/components/training/TrainingGameHelp";
import TrainingQuickLinks from "@/components/training/TrainingQuickLinks";

export default function TrainingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TrainingQuickLinks />
      <TrainingGameHelp />
    </>
  );
}
