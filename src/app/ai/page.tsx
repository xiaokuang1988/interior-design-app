'use client';

import { useState } from 'react';
import AIChat from '@/components/AIChat';

type AITab = 'chat' | 'analyze' | 'recommend';

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<AITab>('chat');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🤖 AI 助手</h1>
        <p className="text-gray-400 mt-1">智能装修建议与户型分析</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'chat' as AITab, label: '💬 对话助手', desc: '装修问答' },
          { id: 'analyze' as AITab, label: '📸 户型分析', desc: '上传户型图' },
          { id: 'recommend' as AITab, label: '🎯 风格推荐', desc: '偏好测试' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
            }`}>
            <span className="block">{tab.label}</span>
            <span className="text-[10px] opacity-60">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700">
          <AIChat />
        </div>
      )}

      {activeTab === 'analyze' && <AnalyzeTab />}
      {activeTab === 'recommend' && <RecommendTab />}
    </div>
  );
}

function AnalyzeTab() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<null | {
    rooms: { name: string; area: number; suggestion: string }[];
    score: number;
    tips: string[];
  }>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '分析失败');
        return;
      }
      if (data.raw) {
        // AI returned text instead of JSON
        setResult({
          rooms: [{ name: '分析结果', area: 0, suggestion: data.raw }],
          score: 0,
          tips: [],
        });
      } else {
        setResult(data);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">📸 上传户型图</h3>
        <p className="text-sm text-gray-400">上传您的户型图，AI将分析房间布局并给出优化建议</p>
        {error && <p className="text-xs text-red-400 mt-1">❌ {error}</p>}
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            image ? 'border-blue-500/50' : 'border-gray-600 hover:border-gray-500'
          }`}>
            {image ? (
              <div>
                <img src={image} alt="户型图" className="max-h-64 mx-auto rounded-lg mb-4" />
                <div className="flex gap-2 justify-center">
                  <button onClick={analyze} disabled={analyzing}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
                    {analyzing ? '⏳ 分析中...' : '🔍 开始分析'}
                  </button>
                  <button onClick={() => { setImage(null); setResult(null); }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition">
                    重新上传
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer">
                <p className="text-4xl mb-3">📁</p>
                <p className="text-sm text-gray-400">点击上传或拖拽户型图</p>
                <p className="text-xs text-gray-500 mt-1">支持 JPG, PNG, PDF</p>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {result && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#374151" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3B82F6" strokeWidth="3"
                    strokeDasharray={`${result.score} ${100 - result.score}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-400">{result.score}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">户型评分</p>
                <p className="text-xs text-gray-400">基于采光、动线、空间利用率综合评估</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">🏠 房间分析</h4>
              {result.rooms.map((r, i) => (
                <div key={i} className="mb-2 p-3 bg-gray-900 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{r.name}</span>
                    <span className="text-gray-500">{r.area}m²</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{r.suggestion}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">💡 优化建议</h4>
              <ul className="space-y-1">
                {result.tips.map((t, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-blue-400 shrink-0">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendTab() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<null | { style: string; desc: string; emoji: string; colors: string[] }>(null);

  const questions = [
    { q: '你更喜欢哪种氛围？', options: ['明亮通透', '温馨柔和', '冷酷简洁', '自然朴素'] },
    { q: '你偏好什么色调？', options: ['白色/浅色系', '暖色/木质', '灰色/中性', '深色/对比'] },
    { q: '你最看重什么？', options: ['美观设计', '实用功能', '舒适放松', '独特个性'] },
    { q: '你喜欢什么材质？', options: ['原木', '大理石', '金属', '布艺'] },
  ];

  const answer = (opt: string) => {
    const newAnswers = [...answers, opt];
    setAnswers(newAnswers);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Mock recommendation
      const styles = [
        { style: '北欧风格', desc: '简约明亮的北欧风格非常适合你！强调自然光和木质元素。', emoji: '🇸🇪', colors: ['#F5F5F0', '#D4B896', '#4A6741', '#2563EB'] },
        { style: '日式风格', desc: '禅意十足的日式风格与你的偏好完美匹配。追求和谐自然。', emoji: '🇯🇵', colors: ['#F5F0E8', '#C4B698', '#8B4513', '#2D5016'] },
        { style: '现代简约', desc: '干净利落的现代简约风格适合追求品质的你。', emoji: '🏢', colors: ['#FFFFFF', '#9CA3AF', '#000000', '#3B82F6'] },
        { style: '侘寂风格', desc: '追求不完美之美的侘寂风格，朴素而有深度。', emoji: '🍵', colors: ['#E8E0D4', '#A89278', '#8B7355', '#6B5B48'] },
      ];
      setResult(styles[Math.floor(Math.random() * styles.length)]);
    }
  };

  const reset = () => { setStep(0); setAnswers([]); setResult(null); };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">🎯 风格推荐</h3>
        <p className="text-sm text-gray-400">回答几个简单问题，找到最适合你的装修风格</p>
      </div>

      {!result ? (
        <div className="max-w-lg mx-auto py-8">
          <div className="flex gap-1 mb-8">
            {questions.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition ${i <= step ? 'bg-blue-600' : 'bg-gray-700'}`} />
            ))}
          </div>

          <p className="text-xl text-white font-medium text-center mb-8">{questions[step].q}</p>

          <div className="grid grid-cols-2 gap-3">
            {questions[step].options.map(opt => (
              <button key={opt} onClick={() => answer(opt)}
                className="p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-750 text-white text-sm font-medium transition">
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto py-8 text-center">
          <p className="text-6xl mb-4">{result.emoji}</p>
          <h3 className="text-2xl font-bold text-white mb-2">推荐风格：{result.style}</h3>
          <p className="text-sm text-gray-400 mb-6">{result.desc}</p>

          <div className="flex justify-center gap-3 mb-8">
            {result.colors.map((c, i) => (
              <div key={i} className="w-12 h-12 rounded-lg border border-gray-600" style={{ backgroundColor: c }} />
            ))}
          </div>

          <button onClick={reset} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
            🔄 重新测试
          </button>
        </div>
      )}
    </div>
  );
}
