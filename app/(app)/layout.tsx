import Sidebar from "@/components/Sidebar";
import { colors } from "@/lib/tokens";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{
        marginLeft: "185px",
        flex: 1,
        backgroundColor: colors.background,
        minHeight: "100vh",
        padding: "64px",
        maxWidth: "calc(1280px + 185px)",
        boxSizing: "border-box",
      }}>
        {children}
      </main>
    </div>
  );
}
