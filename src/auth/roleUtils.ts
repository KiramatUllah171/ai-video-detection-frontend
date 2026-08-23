import type { UserProfile } from '../api/types'

const roleByEnumValue: Record<number, string> = {
  0: 'User',
  1: 'Admin',
  2: 'Reviewer',
  3: 'EnterpriseAdmin',
}

export function getUserRoleName(role: UserProfile['role'] | undefined) {
  if (typeof role === 'number') {
    return roleByEnumValue[role] ?? 'User'
  }

  if (typeof role === 'string' && role.trim()) {
    return role
  }

  return 'User'
}

export function normalizeUserProfile(user: UserProfile): UserProfile {
  return {
    ...user,
    role: getUserRoleName(user.role),
  }
}

export function isAdminRole(role: UserProfile['role'] | undefined) {
  return getUserRoleName(role).toLowerCase() === 'admin'
}
