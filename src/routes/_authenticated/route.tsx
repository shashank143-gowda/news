import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // fetch role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const role = (roles?.[0]?.role ?? "editor") as "editor" | "chief_editor";
    return { user: data.user, role };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
