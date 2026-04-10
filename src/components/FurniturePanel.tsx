'use client';

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { furnitureTemplates, furnitureCategories } from '@/data/furniture';
import { FurnitureCategory, PlacedFurniture } from '@/types';
import { generateId } from '@/utils/storage';

export default function FurniturePanel() {
  const { currentProject, currentRoom, dispatch } = useProject();
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('seating');

  const filtered = furnitureTemplates.filter(t => t.category === activeCategory);

  const addFurniture = (templateId: string) => {
    if (!currentProject || !currentRoom) return;
    const template = furnitureTemplates.find(t => t.id === templateId);
    if (!template) return;

    const furniture: PlacedFurniture = {
      instanceId: generateId(),
      templateId: template.id,
      name: template.name,
      emoji: template.emoji,
      x: Math.max(0, (currentRoom.width - template.width) / 2),
      y: Math.max(0, (currentRoom.depth - template.height) / 2),
      width: template.width,
      height: template.height,
      rotation: 0,
      color: template.color,
      locked: false,
    };

    dispatch({
      type: 'ADD_FURNITURE',
      payload: { projectId: currentProject.id, roomId: currentRoom.id, furniture },
    });
  };

  if (!currentRoom) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-2xl mb-2">📐</p>
        <p className="text-sm">请先选择一个房间</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-2">🪑 家具面板</h3>
        <div className="flex flex-wrap gap-1">
          {furnitureCategories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded text-xs transition ${
                activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(t => (
            <button key={t.id} onClick={() => addFurniture(t.id)}
              className="flex flex-col items-center p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500/50 transition text-center group">
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{t.emoji}</span>
              <span className="text-xs text-gray-300">{t.name}</span>
              <span className="text-[10px] text-gray-500">{t.width}×{t.height}cm</span>
            </button>
          ))}
        </div>
      </div>

      {currentRoom.furniture.length > 0 && (
        <div className="border-t border-gray-700 p-3">
          <h4 className="text-xs text-gray-500 mb-2">已放置 ({currentRoom.furniture.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {currentRoom.furniture.map(f => (
              <div key={f.instanceId}
                className="flex items-center justify-between text-xs bg-gray-800 rounded px-2 py-1.5">
                <span className="text-gray-300">{f.emoji} {f.name}</span>
                <button onClick={() => {
                  if (currentProject) dispatch({ type: 'DELETE_FURNITURE', payload: { projectId: currentProject.id, roomId: currentRoom.id, furnitureId: f.instanceId } });
                }} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
