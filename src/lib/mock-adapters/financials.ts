export type MockFinancialSummary = {
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  pendingInvoices: number;
};

export function getMockFinancialSummary(): MockFinancialSummary {
  return {
    totalRevenue: "145,000 ر.س",
    totalExpenses: "82,500 ر.س",
    netProfit: "62,500 ر.س",
    pendingInvoices: 4,
  };
}

export type MockInvoice = {
  id: string;
  clientName: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
};

export function getMockInvoices(): MockInvoice[] {
  return [
    {
      id: "INV-2026-001",
      clientName: "شركة التقنية الحديثة",
      amount: "15,000 ر.س",
      status: "paid",
      dueDate: "2026-07-01",
    },
    {
      id: "INV-2026-002",
      clientName: "مؤسسة التطوير العمراني",
      amount: "22,500 ر.س",
      status: "pending",
      dueDate: "2026-07-25",
    },
    {
      id: "INV-2026-003",
      clientName: "الشركة السعودية للتسويق",
      amount: "8,000 ر.س",
      status: "overdue",
      dueDate: "2026-06-15",
    },
  ];
}
