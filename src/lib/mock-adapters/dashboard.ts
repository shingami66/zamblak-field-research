export interface DashboardSummary {
  activeProjects: number;
  todayParticipations: number;
  pendingReviews: number;
  upcomingPayments?: number; // Owner only
}

export const mockDashboardSummary: DashboardSummary = {
  activeProjects: 4,
  todayParticipations: 12,
  pendingReviews: 3,
  upcomingPayments: 2450, // This should only be shown to Owner
};
