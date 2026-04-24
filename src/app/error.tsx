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
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">出错了</h2>
        <p className="text-gray-500 mb-6">
          页面遇到了一个错误，请稍后再试。
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
        >
          重试
        </button>
      </div>
    </div>
  );
}
