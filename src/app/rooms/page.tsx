'use client';

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import RoomCanvas from '@/components/RoomCanvas';
import FurniturePanel from '@/components/FurniturePanel';
import { Room, RoomType } from '@/types';
import { generateId } from '@/utils/storage';

const roomTypeOptions: { type: RoomType; label: string; emoji: string }[] = [
  { type: 'ldk', label: 'LDK (客餐厅)', emoji: '🏠' },
  { type: 'bedroom', label: '卧室', emoji: '🛏️' },
  { type: 'bathroom', label: '卫生间', emoji: '🚿' },
  { type: 'study', label: '书房', emoji: '📚' },
  { type: 'entrance', label: '玄关', emoji: '🚪' },
  { type: 'balcony', label: '阳台', emoji: '🌅' },
  { type: 'other', label: '其他', emoji: '📦' },
];

export default function RoomsPage() {
  const { state, dispatch, currentProject, currentRoom } = useProject();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'ldk' as RoomType, width: 500, depth: 400, height: 250 });

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-6xl mb-4">📐</p>
          <p className="text-xl text-gray-400 mb-2">请先选择或创建一个项目</p>
          <p className="text-sm text-gray-500">在仪表盘页面创建新项目后即可使用房间规划器</p>
        </div>
      </div>
    );
  }

  const addRoom = () => {
    if (!newRoom.name.trim()) return;
    const room: Room = {
      id: generateId(),
      name: newRoom.name,
      type: newRoom.type,
      width: newRoom.width,
      depth: newRoom.depth,
      height: newRoom.height,
      wallColor: '#E5E7EB',
      floorType: 'wood',
      floorColor: '#D4B896',
      furniture: [],
    };
    dispatch({ type: 'ADD_ROOM', payload: { projectId: currentProject.id, room } });
    setNewRoom({ name: '', type: 'ldk', width: 500, depth: 400, height: 250 });
    setShowAddRoom(false);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Room List */}
      <div className="w-56 bg-gray-900/50 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">🏠 房间列表</h3>
            <button onClick={() => setShowAddRoom(!showAddRoom)}
              className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition">+ 添加</button>
          </div>
        </div>

        {showAddRoom && (
          <div className="p-3 border-b border-gray-800 space-y-2 bg-gray-800/50">
            <input type="text" placeholder="房间名称" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white" autoFocus />
            <select value={newRoom.type} onChange={e => setNewRoom({ ...newRoom, type: e.target.value as RoomType })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white">
              {roomTypeOptions.map(o => <option key={o.type} value={o.type}>{o.emoji} {o.label}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="text-[10px] text-gray-500">宽(cm)</label>
                <input type="number" value={newRoom.width} onChange={e => setNewRoom({ ...newRoom, width: Number(e.target.value) })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">深(cm)</label>
                <input type="number" value={newRoom.depth} onChange={e => setNewRoom({ ...newRoom, depth: Number(e.target.value) })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">高(cm)</label>
                <input type="number" value={newRoom.height} onChange={e => setNewRoom({ ...newRoom, height: Number(e.target.value) })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
              </div>
            </div>
            <button onClick={addRoom} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs font-medium transition">
              创建房间
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {currentProject.rooms.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">暂无房间</p>
          ) : currentProject.rooms.map(room => {
            const isActive = room.id === state.selectedRoomId;
            const typeInfo = roomTypeOptions.find(o => o.type === room.type);
            return (
              <button key={room.id} onClick={() => dispatch({ type: 'SELECT_ROOM', payload: { roomId: room.id } })}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800'
                }`}>
                <div className="flex items-center justify-between">
                  <span>{typeInfo?.emoji} {room.name}</span>
                  <button onClick={e => {
                    e.stopPropagation();
                    if (confirm(`确定删除房间 "${room.name}" 吗？`)) {
                      dispatch({ type: 'DELETE_ROOM', payload: { projectId: currentProject.id, roomId: room.id } });
                    }
                  }} className="text-red-400 hover:text-red-300 text-xs opacity-0 group-hover:opacity-100">✕</button>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{(room.width / 100).toFixed(1)}m × {(room.depth / 100).toFixed(1)}m · {room.furniture.length}件家具</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentRoom ? (
          <RoomCanvas room={currentRoom} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-4xl mb-3">📐</p>
              <p className="text-gray-400">选择或添加一个房间开始设计</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Furniture */}
      <div className="w-56 bg-gray-900/50 border-l border-gray-800 shrink-0">
        <FurniturePanel />
      </div>
    </div>
  );
}
