export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      <p className="mt-4 text-gray-400 text-sm">加载中...</p>
    </div>
  );
}
