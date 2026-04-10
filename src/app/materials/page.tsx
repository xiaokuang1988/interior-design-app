'use client';

import { useProject } from '@/contexts/ProjectContext';
import ColorPicker from '@/components/ColorPicker';

export default function MaterialsPage() {
  const { currentProject, currentRoom, dispatch } = useProject();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">🎨 选材与配色</h1>
        <p className="text-gray-400 mt-1">为你的房间选择墙面颜色和地板材质</p>
      </div>

      {/* Room Selector */}
      {currentProject && currentProject.rooms.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-gray-400">选择房间：</span>
          <div className="flex gap-2">
            {currentProject.rooms.map(room => (
              <button key={room.id}
                onClick={() => dispatch({ type: 'SELECT_ROOM', payload: { roomId: room.id } })}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  currentRoom?.id === room.id
                    ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }`}>
                {room.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <ColorPicker />
    </div>
  );
}
