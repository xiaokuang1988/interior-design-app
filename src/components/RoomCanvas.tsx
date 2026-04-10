'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { drawGrid, drawRoom, drawFurniture, drawDimensions, hitTestFurniture, snapToGrid } from '@/utils/canvas';
import { Room } from '@/types';

export default function RoomCanvas({ room }: { room: Room }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, currentProject } = useProject();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredFurniture, setHoveredFurniture] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const padding = 60;
  const scale = Math.min((canvasSize.width - padding * 2) / room.width, (canvasSize.height - padding * 2) / room.depth, 2);
  const offsetX = (canvasSize.width - room.width * scale) / 2;
  const offsetY = (canvasSize.height - room.depth * scale) / 2;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setCanvasSize({ width: Math.floor(e.contentRect.width), height: Math.floor(e.contentRect.height) });
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (showGrid) drawGrid(ctx, canvas.width, canvas.height, scale);
    drawRoom(ctx, room, scale, offsetX, offsetY);
    drawDimensions(ctx, room, scale, offsetX, offsetY);

    const sorted = [...room.furniture].sort((a, b) => {
      if (a.instanceId === state.selectedFurnitureId) return 1;
      if (b.instanceId === state.selectedFurnitureId) return -1;
      return 0;
    });
    for (const f of sorted) {
      drawFurniture(ctx, f, scale, offsetX, offsetY, f.instanceId === state.selectedFurnitureId, f.instanceId === hoveredFurniture);
    }
  }, [room, scale, offsetX, offsetY, state.selectedFurnitureId, hoveredFurniture, showGrid, canvasSize]);

  useEffect(() => { draw(); }, [draw]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e);
    for (let i = room.furniture.length - 1; i >= 0; i--) {
      const f = room.furniture[i];
      if (hitTestFurniture(x, y, f, scale, offsetX, offsetY) && !f.locked) {
        dispatch({ type: 'SELECT_FURNITURE', payload: { furnitureId: f.instanceId } });
        setIsDragging(true);
        setDragOffset({ x: x - (offsetX + f.x * scale), y: y - (offsetY + f.y * scale) });
        return;
      }
    }
    dispatch({ type: 'SELECT_FURNITURE', payload: { furnitureId: null } });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e);
    if (isDragging && state.selectedFurnitureId && currentProject) {
      const nx = snapToGrid((x - dragOffset.x - offsetX) / scale);
      const ny = snapToGrid((y - dragOffset.y - offsetY) / scale);
      dispatch({
        type: 'UPDATE_FURNITURE',
        payload: {
          projectId: currentProject.id, roomId: room.id, furnitureId: state.selectedFurnitureId,
          updates: { x: Math.max(0, Math.min(room.width - 10, nx)), y: Math.max(0, Math.min(room.depth - 10, ny)) },
        },
      });
    } else {
      let found: string | null = null;
      for (let i = room.furniture.length - 1; i >= 0; i--) {
        if (hitTestFurniture(x, y, room.furniture[i], scale, offsetX, offsetY)) { found = room.furniture[i].instanceId; break; }
      }
      setHoveredFurniture(found);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!state.selectedFurnitureId || !currentProject) return;
      const sel = room.furniture.find(f => f.instanceId === state.selectedFurnitureId);
      if (!sel) return;
      const pid = currentProject.id;
      const rid = room.id;
      const fid = sel.instanceId;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        dispatch({ type: 'DELETE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid } });
      } else if (e.key === 'r' || e.key === 'R') {
        dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid, updates: { rotation: (sel.rotation + 90) % 360 } } });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid, updates: { x: Math.max(0, sel.x - 10) } } });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid, updates: { x: Math.min(room.width - sel.width, sel.x + 10) } } });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid, updates: { y: Math.max(0, sel.y - 10) } } });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: pid, roomId: rid, furnitureId: fid, updates: { y: Math.min(room.depth - sel.height, sel.y + 10) } } });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.selectedFurnitureId, currentProject, room, dispatch]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-2 bg-gray-800/50 border-b border-gray-700 text-sm">
        <button onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1.5 rounded text-xs transition ${showGrid ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
          {showGrid ? '🔲 网格 ON' : '⬜ 网格 OFF'}
        </button>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400 text-xs">R旋转 · Del删除 · 方向键微调</span>
        {state.selectedFurnitureId && currentProject && (
          <>
            <span className="text-gray-500">|</span>
            <button onClick={() => dispatch({ type: 'DELETE_FURNITURE', payload: { projectId: currentProject.id, roomId: room.id, furnitureId: state.selectedFurnitureId! } })}
              className="px-3 py-1.5 rounded text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">🗑️ 删除</button>
            <button onClick={() => {
              const sel = room.furniture.find(f => f.instanceId === state.selectedFurnitureId);
              if (sel) dispatch({ type: 'UPDATE_FURNITURE', payload: { projectId: currentProject.id, roomId: room.id, furnitureId: sel.instanceId, updates: { rotation: (sel.rotation + 90) % 360 } } });
            }} className="px-3 py-1.5 rounded text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition">🔄 旋转90°</button>
          </>
        )}
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
          className="w-full h-full" style={{ cursor: isDragging ? 'grabbing' : hoveredFurniture ? 'grab' : 'crosshair' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
      </div>
    </div>
  );
}
