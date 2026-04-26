export const ROLES = {
  USER: 'user',
  JUDGE: 'judge',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export function isAdminRole(role?: string | null) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

export function isSuperAdminRole(role?: string | null) {
  return role === ROLES.SUPER_ADMIN;
}

export function canReview(role?: string | null) {
  return role === ROLES.JUDGE || role === ROLES.SUPER_ADMIN;
}

export function canAward(role?: string | null) {
  return role === ROLES.SUPER_ADMIN;
}

export function roleLabel(role?: string | null) {
  if (role === ROLES.SUPER_ADMIN) return '高级管理员';
  if (role === ROLES.ADMIN) return '管理员';
  if (role === ROLES.JUDGE) return '评委';
  return '用户';
}
