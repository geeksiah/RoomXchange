import { DashboardShell } from "../../components/dashboard-shell";

export default function DashboardLayout({ children }: { children: any }) {
  return <DashboardShell>{children}</DashboardShell>;
}
