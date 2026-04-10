'use client';

import { useState, useRef, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { AIMessage } from '@/types';
import { generateId } from '@/utils/storage';



export default function AIChat() {
  const { currentProject, dispatch } = useProject();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = currentProject?.aiMessages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentProject || isLoading) return;

    const userMsg: AIMessage = {
      id: generateId(), role: 'user', content: input, timestamp: Date.now(),
      imageUrl: uploadedImage ?? undefined,
    };
    dispatch({ type: 'ADD_AI_MESSAGE', payload: { projectId: currentProject.id, message: userMsg } });
    const sentInput = input;
    const sentImage = uploadedImage;
    setInput('');
    setUploadedImage(null);
    setIsLoading(true);

    try {
      const historyForApi = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sentInput,
          imageUrl: sentImage ?? undefined,
          history: historyForApi,
        }),
      });
      const data = await res.json();
      const content = data.error
        ? `⚠️ ${data.error}`
        : data.content ?? '抱歉，暂时无法回答。';

      const aiMsg: AIMessage = {
        id: generateId(), role: 'assistant', content, timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_AI_MESSAGE', payload: { projectId: currentProject.id, message: aiMsg } });
    } catch {
      const aiMsg: AIMessage = {
        id: generateId(), role: 'assistant', content: '⚠️ 网络错误，请重试', timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_AI_MESSAGE', payload: { projectId: currentProject.id, message: aiMsg } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-4xl mb-3">🤖</p>
        <p>请先在仪表盘创建项目</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-lg text-white font-medium mb-2">AI 装修助手</p>
            <p className="text-sm text-gray-400 mb-6">我可以帮你分析户型、推荐风格、解答装修问题</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['推荐适合小户型的装修风格', '装修预算怎么分配', '客厅地板用什么材料好', '帮我分析一下户型布局'].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="px-4 py-2 rounded-full bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 border border-gray-700 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'
            }`}>
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="upload" className="max-w-[200px] rounded-lg mb-2" />
              )}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Image Preview */}
      {uploadedImage && (
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50">
          <div className="relative inline-block">
            <img src={uploadedImage} alt="preview" className="h-20 rounded-lg" />
            <button onClick={() => setUploadedImage(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center">✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 transition" title="上传户型图">
            📎
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="输入您的装修问题..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition">
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
