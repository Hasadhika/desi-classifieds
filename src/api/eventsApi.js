import { supabase } from "./supabaseClient";

export const eventsApi = {
  /** Fetch all approved events (for home marquee) — SECURITY DEFINER bypasses GRANT/RLS */
  async getApproved() {
    const { data, error } = await supabase.rpc("get_approved_events");
    if (error) throw error;
    return data || [];
  },

  /** Fetch events for the current user */
  async getMyEvents(userEmail) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Fetch all events (admin) — uses SECURITY DEFINER RPC to bypass RLS */
  async getAll() {
    const { data, error } = await supabase.rpc("admin_get_all_events");
    if (error) throw error;
    return data || [];
  },

  /** Create a new event */
  async create(eventData) {
    const { data, error } = await supabase
      .from("events")
      .insert([eventData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update an event (owner only — pending events) */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Delete an event */
  async delete(id) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },

  /** Admin: approve or reject (calls SECURITY DEFINER RPC) */
  async updateStatus(eventId, newStatus, rejectionReason = null) {
    const { error } = await supabase.rpc("update_event_status", {
      p_event_id: eventId,
      p_new_status: newStatus,
      p_rejection_reason: rejectionReason,
    });
    if (error) throw error;
  },
};
