'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';

const navItems = [
  { href: '/', label: '仪表盘', emoji: '🏠' },
  { href: '/rooms', label: '房间规划', emoji: '📐' },
  { href: '/materials', label: '选材配色', emoji: '🎨' },
  { href: '/ai', label: 'AI 助手', emoji: '🤖' },
  { href: '/budget', label: '预算管理', emoji: '💰' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentProject } = useProject();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🏡</span>
          <span>内装デザイナー</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Interior Design Studio</p>
      </div>

      {currentProject && (
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">当前项目</p>
          <p className="text-sm text-blue-400 font-medium truncate mt-1">📋 {currentProject.name}</p>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <span className="text-lg">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-600 text-center">v1.0.0 · Made with ❤️</div>
      </div>
    </aside>
  );
}
