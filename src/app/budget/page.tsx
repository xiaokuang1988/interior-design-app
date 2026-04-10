'use client';

import BudgetTable from '@/components/BudgetTable';

export default function BudgetPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">💰 预算管理</h1>
        <p className="text-gray-400 mt-1">跟踪你的装修预算和实际支出</p>
      </div>
      <BudgetTable />
    </div>
  );
}
