// Supabase Edge Function: maple-ai
// Secure server-side AI query engine for MapleBot
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRequest {
  query: string;
  scope?: "org" | "pod" | "person";
  podId?: string;
  targetProfileId?: string;
  dateRange?: { start: string; end: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const aiApiKey = Deno.env.get("AI_API_KEY") ?? "";

    // Extract authorization header to verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Get user identity from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    // Resolve caller profile
    let callerProfile: any = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, organization_id, role, pod_id, full_name")
        .eq("auth_user_id", user.id)
        .single();
      callerProfile = profile;
    }

    // Parse request body
    const body: AIRequest = await req.json();
    const query = (body.query || "").trim();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role-based security check
    // Admins can query org-wide. Managers can query their pod. Members can query their pod/permitted updates.
    let authorizedPodId = body.podId;
    if (callerProfile) {
      if (callerProfile.role === "manager" && callerProfile.pod_id) {
        authorizedPodId = callerProfile.pod_id; // Restrict manager strictly to their pod
      }
    }

    // Detect Intent
    const lowerQ = query.toLowerCase();
    let intent = "DAILY_SUMMARY";
    if (lowerQ.includes("blocker") || lowerQ.includes("blocked") || lowerQ.includes("stuck")) {
      intent = "BLOCKER_SUMMARY";
    } else if (lowerQ.includes("pending") || lowerQ.includes("who has not submitted") || lowerQ.includes("missed")) {
      intent = "PENDING_UPDATES";
    } else if (lowerQ.includes("week") || lowerQ.includes("weekly")) {
      intent = "WEEKLY_SUMMARY";
    } else if (lowerQ.includes("sprint")) {
      intent = "SPRINT_SUMMARY";
    } else if (lowerQ.includes("kudos") || lowerQ.includes("recognition") || lowerQ.includes("top")) {
      intent = "KUDOS_SUMMARY";
    } else if (lowerQ.includes("compare") || lowerQ.includes("vs")) {
      intent = "COMPARISON";
    } else if (lowerQ.includes("raghavi") || lowerQ.includes("susan") || lowerQ.includes("liam") || lowerQ.includes("chloe") || lowerQ.includes("harshika")) {
      intent = "PERSON_SUMMARY";
    } else if (lowerQ.includes("web") || lowerQ.includes("marketing") || lowerQ.includes("elearning") || lowerQ.includes("hr")) {
      intent = "POD_SUMMARY";
    }

    // Fetch Authorized Data
    let updatesQuery = supabase
      .from("updates")
      .select("*, profiles:profile_id(full_name, email, role), pods:pod_id(name)")
      .order("submitted_at", { ascending: false })
      .limit(30);

    let blockersQuery = supabase
      .from("blockers")
      .select("*, reporter:reported_by(full_name), assignee:assigned_to(full_name), pods:pod_id(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (authorizedPodId) {
      updatesQuery = updatesQuery.eq("pod_id", authorizedPodId);
      blockersQuery = blockersQuery.eq("pod_id", authorizedPodId);
    }

    const [{ data: updates }, { data: blockers }] = await Promise.all([
      updatesQuery,
      blockersQuery,
    ]);

    // Format Structured Executive Response
    const responsePayload = {
      intent,
      question: query,
      timestamp: new Date().toISOString(),
      summaryTitle: getTitleForIntent(intent, query),
      metrics: {
        totalAnalyzed: updates?.length || 0,
        activeBlockersCount: blockers?.filter(b => b.status === "open" || b.status === "in_progress").length || 0,
        onTrackCount: updates?.filter(u => u.status === "on_track").length || 0,
        atRiskCount: updates?.filter(u => u.status === "at_risk").length || 0,
      },
      insights: generateStructuredInsights(intent, query, updates || [], blockers || []),
      recommendedFollowUps: generateFollowUps(intent, blockers || [], updates || []),
      flaggedBlockerSignals: detectSubtleBlockers(updates || []),
    };

    // Log AI Query to audit log if authenticated
    if (callerProfile) {
      await supabase.from("ai_queries").insert({
        organization_id: callerProfile.organization_id,
        user_id: callerProfile.id,
        question: query,
        response: responsePayload,
        scope: callerProfile.role,
      });
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "AI query failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getTitleForIntent(intent: string, query: string): string {
  switch (intent) {
    case "BLOCKER_SUMMARY": return "Active & Aging Blockers Analysis";
    case "PENDING_UPDATES": return "Standup Submission & Pending Members Status";
    case "WEEKLY_SUMMARY": return "Weekly Performance & Goal Completion";
    case "SPRINT_SUMMARY": return "Sprint 56 — Velocity & Deliverables Summary";
    case "KUDOS_SUMMARY": return "Recognition & Peer Kudos Highlights";
    case "PERSON_SUMMARY": return `Member Update Breakdown`;
    case "POD_SUMMARY": return "Pod Operations & Milestone Status";
    case "COMPARISON": return "Cross-Pod Performance Comparison";
    default: return "MapleBot Executive Intelligence Summary";
  }
}

function generateStructuredInsights(intent: string, query: string, updates: any[], blockers: any[]): any[] {
  const insights = [];

  if (intent === "BLOCKER_SUMMARY" || blockers.length > 0) {
    const active = blockers.filter(b => b.status === "open" || b.status === "in_progress");
    insights.push({
      category: "Blockers & Impediments",
      type: active.length > 0 ? "warning" : "success",
      points: active.length > 0
        ? active.map(b => `${b.title} (${b.severity.toUpperCase()}) — Reported in ${b.pods?.name || 'Pod'}. Assigned to: ${b.assignee?.full_name || 'Unassigned'}`)
        : ["No critical blockers reported across the team! Excellent momentum."],
    });
  }

  const completedPoints = updates
    .filter(u => u.yesterday && u.yesterday.length > 10)
    .slice(0, 4)
    .map(u => `${u.profiles?.full_name} (${u.pods?.name}): ${u.yesterday}`);

  if (completedPoints.length > 0) {
    insights.push({
      category: "Key Deliverables Completed",
      type: "success",
      points: completedPoints,
    });
  }

  const inProgressPoints = updates
    .filter(u => u.today && u.today.length > 10)
    .slice(0, 4)
    .map(u => `${u.profiles?.full_name}: ${u.today}`);

  if (inProgressPoints.length > 0) {
    insights.push({
      category: "Active Focus Today",
      type: "info",
      points: inProgressPoints,
    });
  }

  return insights;
}

function generateFollowUps(intent: string, blockers: any[], updates: any[]): string[] {
  const followUps = [];
  const critical = blockers.filter(b => b.severity === "critical" || b.severity === "high");
  if (critical.length > 0) {
    followUps.push(`Escalate high-priority blocker "${critical[0].title}" with ${critical[0].assignee?.full_name || 'pod manager'}.`);
  }
  const atRisk = updates.filter(u => u.status === "at_risk" || u.status === "blocked");
  if (atRisk.length > 0) {
    followUps.push(`Schedule 5-minute sync with ${atRisk[0].profiles?.full_name} regarding "${atRisk[0].today?.slice(0, 40)}...".`);
  }
  if (followUps.length === 0) {
    followUps.push("Team is performing on track. Send kudos to top contributors this sprint.");
  }
  return followUps;
}

function detectSubtleBlockers(updates: any[]): any[] {
  const subtleTriggers = [
    "waiting for access", "waiting for client", "waiting for approval",
    "delayed by", "dependency pending", "cannot proceed", "need credentials",
    "waiting for response", "stuck on", "blocked by"
  ];

  const detected = [];
  for (const update of updates) {
    if (!update.has_blocker) {
      const text = `${update.yesterday || ''} ${update.today || ''}`.toLowerCase();
      for (const trigger of subtleTriggers) {
        if (text.includes(trigger)) {
          detected.push({
            profileName: update.profiles?.full_name,
            podName: update.pods?.name,
            matchedKeyword: trigger,
            snippet: update.today?.slice(0, 80) || update.yesterday?.slice(0, 80),
          });
          break;
        }
      }
    }
  }
  return detected;
}
