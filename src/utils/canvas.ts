import { PlacedFurniture, Room } from '@/types';

const GRID_SIZE = 10;

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  ctx.strokeStyle = '#2a2a3e';
  ctx.lineWidth = 0.5;
  const g = GRID_SIZE * scale;
  for (let x = 0; x <= w; x += g) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += g) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

export function drawRoom(ctx: CanvasRenderingContext2D, room: Room, scale: number, ox: number, oy: number) {
  const w = room.width * scale;
  const d = room.depth * scale;

  // Floor fill
  ctx.fillStyle = room.floorColor;
  ctx.fillRect(ox, oy, w, d);

  // Floor pattern
  ctx.strokeStyle = adjustColor(room.floorColor, -15);
  ctx.lineWidth = 0.5;
  if (room.floorType === 'wood' || room.floorType === 'tatami') {
    const pw = (room.floorType === 'tatami' ? 90 : 20) * scale;
    for (let x = ox + pw; x < ox + w; x += pw) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + d); ctx.stroke();
    }
  } else if (room.floorType === 'tile' || room.floorType === 'marble') {
    const ts = 40 * scale;
    for (let x = ox; x < ox + w; x += ts) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + d); ctx.stroke();
    }
    for (let y = oy; y < oy + d; y += ts) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + w, y); ctx.stroke();
    }
  }

  // Walls
  ctx.strokeStyle = room.wallColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(ox, oy, w, d);

  // Label
  ctx.fillStyle = '#E5E7EB';
  ctx.font = `${Math.max(12, 14 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${room.name} (${(room.width / 100).toFixed(1)}m × ${(room.depth / 100).toFixed(1)}m)`, ox + w / 2, oy + d + 20);
}

export function drawFurniture(
  ctx: CanvasRenderingContext2D, f: PlacedFurniture, scale: number,
  ox: number, oy: number, selected: boolean, hovered: boolean
) {
  const fx = ox + f.x * scale;
  const fy = oy + f.y * scale;
  const fw = f.width * scale;
  const fh = f.height * scale;
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((f.rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  if (selected || hovered) {
    ctx.shadowColor = selected ? '#3B82F6' : '#6B7280';
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = f.color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = selected ? '#3B82F6' : hovered ? '#9CA3AF' : '#4B5563';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.shadowBlur = 0;

  const fs = Math.max(10, Math.min(fw, fh) * 0.3);
  ctx.font = `${fs}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.emoji, cx, cy - fs * 0.3);

  ctx.font = `${fs * 0.65}px sans-serif`;
  ctx.fillStyle = '#D1D5DB';
  ctx.fillText(f.name, cx, cy + fs * 0.5);

  if (selected) {
    const hs = 6;
    ctx.fillStyle = '#3B82F6';
    for (const [hx, hy] of [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]]) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
    ctx.beginPath();
    ctx.arc(cx, fy - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, fy);
    ctx.lineTo(cx, fy - 10);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawDimensions(ctx: CanvasRenderingContext2D, room: Room, scale: number, ox: number, oy: number) {
  const w = room.width * scale;
  const d = room.depth * scale;
  ctx.strokeStyle = '#9CA3AF';
  ctx.fillStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  const ty = oy - 12;
  ctx.beginPath(); ctx.moveTo(ox, ty); ctx.lineTo(ox + w, ty); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox, ty - 4); ctx.lineTo(ox, ty + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + w, ty - 4); ctx.lineTo(ox + w, ty + 4); ctx.stroke();
  ctx.fillText(`${(room.width / 100).toFixed(1)}m`, ox + w / 2, ty - 4);

  const lx = ox - 12;
  ctx.beginPath(); ctx.moveTo(lx, oy); ctx.lineTo(lx, oy + d); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - 4, oy); ctx.lineTo(lx + 4, oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - 4, oy + d); ctx.lineTo(lx + 4, oy + d); ctx.stroke();
  ctx.save();
  ctx.translate(lx - 4, oy + d / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${(room.depth / 100).toFixed(1)}m`, 0, 0);
  ctx.restore();
}

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function hitTestFurniture(mx: number, my: number, f: PlacedFurniture, scale: number, ox: number, oy: number): boolean {
  const fx = ox + f.x * scale;
  const fy = oy + f.y * scale;
  return mx >= fx && mx <= fx + f.width * scale && my >= fy && my <= fy + f.height * scale;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
