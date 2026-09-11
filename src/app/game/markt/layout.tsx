import type { ReactNode } from "react";
import { MarktSubnav } from "./markt-nav";

export default function MarktLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <MarktSubnav />
      {children}
    </div>
  );
}
