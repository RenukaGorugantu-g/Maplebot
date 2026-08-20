import * as XLSX from 'xlsx';
import { dataStore } from './dataStore';
import { Update } from '../types/database';

export interface ReportFilterOptions {
  reportType: 'daily' | 'weekly' | 'sprint' | 'custom';
  startDate?: string;
  endDate?: string;
  podId?: string;
  profileId?: string;
  status?: string;
  hasBlocker?: boolean;
}

export const reportsService = {
  generateReportData(filters: ReportFilterOptions) {
    let updates = dataStore.getUpdates();

    if (filters.podId) {
      updates = updates.filter(
        (u) => u.pod_id === filters.podId || (u.profile?.pod_ids && u.profile.pod_ids.includes(filters.podId))
      );
    }
    if (filters.profileId) {
      updates = updates.filter((u) => u.profile_id === filters.profileId);
    }
    if (filters.startDate) {
      updates = updates.filter((u) => u.update_date >= filters.startDate!);
    }
    if (filters.endDate) {
      updates = updates.filter((u) => u.update_date <= filters.endDate!);
    }
    if (filters.status) {
      updates = updates.filter((u) => u.status === filters.status);
    }
    if (filters.hasBlocker !== undefined) {
      updates = updates.filter((u) => u.has_blocker === filters.hasBlocker);
    }

    return updates;
  },

  exportToXLSX(updates: Update[], filename = 'MapleBot_Report') {
    const rows = updates.map((u) => ({
      Date: u.update_date,
      Member: u.profile?.full_name || 'Unknown',
      Email: u.profile?.email || '',
      Pod: u.pod?.name || 'Unassigned',
      Manager: u.profile?.manager?.full_name || 'N/A',
      'Yesterday Deliverables': u.yesterday,
      'Today Focus': u.today,
      'Has Blocker': u.has_blocker ? 'Yes' : 'No',
      'Blocker Description': u.blocker || '',
      'Blocker Category': u.blocker_category || '',
      'Support Needed': u.support_needed || '',
      Status: u.status === 'on_track' ? 'On Track' : u.status === 'at_risk' ? 'At Risk' : 'Blocked',
      Priority: u.priority.toUpperCase(),
      'Progress %': `${u.progress_percent}%`,
      'Submitted At': u.submitted_at ? new Date(u.submitted_at).toLocaleTimeString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Updates');

    // Auto-fit column widths
    const maxProps = Object.keys(rows[0] || {}).map((k) => ({
      wch: Math.max(k.length, 18),
    }));
    worksheet['!cols'] = maxProps;

    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    dataStore.logAudit('REPORT_EXPORTED_XLSX', 'Report', undefined, { count: updates.length });
  },

  exportToCSV(updates: Update[], filename = 'MapleBot_Report') {
    const rows = updates.map((u) => ({
      Date: u.update_date,
      Member: `"${u.profile?.full_name || 'Unknown'}"`,
      Email: u.profile?.email || '',
      Pod: `"${u.pod?.name || 'Unassigned'}"`,
      Status: u.status,
      Progress: `${u.progress_percent}%`,
      Yesterday: `"${(u.yesterday || '').replace(/"/g, '""')}"`,
      Today: `"${(u.today || '').replace(/"/g, '""')}"`,
      Blocker: `"${(u.blocker || '').replace(/"/g, '""')}"`,
      Category: u.blocker_category || '',
    }));

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]).join(',');
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    dataStore.logAudit('REPORT_EXPORTED_CSV', 'Report', undefined, { count: updates.length });
  },
};
