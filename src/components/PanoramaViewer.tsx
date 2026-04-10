'use client';

import { useEffect, useRef, useState } from 'react';

interface Hotspot {
  name: string;
  category: string;
  yaw: number;
  pitch: number;
  link?: string;
}

interface PanoramaViewerProps {
  imageUrl: string;
  hotspots: Hotspot[];
}

export default function PanoramaViewer({ imageUrl, hotspots }: PanoramaViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  // Proxy external images to avoid CORS issues
  const proxiedUrl = imageUrl.startsWith('http') && !imageUrl.startsWith(window.location.origin)
    ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  useEffect(() => {
    if (!viewerRef.current || !imageUrl) return;

    // Load Pannellum CSS and JS
    const loadPannellum = async () => {
      // Check if already loaded
      if ((window as unknown as Record<string, unknown>).pannellum) {
        initViewer();
        return;
      }

      // Load CSS
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
      document.head.appendChild(css);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.onload = () => initViewer();
      document.body.appendChild(script);
    };

    const initViewer = () => {
      const pannellum = (window as unknown as Record<string, unknown>).pannellum as {
        viewer: (
          el: HTMLElement,
          config: Record<string, unknown>
        ) => { destroy: () => void };
      };
      if (!pannellum || !viewerRef.current) return;

      // Clear previous viewer
      viewerRef.current.innerHTML = '';

      const hotspotConfigs = hotspots.map((hs, i) => ({
        pitch: hs.pitch,
        yaw: hs.yaw,
        type: 'info',
        text: hs.name,
        id: `hs-${i}`,
        clickHandlerFunc: () => setActiveHotspot(hs),
      }));

      pannellum.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: proxiedUrl,
        autoLoad: true,
        compass: true,
        showControls: true,
        mouseZoom: true,
        hotSpots: hotspotConfigs,
        hfov: 110,
        minHfov: 50,
        maxHfov: 120,
        autoRotate: -2,
        autoRotateInactivityDelay: 3000,
        strings: {
          loadButtonLabel: '点击加载全景',
          loadingLabel: '加载中...',
        },
      });

      setLoaded(true);
    };

    loadPannellum();
  }, [imageUrl, hotspots]);

  const categoryIcons: Record<string, string> = {
    sofa: '🛋️',
    table: '🪑',
    light: '💡',
    appliance: '📺',
    storage: '🗄️',
    decoration: '🖼️',
    curtain: '🪟',
    rug: '🟫',
    bed: '🛏️',
  };

  return (
    <div className="relative">
      {/* Panorama Container */}
      <div
        ref={viewerRef}
        className="w-full rounded-xl overflow-hidden border border-gray-600"
        style={{ height: '450px' }}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-400">加载全景查看器...</p>
          </div>
        </div>
      )}

      {/* Hotspot Info Panel */}
      {activeHotspot && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur rounded-xl p-4 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{categoryIcons[activeHotspot.category] || '📦'}</span>
              <div>
                <p className="text-white font-medium">{activeHotspot.name}</p>
                <p className="text-xs text-gray-400">
                  {activeHotspot.link ? '点击查看商品详情' : '暂无商家链接'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {activeHotspot.link && (
                <a href={activeHotspot.link} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition">
                  🛒 查看商品
                </a>
              )}
              <button onClick={() => setActiveHotspot(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hotspots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hotspots.map((hs, i) => (
            <button key={i} onClick={() => setActiveHotspot(hs)}
              className="px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-blue-500 transition">
              {categoryIcons[hs.category] || '📦'} {hs.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
