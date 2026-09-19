import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const { action, id } = body;

    if (!action || !id) return json({ error: "action and id are required" }, 400);

    // ── EDIT ──────────────────────────────────────────────────────────────────
    if (action === "edit") {
      const { label, slug, sort_order, icon_url } = body;
      if (!label || !slug) return json({ error: "label and slug are required" }, 400);

      const updates: Record<string, unknown> = { label, slug, sort_order: sort_order ?? 0 };
      if (icon_url !== undefined) updates.icon_url = icon_url;

      const { error } = await supabaseAdmin
        .from("categories")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      return json({ success: true });
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────
    if (action === "delete") {
      // Collect all category ids to delete (category + its subcategories)
      const { data: subcategories } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("parent_id", id);

      const subIds = (subcategories ?? []).map((s: { id: string }) => s.id);
      const allIds = [id, ...subIds];

      // Delete category_fields for all affected categories
      await supabaseAdmin.from("category_fields").delete().in("category_id", allIds);

      // Delete subcategories first, then the category itself
      if (subIds.length > 0) {
        await supabaseAdmin.from("categories").delete().in("id", subIds);
      }

      const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);
      if (error) throw error;

      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return json({ error: message }, 500);
  }
});
