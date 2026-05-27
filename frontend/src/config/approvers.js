export const APPROVER_LEVELS = [
  {
    level: 1,
    role: 'Supervisor',
    label: 'Supervisor (Level 1 Approver)',
    email: import.meta.env.VITE_APPROVER_LEVEL_1_EMAIL || 'pamplonajeypii.45@outlook.com'
  },
  {
    level: 2,
    role: 'Assistant Manager',
    label: 'Assistant Manager (Level 2 Approver)',
    email: import.meta.env.VITE_APPROVER_LEVEL_2_EMAIL || 'assistantmanager@company.com'
  },
  {
    level: 3,
    role: 'Manager',
    label: 'Manager (Level 3 Approver)',
    email: import.meta.env.VITE_APPROVER_LEVEL_3_EMAIL || 'manager@company.com'
  }
];

export const ADMIN_USER = {
  label: 'Admin Tester (Audit Trail View)',
  email: import.meta.env.VITE_ADMIN_EMAIL || 'admin.tester@hankoflow.local',
  role: 'admin'
};

export function getLevelRole(level) {
  const approver = APPROVER_LEVELS.find((item) => item.level === Number(level));
  return approver ? approver.role : `Level ${level}`;
}
