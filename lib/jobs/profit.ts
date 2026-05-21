import type { Job } from "@/lib/types/database";

export function calcProfit(job: Pick<Job, "sale_price" | "cost" | "shipping_cost" | "other_cost">) {
  const revenue = Number(job.sale_price ?? 0);
  const expense = Number(job.cost ?? 0) + Number(job.shipping_cost ?? 0) + Number(job.other_cost ?? 0);
  return { revenue, expense, profit: revenue - expense, margin: revenue > 0 ? (revenue - expense) / revenue : 0 };
}
