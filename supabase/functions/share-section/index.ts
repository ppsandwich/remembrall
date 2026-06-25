import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sectionId, sectionName, recipientEmail, permission } = await req.json();

    if (!sectionId || !sectionName || !recipientEmail || !permission) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["viewer", "editor"].includes(permission)) {
      return new Response(JSON.stringify({ error: "Invalid permission" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (recipientEmail.toLowerCase() === user.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Cannot share with yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: page } = await supabaseAdmin
      .from("note_pages")
      .select("user_id")
      .eq("id", sectionId)
      .single();

    if (!page || page.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "You do not own this section" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("section_shares")
      .insert({
        section_id: sectionId,
        owner_id: user.id,
        shared_with_email: recipientEmail.toLowerCase(),
        permission,
        status: "pending",
      })
      .select("share_token")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ error: "Already shared with this email" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to create share" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = inserted.share_token;
    const appUrl = Deno.env.get("APP_URL") || "https://brall.app";
    const acceptUrl = `${appUrl}/accept-share?token=${token}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const ownerName = user.email?.split("@")[0] || "Someone";
      const permissionLabel = permission === "editor" ? "edit" : "view";
      const subject = `${ownerName} shared a section with you on Brall`;
      const html = `<p><strong>${ownerName}</strong> shared the section <strong>"${sectionName}"</strong> with you on Brall (${permissionLabel} access).</p><p><a href="${acceptUrl}">Click here to access it</a>. The first person to open this link will be granted access.</p>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Brall <noreply@brall.app>",
          to: [recipientEmail],
          subject,
          html,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, shareToken: token, acceptUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
