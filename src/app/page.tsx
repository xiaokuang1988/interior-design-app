'use client';

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { formatDate, exportProjectAsJSON } from '@/utils/storage';

export default function HomePage() {
  const { state, dispatch, currentProject } = useProject();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const createProject = () => {
    if (!newName.trim()) return;
    dispatch({ type: 'CREATE_PROJECT', payload: { name: newName, description: newDesc } });
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  const sortedProjects = [...state.projects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">🏡 我的设计方案</h1>
          <p className="text-gray-400 mt-1">管理你的室内设计项目</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2">
          ✨ 新建项目
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">✨ 创建新项目</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">项目名称</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="例：我的新家装修方案" autoFocus
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">项目描述</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="简单描述这个项目..." rows={3}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition">取消</button>
                <button onClick={createProject}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {sortedProjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🏠</p>
          <p className="text-xl text-gray-400 mb-2">还没有任何项目</p>
          <p className="text-sm text-gray-500">点击上方「新建项目」开始你的设计之旅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map(project => {
            const isActive = project.id === state.currentProjectId;
            return (
              <div key={project.id}
                className={`rounded-xl p-5 border transition cursor-pointer group ${
                  isActive ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                }`}
                onClick={() => dispatch({ type: 'SELECT_PROJECT', payload: { projectId: project.id } })}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    {project.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{project.description}</p>}
                  </div>
                  {isActive && <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-1 rounded-full">当前</span>}
                </div>

                <div className="flex gap-4 text-xs text-gray-500 mb-4">
                  <span>🏠 {project.rooms.length} 个房间</span>
                  <span>💰 {project.budgetItems.length} 条预算</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(project.updatedAt)}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={e => { e.stopPropagation(); exportProjectAsJSON(project); }}
                      className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">📥 导出</button>
                    <button onClick={e => {
                      e.stopPropagation();
                      if (confirm(`确定删除项目 "${project.name}" 吗？`)) {
                        dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id } });
                      }
                    }} className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Details - Timeline & Notes */}
      {currentProject && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">📝 项目备注</h3>
            <textarea
              value={currentProject.notes}
              onChange={e => dispatch({ type: 'UPDATE_NOTES', payload: { projectId: currentProject.id, notes: e.target.value } })}
              placeholder="记录你的想法..."
              rows={6}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Timeline */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">📅 项目时间线</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {currentProject.timeline.length === 0 ? (
                <p className="text-sm text-gray-500">暂无记录</p>
              ) : [...currentProject.timeline].reverse().map(entry => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <span className="text-xs text-gray-500 shrink-0 w-16">{new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  <div>
                    <span className="text-gray-300">{entry.action}</span>
                    <p className="text-xs text-gray-500">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
