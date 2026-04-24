'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('页面错误:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-12 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">出错了</h2>
        <p className="text-gray-400 text-sm mb-8">页面遇到了一个错误，请稍后再试</p>
        <button onClick={reset}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300">
          重新加载
        </button>
      </div>
    </div>
  );
}
