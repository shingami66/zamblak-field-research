import React from 'react';
import type { DashboardRole } from "@/lib/auth/mock-role";

interface DashboardShellProps {
  role: DashboardRole;
}

export function DashboardShell({ role }: DashboardShellProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-primary mb-3">
          لوحة المتابعة الميدانية
        </h1>
        <p className="text-xl text-primary/80">
          {role === "owner"
            ? "متابعة المشاريع والمستجيبين"
            : "متابعة العمليات وتحديث بيانات المستجيبين"}
        </p>
      </div>

      {/* Main Content Area - Empty State */}
      <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">

        {/* Placeholder Icon / Graphic */}
        <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        {/* Placeholder Text */}
        <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          {role === "owner"
            ? "مرحباً بك في مساحة الإدارة"
            : "مرحباً بك في مساحة الدعم والمتابعة"}
        </h2>
        <p className="text-lg text-primary/70 text-center max-w-2xl leading-relaxed mb-8">
          هذه الواجهة قيد الإعداد حالياً. قريباً ستتمكن من عرض المشاريع الميدانية ومتابعة تقدم العمليات بشكل تفصيلي ومريح.
        </p>

        {/* Static Placeholder Action Area */}
        <div className="bg-background rounded-xl p-6 border border-gray-100 w-full max-w-md text-center">
          <p className="text-primary/60 text-base font-medium">
            مساحة مخصصة لعرض ملخص العمليات والأدوات قريباً...
          </p>
        </div>
      </div>
    </div>
  );
}
