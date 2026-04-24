function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`环境变量 ${name} 未设置。请检查 .env 文件。`);
  }
  return value || '';
}

export const env = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL', false),
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
