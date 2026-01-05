"use server";

import { createClient } from "@/utils/supabase/server";
import { formatLocalDate, getDateNDaysAgo, getStartOfWeek, getStartOfMonth, getEndOfMonth } from "@/utils/dateHelpers";
import { getUserGoals, UserGoals } from "./userGoals";
import { FoodLogEntry } from "./foodLog";

export interface DailyAggregate {
  date: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  entryCount: number;
}

export interface WeeklyAggregate {
  weekStart: string;
  weekEnd: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalDays: number;
  dailyData: DailyAggregate[];
}

export interface InsightsSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalDaysLogged: number;
  goalAdherencePercent: number;
}

export interface InsightsData {
  aggregates: DailyAggregate[];
  goals: UserGoals | null;
  summary: InsightsSummary;
}

export interface InsightsResponse {
  success: boolean;
  data?: InsightsData;
  error?: string;
}

async function getFoodLogsForDateRange(startDate: string, endDate: string): Promise<FoodLogEntry[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching food logs for range:", error);
    return [];
  }

  return data || [];
}

function aggregateByDay(logs: FoodLogEntry[]): DailyAggregate[] {
  const dayMap = new Map<string, DailyAggregate>();

  for (const log of logs) {
    const existing = dayMap.get(log.date);
    if (existing) {
      existing.calories += log.calories || 0;
      existing.protein += log.protein || 0;
      existing.carbohydrates += log.carbohydrates || 0;
      existing.fat += log.total_fat || 0;
      existing.entryCount += 1;
    } else {
      dayMap.set(log.date, {
        date: log.date,
        calories: log.calories || 0,
        protein: log.protein || 0,
        carbohydrates: log.carbohydrates || 0,
        fat: log.total_fat || 0,
        entryCount: 1,
      });
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSummary(aggregates: DailyAggregate[], goals: UserGoals | null): InsightsSummary {
  if (aggregates.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalDaysLogged: 0,
      goalAdherencePercent: 0,
    };
  }

  const totalCalories = aggregates.reduce((sum, a) => sum + a.calories, 0);
  const totalProtein = aggregates.reduce((sum, a) => sum + a.protein, 0);
  const totalCarbs = aggregates.reduce((sum, a) => sum + a.carbohydrates, 0);
  const totalFat = aggregates.reduce((sum, a) => sum + a.fat, 0);
  const daysWithData = aggregates.filter((a) => a.entryCount > 0).length;

  const avgCalories = daysWithData > 0 ? totalCalories / daysWithData : 0;
  const avgProtein = daysWithData > 0 ? totalProtein / daysWithData : 0;
  const avgCarbs = daysWithData > 0 ? totalCarbs / daysWithData : 0;
  const avgFat = daysWithData > 0 ? totalFat / daysWithData : 0;

  let goalAdherencePercent = 0;
  if (goals && daysWithData > 0) {
    const calorieGoal = goals.calorie_goal || 2000;
    const daysWithinGoal = aggregates.filter((a) => {
      const lowerBound = calorieGoal * 0.9;
      const upperBound = calorieGoal * 1.1;
      return a.calories >= lowerBound && a.calories <= upperBound;
    }).length;
    goalAdherencePercent = Math.round((daysWithinGoal / daysWithData) * 100);
  }

  return {
    avgCalories: Math.round(avgCalories),
    avgProtein: Math.round(avgProtein),
    avgCarbs: Math.round(avgCarbs),
    avgFat: Math.round(avgFat),
    totalDaysLogged: daysWithData,
    goalAdherencePercent,
  };
}

export async function getDailyInsights(days: number = 7): Promise<InsightsResponse> {
  try {
    const endDate = formatLocalDate(new Date());
    const startDate = getDateNDaysAgo(days - 1);

    const [logs, goalsResponse] = await Promise.all([getFoodLogsForDateRange(startDate, endDate), getUserGoals()]);

    const goals = goalsResponse.success ? (goalsResponse.data ?? null) : null;
    const aggregates = aggregateByDay(logs);

    const allDates: DailyAggregate[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = getDateNDaysAgo(i);
      const existing = aggregates.find((a) => a.date === dateStr);
      allDates.push(
        existing || {
          date: dateStr,
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          entryCount: 0,
        }
      );
    }

    const summary = calculateSummary(
      allDates.filter((a) => a.entryCount > 0),
      goals
    );

    return {
      success: true,
      data: {
        aggregates: allDates,
        goals,
        summary,
      },
    };
  } catch (error) {
    console.error("Error getting daily insights:", error);
    return { success: false, error: "Failed to fetch insights data" };
  }
}

export async function getWeeklyInsights(weeks: number = 4): Promise<InsightsResponse> {
  try {
    const today = new Date();
    const endOfCurrentWeek = getStartOfWeek(today);
    endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6);

    const startOfRange = getStartOfWeek(today);
    startOfRange.setDate(startOfRange.getDate() - (weeks - 1) * 7);

    const startDate = formatLocalDate(startOfRange);
    const endDate = formatLocalDate(endOfCurrentWeek);

    const [logs, goalsResponse] = await Promise.all([getFoodLogsForDateRange(startDate, endDate), getUserGoals()]);

    const goals = goalsResponse.success ? (goalsResponse.data ?? null) : null;
    const aggregates = aggregateByDay(logs);

    const summary = calculateSummary(
      aggregates.filter((a) => a.entryCount > 0),
      goals
    );

    return {
      success: true,
      data: {
        aggregates,
        goals,
        summary,
      },
    };
  } catch (error) {
    console.error("Error getting weekly insights:", error);
    return { success: false, error: "Failed to fetch weekly insights data" };
  }
}

export async function getMonthlyInsights(year?: number, month?: number): Promise<InsightsResponse> {
  try {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const startDate = getStartOfMonth(targetYear, targetMonth);
    const endDate = getEndOfMonth(targetYear, targetMonth);

    const [logs, goalsResponse] = await Promise.all([getFoodLogsForDateRange(startDate, endDate), getUserGoals()]);

    const goals = goalsResponse.success ? (goalsResponse.data ?? null) : null;
    const aggregates = aggregateByDay(logs);

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const allDates: DailyAggregate[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const existing = aggregates.find((a) => a.date === dateStr);
      allDates.push(
        existing || {
          date: dateStr,
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          entryCount: 0,
        }
      );
    }

    const summary = calculateSummary(
      allDates.filter((a) => a.entryCount > 0),
      goals
    );

    return {
      success: true,
      data: {
        aggregates: allDates,
        goals,
        summary,
      },
    };
  } catch (error) {
    console.error("Error getting monthly insights:", error);
    return { success: false, error: "Failed to fetch monthly insights data" };
  }
}
