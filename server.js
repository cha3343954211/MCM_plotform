// PM2 / Windows 友好的生产模式启动入口
// 等价于命令行执行: next start
process.argv = [process.argv[0], require.resolve('next/dist/bin/next'), 'start'];
require('next/dist/bin/next');
