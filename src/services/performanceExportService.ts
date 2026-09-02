// ==============================================================================
// MapleBot: Executive Performance Export Service (PDF & Multi-Sheet Excel)
// ==============================================================================

import * as XLSX from 'xlsx';
import { ExecutiveReportData, PerformanceWorkLog, TeamExecutiveReportData } from '../types/performance';
import { dataStore } from './dataStore';

export const performanceExportService = {
  /**
   * Generates a multi-sheet formatted Excel workbook for an Individual Executive Report
   */
  exportIndividualReportToXLSX(reportData: ExecutiveReportData, filename?: string) {
    const wb = XLSX.utils.book_new();
    const safeName = (reportData.employee_name || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = filename || `MapleBot_Performance_Report_${safeName}_${reportData.period_start}`;

    // --- SHEET 1: EXECUTIVE SUMMARY ---
    const summaryRows: any[] = [
      { 'Executive Performance Report': 'MAPLE LEARNING SOLUTIONS' },
      { 'Executive Performance Report': `Employee: ${reportData.employee_name}` },
      { 'Executive Performance Report': `Role: ${reportData.employee_role}` },
      { 'Executive Performance Report': `Department: ${reportData.department}` },
      { 'Executive Performance Report': `Manager: ${reportData.manager_name}` },
      { 'Executive Performance Report': `Reporting Period: ${reportData.reporting_period}` },
      { 'Executive Performance Report': `Generated On: ${new Date(reportData.generated_at).toLocaleDateString()}` },
      { 'Executive Performance Report': `Performance Level: ${reportData.executive_summary.overall_assessment}` },
      { 'Executive Performance Report': `Overall Score: ${reportData.score_summary.total_score !== null ? `${reportData.score_summary.total_score} / 100` : 'Not Evaluated'}` },
      {},
      { 'Executive Performance Report': '--- EXECUTIVE SUMMARY ---' },
      { 'Executive Performance Report': reportData.executive_summary.overview_text },
      { 'Executive Performance Report': reportData.executive_summary.velocity_assessment },
      {},
      { 'Executive Performance Report': '--- PERFORMANCE SNAPSHOT ---' },
      { 'Executive Performance Report': `Tasks Completed: ${reportData.snapshot.completed_tasks} of ${reportData.snapshot.total_tasks} (${reportData.snapshot.completion_rate}%)` },
      { 'Executive Performance Report': `Total Hours Logged: ${reportData.snapshot.total_hours} hrs` },
      { 'Executive Performance Report': `Units Delivered: ${reportData.snapshot.units_completed}` },
      { 'Executive Performance Report': `Review Quality: ${reportData.snapshot.average_quality}/5` },
      { 'Executive Performance Report': `Turnaround Time: ${reportData.snapshot.average_tat}` },
      { 'Executive Performance Report': `Overall Efficiency: ${reportData.snapshot.efficiency}` },
      {},
      { 'Executive Performance Report': '--- EXECUTIVE RECOMMENDATION ---' },
      { 'Executive Performance Report': reportData.executive_recommendation.management_conclusion },
      { 'Executive Performance Report': `Focus: ${reportData.executive_recommendation.next_cycle_focus}` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // --- SHEET 2: PROJECT PERFORMANCE BREAKDOWN ---
    const projectRows = (reportData.project_performance || []).map((p) => ({
      Project: p.project,
      'Total Tasks': p.tasks,
      Completed: p.completed,
      'Units Done': p.units,
      'Hours Logged': `${p.time_hours}h`,
      Errors: p.errors,
      Quality: typeof p.quality === 'number' ? `${p.quality}/5` : p.quality,
      'Average TAT': p.avg_tat,
      Efficiency: p.efficiency,
    }));
    if (projectRows.length > 0) {
      const wsProj = XLSX.utils.json_to_sheet(projectRows);
      wsProj['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsProj, 'Project Performance');
    }

    // --- SHEET 3: DELAYED WORK AUDIT ---
    const delayRows = (reportData.delayed_tasks || []).map((d) => ({
      Task: d.task,
      Project: d.project,
      'Expected Date': d.expected_date,
      'Completed Date': d.completed_date,
      Delay: d.delay_label,
      'Documented Reason': d.reason,
    }));
    if (delayRows.length > 0) {
      const wsDelay = XLSX.utils.json_to_sheet(delayRows);
      wsDelay['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsDelay, 'Delayed Tasks');
    }

    // --- SHEET 4: UNIT PRODUCTIVITY ---
    const prodRows = (reportData.unit_productivity || []).map((u) => ({
      Project: u.project,
      'Units Completed': u.units,
      'Hours Invested': `${u.hours}h`,
      'Units Per Hour': u.units_per_hour,
    }));
    if (prodRows.length > 0) {
      const wsProd = XLSX.utils.json_to_sheet(prodRows);
      wsProd['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsProd, 'Unit Productivity');
    }

    // --- SHEET 5: KRA / KPI PERFORMANCE ---
    const kpiRows = (reportData.kpi_metrics || []).map((k) => ({
      KRA: k.kra || 'Execution',
      KPI: k.kpi,
      Target: k.target,
      Actual: k.actual,
      Status: k.status,
      Frequency: k.frequency,
      Measurement: k.notes || '',
    }));
    if (kpiRows.length > 0) {
      const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
      wsKpi['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, wsKpi, 'KRA KPI Performance');
    }

    // Write file
    XLSX.writeFile(wb, `${finalFilename}.xlsx`);
    dataStore.logAudit('EXECUTIVE_REPORT_EXPORTED_XLSX', 'PerformanceReport', undefined, {
      employee: reportData.employee_name,
      period: reportData.reporting_period,
    });
  },

  /**
   * Generates a multi-sheet formatted Excel workbook for a Team Executive Performance Report
   */
  exportTeamReportToXLSX(teamData: TeamExecutiveReportData, filename?: string) {
    const wb = XLSX.utils.book_new();
    const safeTeam = (teamData.team_name || 'Team').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = filename || `MapleBot_Team_Report_${safeTeam}_${teamData.period_start}`;

    // --- SHEET 1: TEAM OVERVIEW ---
    const teamSummaryRows: any[] = [
      { 'Team Performance Overview': 'MAPLE LEARNING SOLUTIONS' },
      { 'Team Performance Overview': `Team / Pod: ${teamData.team_name}` },
      { 'Team Performance Overview': `Pod Lead: ${teamData.lead_name}` },
      { 'Team Performance Overview': `Manager: ${teamData.manager_name}` },
      { 'Team Performance Overview': `Reporting Period: ${teamData.reporting_period}` },
      { 'Team Performance Overview': `Generated On: ${new Date(teamData.generated_at).toLocaleDateString()}` },
      {},
      { 'Team Performance Overview': `Total Members: ${teamData.team_summary.total_members}` },
      { 'Team Performance Overview': `Tasks Completed: ${teamData.team_summary.completed_tasks} of ${teamData.team_summary.total_tasks} (${teamData.team_summary.completion_rate}%)` },
      { 'Team Performance Overview': `Total Hours Logged: ${teamData.team_summary.total_hours} hrs` },
      { 'Team Performance Overview': `Total Units Delivered: ${teamData.team_summary.total_units}` },
      { 'Team Performance Overview': `Average Turnaround: ${teamData.team_summary.average_tat}` },
      { 'Team Performance Overview': `Delayed Tasks: ${teamData.team_summary.delayed_tasks}` },
    ];
    const wsOverview = XLSX.utils.json_to_sheet(teamSummaryRows);
    wsOverview['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Team Summary');

    // --- SHEET 2: MEMBER PERFORMANCE MATRIX ---
    const memberRows = teamData.members_summary.map((m) => ({
      Employee: m.employee_name,
      Role: m.role,
      'Total Tasks': m.total_tasks,
      Completed: m.completed_tasks,
      'Hours Logged': `${m.total_hours}h`,
      'Units Completed': m.total_units,
      'Completion Rate': `${m.completion_rate}%`,
      Quality: typeof m.quality === 'number' ? `${m.quality}/5` : m.quality,
      'Turnaround Time': m.tat,
      Efficiency: m.efficiency,
      'Active Blockers': m.active_blockers_count,
      'Performance Score': m.performance_score !== null ? `${m.performance_score}/100` : 'Not Evaluated',
    }));
    const wsMembers = XLSX.utils.json_to_sheet(memberRows);
    wsMembers['!cols'] = [
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 15 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Member Matrix');

    // Write file
    XLSX.writeFile(wb, `${finalFilename}.xlsx`);
    dataStore.logAudit('TEAM_REPORT_EXPORTED_XLSX', 'TeamPerformanceReport', undefined, {
      team: teamData.team_name,
      period: teamData.reporting_period,
    });
  },

  /**
   * Export all 17 columns of the consolidated structured work logs table to XLSX
   */
  exportStructuredWorkLogsToXLSX(logs: PerformanceWorkLog[], filename = 'MapleBot_Consolidated_Work_Performance_17Col') {
    const rows = logs.map((l) => ({
      '1. Date': l.date,
      'Check-in Time': l.submission_time || l.checkin_time || '10:00 AM',
      '2. Name': l.employee_name,
      '3. Project Name': l.project_name || l.project,
      '4. Task': l.task || l.task_title,
      '5. Assigned Date': l.assigned_date,
      '6. Expected Completion Date': l.expected_completion_date || 'Pending',
      '7. Completed Date': l.completed_date || 'Pending',
      '8. Time Invested (Hours)': l.time_invested || l.duration_hours,
      '9. Unit Count Completed': l.unit_count_completed || 0,
      '10. Review Assigned Date': l.review_assigned_date,
      '11. Review Completed Date': l.review_completed_date || 'Pending',
      '12. Reviewer': l.reviewer || l.reviewer_name || 'Not assigned',
      '13. Error': l.error_count ?? 0,
      '14. Quality': typeof l.quality === 'number' ? `${l.quality}/5` : l.quality || 'Pending',
      '15. TAT': l.tat || 'Not Available',
      '16. Efficiency': l.efficiency || 'Not Available',
      '17. Comments': l.comments || '',
      'Delivery Status': l.delivery_status,
      'Workflow Status': l.workflow_status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Performance Ledger');

    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Check-in Time
      { wch: 20 }, // Name
      { wch: 22 }, // Project
      { wch: 35 }, // Task
      { wch: 14 }, // Assigned Date
      { wch: 16 }, // Expected Date
      { wch: 16 }, // Completed Date
      { wch: 14 }, // Time
      { wch: 14 }, // Units
      { wch: 16 }, // Review Assigned
      { wch: 16 }, // Review Completed
      { wch: 20 }, // Reviewer
      { wch: 10 }, // Error
      { wch: 12 }, // Quality
      { wch: 14 }, // TAT
      { wch: 14 }, // Efficiency
      { wch: 35 }, // Comments
      { wch: 18 }, // Delivery Status
      { wch: 18 }, // Workflow Status
    ];

    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    dataStore.logAudit('WORK_LOGS_EXPORTED_XLSX', 'PerformanceWorkLog', undefined, { count: logs.length });
  },

  /**
   * Triggers clean browser print styled as executive PDF
   */
  printReport() {
    window.print();
  },
};
