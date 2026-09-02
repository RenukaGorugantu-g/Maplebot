import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function formatIST(dateStr) {
  if (!dateStr) return { time: 'N/A', date: 'N/A', full: 'N/A', day: 'N/A' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { time: 'N/A', date: dateStr, full: dateStr, day: 'N/A' };

  const time = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const date = d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

  const day = d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  });

  const full = `${date} ${time}`;
  return { time, date, full, day };
}

async function generateExcel() {
  console.log('Fetching all updates, profiles, and pods from Supabase...');

  const { data: updates, error } = await supabase
    .from('updates')
    .select('*, profiles(*), pods(*)')
    .order('update_date', { ascending: false })
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }

  console.log(`Successfully fetched ${updates.length} update records.`);

  // 1. Prepare Master Updates Data
  const masterRows = updates.map((u, index) => {
    const ist = formatIST(u.submitted_at || `${u.update_date}T10:00:00Z`);
    const empName = u.profiles?.full_name || u.profile_id || 'Unknown';
    const email = u.profiles?.email || 'N/A';
    const podName = u.pods?.name || u.pod_id || 'General';
    const status = (u.status || 'on_track').replace('_', ' ').toUpperCase();
    const progress = u.progress_percent != null ? `${u.progress_percent}%` : 'N/A';
    const blockerText = u.has_blocker ? (u.blocker || 'Yes') : (u.blocker || 'None');
    const supportNeeded = u.support_needed || 'None';

    const fullUpdateText = `[YESTERDAY]:\n${u.yesterday || 'N/A'}\n\n[TODAY]:\n${u.today || 'N/A'}${u.has_blocker ? `\n\n[BLOCKER]: ${u.blocker}` : ''}`;

    return {
      'S.No': index + 1,
      'Employee Name': empName,
      'Pod / Team': podName,
      'Email': email,
      'Update Date': u.update_date,
      'Day': ist.day,
      'Given Time (IST)': ist.time,
      'Full Timestamp (IST)': ist.full,
      'Status': status,
      'Progress': progress,
      "Yesterday's Work": u.yesterday || '',
      "Today's Planned Tasks": u.today || '',
      'Blockers / Challenges': blockerText,
      'Support Needed': supportNeeded,
      'Full Update Summary': fullUpdateText
    };
  });

  // 2. Prepare Employee Summary
  const empMap = new Map();
  updates.forEach(u => {
    const name = u.profiles?.full_name || u.profile_id;
    const pod = u.pods?.name || u.pod_id || 'General';
    const email = u.profiles?.email || 'N/A';
    const ist = formatIST(u.submitted_at || `${u.update_date}T10:00:00Z`);

    if (!empMap.has(name)) {
      empMap.set(name, {
        name,
        pod,
        email,
        count: 0,
        dates: [],
        latestUpdate: ist.full,
        latestDate: u.update_date,
        blockersCount: 0,
        progressSum: 0,
        progressCount: 0,
        latestStatus: (u.status || 'on_track').replace('_', ' ').toUpperCase()
      });
    }

    const item = empMap.get(name);
    item.count += 1;
    item.dates.push(u.update_date);
    if (u.has_blocker) item.blockersCount += 1;
    if (u.progress_percent != null) {
      item.progressSum += u.progress_percent;
      item.progressCount += 1;
    }
  });

  const empSummaryRows = Array.from(empMap.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((e, idx) => {
      const datesSorted = [...e.dates].sort();
      const avgProgress = e.progressCount > 0 ? `${Math.round(e.progressSum / e.progressCount)}%` : 'N/A';
      return {
        '#': idx + 1,
        'Employee Name': e.name,
        'Pod / Department': e.pod,
        'Email Address': e.email,
        'Total Updates Submitted': e.count,
        'First Update Date': datesSorted[0],
        'Latest Update Date': datesSorted[datesSorted.length - 1],
        'Latest Submission Timestamp': e.latestUpdate,
        'Total Blockers Logged': e.blockersCount,
        'Avg Progress %': avgProgress,
        'Latest Status': e.latestStatus
      };
    });

  // 3. Prepare Daily Breakdown
  const dateMap = new Map();
  updates.forEach(u => {
    const d = u.update_date;
    const ist = formatIST(u.submitted_at || `${u.update_date}T10:00:00Z`);
    const name = u.profiles?.full_name || u.profile_id;
    const pod = u.pods?.name || u.pod_id;

    if (!dateMap.has(d)) {
      dateMap.set(d, {
        date: d,
        day: ist.day,
        total: 0,
        employees: new Set(),
        pods: new Set(),
        blockers: 0
      });
    }

    const item = dateMap.get(d);
    item.total += 1;
    item.employees.add(name);
    if (pod) item.pods.add(pod);
    if (u.has_blocker) item.blockers += 1;
  });

  const dailyBreakdownRows = Array.from(dateMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d, idx) => ({
      '#': idx + 1,
      'Date': d.date,
      'Day of Week': d.day,
      'Total Submissions': d.total,
      'Unique Employees': d.employees.size,
      'Active Pods': Array.from(d.pods).join(', '),
      'Employees List': Array.from(d.employees).join(', '),
      'Blockers Flagged': d.blockers
    }));

  // 4. Prepare Blockers Sheet
  const blockerRows = updates
    .filter(u => u.has_blocker || (u.blocker && u.blocker.toLowerCase() !== 'none'))
    .map((u, idx) => {
      const ist = formatIST(u.submitted_at || `${u.update_date}T10:00:00Z`);
      return {
        '#': idx + 1,
        'Date': u.update_date,
        'Given Time (IST)': ist.time,
        'Employee Name': u.profiles?.full_name || u.profile_id,
        'Pod / Department': u.pods?.name || u.pod_id,
        'Blocker Description': u.blocker || 'N/A',
        'Support Needed': u.support_needed || 'N/A',
        'Status': (u.status || 'blocked').replace('_', ' ').toUpperCase(),
        "Today's Task Context": u.today || ''
      };
    });

  // Create Workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Updates
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wsMaster['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 24 },  // Employee Name
    { wch: 18 },  // Pod / Team
    { wch: 32 },  // Email
    { wch: 14 },  // Update Date
    { wch: 8 },   // Day
    { wch: 16 },  // Given Time (IST)
    { wch: 24 },  // Full Timestamp (IST)
    { wch: 12 },  // Status
    { wch: 10 },  // Progress
    { wch: 50 },  // Yesterday's Work
    { wch: 50 },  // Today's Planned Tasks
    { wch: 30 },  // Blockers
    { wch: 25 },  // Support Needed
    { wch: 60 },  // Full Update Summary
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All Google Chat Updates');

  // Sheet 2: Employee Summary
  const wsEmp = XLSX.utils.json_to_sheet(empSummaryRows);
  wsEmp['!cols'] = [
    { wch: 6 },   // #
    { wch: 24 },  // Employee Name
    { wch: 20 },  // Pod
    { wch: 34 },  // Email
    { wch: 22 },  // Total Updates
    { wch: 16 },  // First Date
    { wch: 16 },  // Latest Date
    { wch: 26 },  // Latest Timestamp
    { wch: 22 },  // Total Blockers
    { wch: 14 },  // Avg Progress
    { wch: 14 }   // Latest Status
  ];
  XLSX.utils.book_append_sheet(wb, wsEmp, 'Employee Summary');

  // Sheet 3: Daily Breakdown
  const wsDaily = XLSX.utils.json_to_sheet(dailyBreakdownRows);
  wsDaily['!cols'] = [
    { wch: 6 },   // #
    { wch: 14 },  // Date
    { wch: 14 },  // Day
    { wch: 18 },  // Total Submissions
    { wch: 18 },  // Unique Employees
    { wch: 30 },  // Active Pods
    { wch: 60 },  // Employees List
    { wch: 18 }   // Blockers Flagged
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Standup Breakdown');

  // Sheet 4: Blockers
  if (blockerRows.length > 0) {
    const wsBlockers = XLSX.utils.json_to_sheet(blockerRows);
    wsBlockers['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 45 },
      { wch: 30 },
      { wch: 12 },
      { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, wsBlockers, 'Blockers & Challenges');
  }

  // Paths to save
  const targetExcelPath = 'C:\\Users\\admin\\.gemini\\antigravity\\scratch\\Google_Chat_Employee_Updates.xlsx';
  const targetCsvPath = 'C:\\Users\\admin\\.gemini\\antigravity\\scratch\\Google_Chat_Employee_Updates.csv';
  
  XLSX.writeFile(wb, targetExcelPath);
  console.log(`✅ Master Excel file saved to: ${targetExcelPath}`);

  // Also write CSV for convenience
  const csvContent = XLSX.utils.sheet_to_csv(wsMaster);
  fs.writeFileSync(targetCsvPath, csvContent, 'utf8');
  console.log(`✅ CSV file saved to: ${targetCsvPath}`);
}

generateExcel().catch(console.error);
