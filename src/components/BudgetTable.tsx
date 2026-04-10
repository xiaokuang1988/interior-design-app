'use client';

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { BudgetItem, BudgetCategory, BudgetCategoryLabels } from '@/types';
import { generateId, formatCurrency } from '@/utils/storage';

export default function BudgetTable() {
  const { currentProject, dispatch } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    roomId: '', category: 'material' as BudgetCategory, name: '', plannedAmount: 0, actualAmount: 0, note: '',
  });

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-4xl mb-3">💰</p>
        <p>请先在仪表盘创建项目</p>
      </div>
    );
  }

  const items = currentProject.budgetItems;
  const rooms = currentProject.rooms;

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const item: BudgetItem = { id: generateId(), ...newItem };
    dispatch({ type: 'ADD_BUDGET_ITEM', payload: { projectId: currentProject.id, item } });
    setNewItem({ roomId: '', category: 'material', name: '', plannedAmount: 0, actualAmount: 0, note: '' });
  };

  const deleteItem = (itemId: string) => {
    dispatch({ type: 'DELETE_BUDGET_ITEM', payload: { projectId: currentProject.id, itemId } });
  };

  const updateItem = (itemId: string, updates: Partial<BudgetItem>) => {
    dispatch({ type: 'UPDATE_BUDGET_ITEM', payload: { projectId: currentProject.id, itemId, updates } });
  };

  const totalPlanned = items.reduce((s, i) => s + i.plannedAmount, 0);
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0);
  const diff = totalPlanned - totalActual;

  // Group by category for chart
  const categoryTotals = (Object.keys(BudgetCategoryLabels) as BudgetCategory[]).map(cat => ({
    cat,
    label: BudgetCategoryLabels[cat],
    planned: items.filter(i => i.category === cat).reduce((s, i) => s + i.plannedAmount, 0),
    actual: items.filter(i => i.category === cat).reduce((s, i) => s + i.actualAmount, 0),
  }));

  const maxAmount = Math.max(...categoryTotals.map(c => Math.max(c.planned, c.actual)), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500">预算总额</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(totalPlanned)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500">实际支出</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{formatCurrency(totalActual)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500">预算余额</p>
          <p className={`text-2xl font-bold mt-1 ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-4">📊 预算 vs 实际对比</h3>
        <div className="space-y-3">
          {categoryTotals.map(c => (
            <div key={c.cat}>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{c.label}</span>
                <span>{formatCurrency(c.planned)} / {formatCurrency(c.actual)}</span>
              </div>
              <div className="relative h-6 bg-gray-900 rounded overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-blue-600/40 rounded transition-all" style={{ width: `${(c.planned / maxAmount) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-orange-500/60 rounded transition-all" style={{ width: `${(c.actual / maxAmount) * 100}%`, height: '60%', top: '20%' }} />
              </div>
            </div>
          ))}
          <div className="flex gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600/40 rounded" /> 预算</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500/60 rounded" /> 实际</span>
          </div>
        </div>
      </div>

      {/* Add Item Form */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-3">➕ 添加预算项目</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value as BudgetCategory })}
            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white">
            {(Object.keys(BudgetCategoryLabels) as BudgetCategory[]).map(c => (
              <option key={c} value={c}>{BudgetCategoryLabels[c]}</option>
            ))}
          </select>
          <select value={newItem.roomId} onChange={e => setNewItem({ ...newItem, roomId: e.target.value })}
            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white">
            <option value="">全局</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="text" placeholder="名称" value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white" />
          <input type="number" placeholder="预算" value={newItem.plannedAmount || ''}
            onChange={e => setNewItem({ ...newItem, plannedAmount: Number(e.target.value) })}
            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white" />
          <input type="number" placeholder="实际" value={newItem.actualAmount || ''}
            onChange={e => setNewItem({ ...newItem, actualAmount: Number(e.target.value) })}
            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white" />
          <button onClick={addItem}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition">
            添加
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">分类</th>
              <th className="px-4 py-3 font-medium">房间</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium text-right">预算</th>
              <th className="px-4 py-3 font-medium text-right">实际</th>
              <th className="px-4 py-3 font-medium text-right">差额</th>
              <th className="px-4 py-3 font-medium">备注</th>
              <th className="px-4 py-3 font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无预算项目，请添加</td></tr>
            ) : items.map(item => {
              const itemDiff = item.plannedAmount - item.actualAmount;
              const isEditing = editingId === item.id;
              const roomName = rooms.find(r => r.id === item.roomId)?.name ?? '全局';
              return (
                <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 text-gray-300">
                    {isEditing ? (
                      <select value={item.category} onChange={e => updateItem(item.id, { category: e.target.value as BudgetCategory })}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-full">
                        {(Object.keys(BudgetCategoryLabels) as BudgetCategory[]).map(c => (
                          <option key={c} value={c}>{BudgetCategoryLabels[c]}</option>
                        ))}
                      </select>
                    ) : BudgetCategoryLabels[item.category]}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{roomName}</td>
                  <td className="px-4 py-3 text-white">
                    {isEditing ? (
                      <input type="text" value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-full" />
                    ) : item.name}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400">
                    {isEditing ? (
                      <input type="number" value={item.plannedAmount} onChange={e => updateItem(item.id, { plannedAmount: Number(e.target.value) })}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-24 text-right" />
                    ) : formatCurrency(item.plannedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-400">
                    {isEditing ? (
                      <input type="number" value={item.actualAmount} onChange={e => updateItem(item.id, { actualAmount: Number(e.target.value) })}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-24 text-right" />
                    ) : formatCurrency(item.actualAmount)}
                  </td>
                  <td className={`px-4 py-3 text-right ${itemDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {itemDiff >= 0 ? '+' : ''}{formatCurrency(itemDiff)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {isEditing ? (
                      <input type="text" value={item.note} onChange={e => updateItem(item.id, { note: e.target.value })}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-full" />
                    ) : item.note}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditingId(isEditing ? null : item.id)}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                        {isEditing ? '✓' : '✎'}
                      </button>
                      <button onClick={() => deleteItem(item.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
