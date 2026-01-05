import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getDailyInsights } from "@/app/actions/insights";
import InsightsClient from "./InsightsClient";

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const insightsResponse = await getDailyInsights(7);

  const initialData = insightsResponse.success && insightsResponse.data ? insightsResponse.data : null;

  return <InsightsClient initialData={initialData} />;
}
