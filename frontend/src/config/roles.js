export const ROLES = Object.freeze({
  SUPER_ADMIN: "SuperAdmin",
  ORG_ADMIN: "OrgAdmin",
  USER: "User"
});

export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN;
}

export function isOrgAdmin(user) {
  return user?.role === ROLES.ORG_ADMIN;
}

export function isUser(user) {
  return user?.role === ROLES.USER;
}
