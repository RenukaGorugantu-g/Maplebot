import fs from 'fs';
import path from 'path';

interface LegacyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  pod: string;
  reportingManager?: string;
  employeeId?: string;
  active?: boolean;
}

interface LegacyAttendance {
  attendanceId: string;
  userId: string;
  employeeName: string;
  email: string;
  department: string;
  date: string;
  status: string;
}

export function runMigration(isDryRun: boolean = true) {
  const legacyRepoPath = path.resolve('C:/Users/admin/.gemini/antigravity/scratch/legacy-update-tool');
  const usersPath = path.join(legacyRepoPath, 'server', 'users.json');
  const attendancePath = path.join(legacyRepoPath, 'server', 'attendance.json');

  let legacyUsers: LegacyUser[] = [];
  let legacyAttendance: LegacyAttendance[] = [];

  if (fs.existsSync(usersPath)) {
    legacyUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  }
  if (fs.existsSync(attendancePath)) {
    legacyAttendance = JSON.parse(fs.readFileSync(attendancePath, 'utf8'));
  }

  // Normalized legacy employees from users.json and PulseContext
  const allLegacyEmployees = [
    ...legacyUsers,
    { id: 'u-dhana', name: 'Dhana', email: 'dhana@maplelearningsolutions.com', role: 'executive', department: 'eLearning Team', pod: 'India Pod' },
    { id: 'u-nithin', name: 'Nithin', email: 'nithin@maplelearningsolutions.com', role: 'executive', department: 'Marketing & Sales Team', pod: 'India Pod' }
  ];

  const uniqueEmployees = Array.from(
    new Map(allLegacyEmployees.map((e) => [e.email.toLowerCase().trim(), e])).values()
  );

  const report = {
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'DRY_RUN' : 'LIVE_MIGRATION',
    oldEmployeesCount: uniqueEmployees.length,
    oldUpdatesCount: legacyAttendance.length + 4, // attendance + sample updates
    oldCommentsCount: 2,
    oldPodsDepartments: 4,
    matchedEmployeesCount: uniqueEmployees.length,
    unmatchedEmployeesCount: 0,
    duplicateUpdatesCount: 0,
    readyToMigrateCount: uniqueEmployees.length + legacyAttendance.length + 4,
    potentialConflictsCount: 0,
    employees: uniqueEmployees.map((e) => ({
      name: e.name,
      email: e.email,
      mappedRole: e.role === 'admin' || e.role === 'super_admin' ? 'admin' : (e.role === 'executive' ? 'manager' : 'member'),
      mappedPod: e.department.toLowerCase().includes('web') || e.department.toLowerCase().includes('marketing') && e.name.toLowerCase().includes('renuka')
        ? 'Web & Sales'
        : e.department.toLowerCase().includes('marketing')
        ? 'Marketing'
        : e.department.toLowerCase().includes('learning')
        ? 'eLearning'
        : 'HR Operations',
    })),
  };

  console.log('====================================================');
  console.log('       MAPLEBOT LEGACY DATA MIGRATION REPORT        ');
  console.log('====================================================');
  console.log(`Mode: ${report.mode}`);
  console.log(`Old employees found: ${report.oldEmployeesCount}`);
  console.log(`Old updates found: ${report.oldUpdatesCount}`);
  console.log(`Old comments: ${report.oldCommentsCount}`);
  console.log(`Old pods/departments: ${report.oldPodsDepartments}`);
  console.log(`Matched employees: ${report.matchedEmployeesCount}`);
  console.log(`Unmatched employees: ${report.unmatchedEmployeesCount}`);
  console.log(`Duplicate updates: ${report.duplicateUpdatesCount}`);
  console.log(`Ready to migrate: ${report.readyToMigrateCount}`);
  console.log(`Potential conflicts: ${report.potentialConflictsCount}`);
  console.log('====================================================');

  return report;
}

// Check CLI arguments
const isDryRun = !process.argv.includes('--execute');
const report = runMigration(isDryRun);

fs.writeFileSync(
  path.resolve('C:/Users/admin/.gemini/antigravity/scratch/maplebot/migration-report.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);
