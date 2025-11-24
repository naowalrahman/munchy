import DashboardClient from "./DashboardClient";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getMealSummary } from "@/app/actions/foodLog";
import { getUserGoals } from "@/app/actions/userGoals";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const today = new Date().toISOString().split("T")[0];
    const [mealSummary, goalsResponse] = await Promise.all([getMealSummary(today), getUserGoals()]);

    const mealData = mealSummary.success && mealSummary.data ? mealSummary.data : {};
    const initialEntries = Object.values(mealData).flat();
    const initialGoals = goalsResponse.success ? goalsResponse.data ?? null : null;

    return (
        <DashboardClient
            initialMealData={mealData}
            initialEntries={initialEntries}
            initialDate={today}
            initialGoals={initialGoals}
        />
    );
}
