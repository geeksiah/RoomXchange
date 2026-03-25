import { Providers } from "../providers";
import { DashboardShell } from "../../components/dashboard-shell";

export default function DashboardLayout({ children }: { children: any }) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  );
}
