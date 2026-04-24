import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-10">
        <h2 className="text-6xl font-extrabold text-gray-200 mb-4">404</h2>
        <h3 className="text-xl font-bold text-gray-900 mb-2">页面不存在</h3>
        <p className="text-gray-500 mb-6">您访问的页面不存在或已被移除。</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
