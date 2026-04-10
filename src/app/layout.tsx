import type { Metadata } from 'next';
import './globals.css';
import { ProjectProvider } from '@/contexts/ProjectContext';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: '内装デザイナー | Interior Design Studio',
  description: '个人内装设计应用',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <ProjectProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
