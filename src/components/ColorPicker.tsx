'use client';

import { useProject } from '@/contexts/ProjectContext';
import { wallColorPresets, floorPresets, stylePresets } from '@/data/styles';


export default function ColorPicker() {
  const { currentProject, currentRoom, dispatch } = useProject();

  if (!currentProject || !currentRoom) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-4xl mb-3">🎨</p>
        <p>请先在仪表盘创建项目，然后在房间规划页创建房间</p>
      </div>
    );
  }

  const updateRoom = (updates: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_ROOM', payload: { projectId: currentProject.id, roomId: currentRoom.id, updates } });
  };

  return (
    <div className="space-y-8">
      {/* Style Presets */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">🎯 风格预设</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylePresets.map(s => (
            <button key={s.id} onClick={() => updateRoom({ wallColor: s.wallColor, floorType: s.floorType, floorColor: s.floorColor })}
              className="p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500/50 transition text-left group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{s.thumbnail}</span>
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.nameEn}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">{s.description}</p>
              <div className="flex gap-1">
                <div className="w-8 h-8 rounded border border-gray-600" style={{ backgroundColor: s.wallColor }} title="墙面" />
                <div className="w-8 h-8 rounded border border-gray-600" style={{ backgroundColor: s.floorColor }} title="地板" />
                {s.accentColors.map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded border border-gray-600" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Wall Color */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">🖌️ 墙面颜色</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg border-2 border-gray-600" style={{ backgroundColor: currentRoom.wallColor }} />
          <div>
            <p className="text-sm text-gray-300">当前颜色</p>
            <input type="color" value={currentRoom.wallColor} onChange={e => updateRoom({ wallColor: e.target.value })}
              className="mt-1 w-20 h-8 bg-transparent cursor-pointer" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {wallColorPresets.map(p => (
            <button key={p.color} onClick={() => updateRoom({ wallColor: p.color })}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${
                currentRoom.wallColor === p.color ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}>
              <div className="w-10 h-10 rounded" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-gray-400">{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Floor */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">🪵 地板材质</h3>
        <div className="flex flex-wrap gap-2">
          {floorPresets.map((p, i) => (
            <button key={i}
              onClick={() => updateRoom({ floorType: p.type, floorColor: p.color })}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${
                currentRoom.floorColor === p.color && currentRoom.floorType === p.type
                  ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}>
              <div className="w-10 h-10 rounded" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-gray-400">{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">👁️ 实时预览</h3>
        <div className="rounded-xl overflow-hidden border border-gray-700 max-w-lg">
          <div className="h-40 relative" style={{ backgroundColor: currentRoom.wallColor }}>
            <div className="absolute inset-x-0 bottom-0 h-2 bg-gray-600" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-16 border-2 border-gray-400/30 rounded-sm bg-blue-200/10" />
            <p className="absolute top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500">窗户</p>
          </div>
          <div className="h-20" style={{ backgroundColor: currentRoom.floorColor }}>
            <div className="flex items-end justify-center h-full pb-2">
              <span className="text-xs text-gray-600">{currentRoom.name} · 地板预览</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
