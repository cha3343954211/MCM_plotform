import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-12 max-w-md w-full text-center">
        <div className="text-7xl font-extrabold text-gray-100 mb-2 tracking-tighter">404</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">页面不存在</h2>
        <p className="text-gray-400 text-sm mb-8">您访问的页面不存在或已被移除</p>
        <Link href="/"
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300 inline-block">
          返回首页
        </Link>
      </div>
    </div>
  );
}
