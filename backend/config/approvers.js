const APPROVER_LEVELS = [
  {
    level: 1,
    role: 'Supervisor',
    email: process.env.APPROVER_LEVEL_1_EMAIL || 'supervisor@company.com'
  },
  {
    level: 2,
    role: 'Assistant Manager',
    email: process.env.APPROVER_LEVEL_2_EMAIL || 'assistantmanager@company.com'
  },
  {
    level: 3,
    role: 'Manager',
    email: process.env.APPROVER_LEVEL_3_EMAIL || 'manager@company.com'
  }
];

const APPROVERS = APPROVER_LEVELS.reduce((map, approver) => {
  map[approver.level] = approver.email;
  return map;
}, {});

function getApproverRole(level) {
  const approver = APPROVER_LEVELS.find((item) => item.level === Number(level));
  return approver ? approver.role : `Level ${level}`;
}

module.exports = {
  APPROVER_LEVELS,
  APPROVERS,
  getApproverRole
};
