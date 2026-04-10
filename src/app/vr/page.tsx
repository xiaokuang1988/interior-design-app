'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const PanoramaViewer = dynamic(() => import('@/components/PanoramaViewer'), { ssr: false });

interface Hotspot {
  name: string;
  category: string;
  yaw: number;
  pitch: number;
  link?: string;
}

export default function VRPage() {
  const [image, setImage] = useState<string | null>(null);
  const [style, setStyle] = useState('modern');
  const [room, setRoom] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const styles = [
    { id: 'japanese', label: '🇯🇵 日式和风' },
    { id: 'nordic', label: '🇸🇪 北欧风格' },
    { id: 'modern', label: '🏢 现代简约' },
    { id: 'chinese', label: '🇨🇳 新中式' },
    { id: 'industrial', label: '🏭 工业风' },
    { id: 'wabisabi', label: '🍵 侘寂风' },
  ];

  const compressImage = (dataUrl: string, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressImage(raw, 800);
      setImage(compressed);
      setPanoramaUrl(null);
      setHotspots([]);
      setError(null);
      setRooms([]);
      setRoom('');
      // Auto-detect rooms
      setDetecting(true);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressed }),
        });
        const data = await res.json();
        if (res.ok && data.rooms && Array.isArray(data.rooms)) {
          const names = data.rooms.map((r: { name: string }) => r.name);
          setRooms(names);
          if (names.length > 0) setRoom(names[0]);
        }
      } catch { /* ignore */ }
      setDetecting(false);
    };
    reader.readAsDataURL(file);
  };

  const generatePanorama = async () => {
    if (!image || !room) return;
    setGenerating(true);
    setError(null);
    setPanoramaUrl(null);
    setHotspots([]);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch('/api/panorama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, style, room, customPrompt }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '生成失败');
        return;
      }
      setPanoramaUrl(data.imageUrl);
      setHotspots(data.hotspots || []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('请求超时，请重试');
      } else {
        setError('网络错误，请重试');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🌐 VR 全景效果图</h1>
        <p className="text-gray-400 mt-1">上传平面图 → 选择房间和风格 → 生成360°全景效果图</p>
      </div>

      {panoramaUrl ? (
        /* Panorama View Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{room} - 360° 全景</h2>
              <p className="text-xs text-gray-400">拖动鼠标旋转视角 · 滚轮缩放 · 点击家具标注查看详情</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPanoramaUrl(null); setHotspots([]); }}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition">
                ← 返回
              </button>
              <button onClick={generatePanorama} disabled={generating}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition">
                🔄 重新生成
              </button>
            </div>
          </div>

          <PanoramaViewer imageUrl={panoramaUrl} hotspots={hotspots} />

          {/* Product List */}
          {hotspots.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-white mb-3">🛒 场景中的家具/家电</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {hotspots.map((hs, i) => (
                  <div key={i} className="p-3 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-sm text-white">{hs.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {hs.link ? (
                        <a href={hs.link} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:underline">查看商品 →</a>
                      ) : '等待商家入驻'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Setup Mode */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Upload */}
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              image ? 'border-blue-500/50' : 'border-gray-600 hover:border-gray-500'
            }`}>
              {image ? (
                <div>
                  <img src={image} alt="平面图" className="max-h-48 mx-auto rounded-lg mb-3" />
                  <button onClick={() => { setImage(null); setRooms([]); setRoom(''); }}
                    className="text-xs text-gray-400 hover:text-white transition">重新选择</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <p className="text-4xl mb-2">📐</p>
                  <p className="text-sm text-gray-400">上传平面图 / 户型图</p>
                  <p className="text-xs text-gray-500 mt-1">支持 JPG, PNG</p>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Room Selection */}
            {image && (
              <div>
                <p className="text-sm font-medium text-white mb-2">选择房间</p>
                {detecting ? (
                  <p className="text-xs text-gray-400">✨ AI正在识别房间...</p>
                ) : rooms.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rooms.map(r => (
                      <button key={r} onClick={() => setRoom(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          room === r
                            ? 'border-green-500 bg-green-500/20 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input type="text" value={room} onChange={e => setRoom(e.target.value)}
                    placeholder="输入房间名，如 LDK、主卧..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                )}
              </div>
            )}

            {/* Style */}
            <div>
              <p className="text-sm font-medium text-white mb-2">装修风格</p>
              <div className="grid grid-cols-3 gap-2">
                {styles.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`p-2 rounded-lg text-xs font-medium transition border ${
                      style === s.id
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div>
              <p className="text-sm font-medium text-white mb-2">额外要求（可选）</p>
              <input type="text" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="例如：大落地窗、开放式厨房..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>

            {error && <p className="text-xs text-red-400">❌ {error}</p>}

            <button onClick={generatePanorama} disabled={!image || !room || generating || detecting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition">
              {generating ? '🌐 生成全景效果图中，约30-40秒...' : '🌐 生成360°全景效果图'}
            </button>
          </div>

          {/* Right: Preview */}
          <div className="flex items-center justify-center">
            {generating ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-gray-400">正在生成360°全景效果图...</p>
                <p className="text-xs text-gray-500 mt-1">AI分析平面图 → 生成全景 → 标注家具</p>
                <p className="text-xs text-gray-500">大约需要30-40秒</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-5xl mb-3">🌐</p>
                <p className="text-sm">全景效果图将在这里展示</p>
                <p className="text-xs mt-2">支持360°自由旋转查看</p>
                <p className="text-xs">家具标注可点击查看商品详情</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
