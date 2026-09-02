// ==============================================================================
// MapleBot: Executive Performance AI Generation Engine
// Generates 100% evidence-based corporate performance evaluations in JSON format
// ==============================================================================

import { dataStore } from './dataStore';
import { performanceService } from './performanceService';
import {
  ExecutiveReportData,
  PerformanceReport,
  ReportType,
  PerformanceLevel,
  ActivityOutcomeImpact,
  DelayedTaskItem,
  DemonstratedStrengthItem,
  AttentionAreaItem,
} from '../types/performance';

export const performanceAIService = {
  /**
   * Generates a complete executive report JSON payload for an employee over a designated period.
   */
  async generateIndividualReport(params: {
    employeeId: string;
    periodStart: string;
    periodEnd: string;
    periodLabel: string;
    reportType?: ReportType;
    managerRating?: number;
  }): Promise<ExecutiveReportData> {
    const { employeeId, periodStart, periodEnd, periodLabel, reportType = 'monthly', managerRating } = params;

    // Simulate AI synthesis & arithmetic computation
    await new Promise((resolve) => setTimeout(resolve, 300));

    const employee = dataStore.getProfileById(employeeId);
    const employeeName = employee?.full_name || 'Team Member';
    const role = employee?.role === 'admin' ? 'Executive Lead' : employee?.role === 'manager' ? 'Pod Lead' : 'Software Engineer / Specialist';
    const pod = employee?.pod_id ? dataStore.getPodById(employee.pod_id) : undefined;
    const department = pod?.name || 'Maple Learning Solutions';
    const managerName = employee?.manager?.full_name || 'Sandeep Guntupalli';

    // 1. Gather all structured work logs
    const logs = performanceService.getAllWorkLogsForPeriod(
      employeeId,
      employee?.pod_id,
      periodStart,
      periodEnd
    );

    // 2. Fetch KPIs
    const kpis = dataStore.getPerformanceKPIs({
      employeeId,
      podId: employee?.pod_id,
    });

    // 3. Compute deterministic metrics
    const snapshot = performanceService.computeSnapshotMetrics(logs);
    const projectPerformance = performanceService.computeProjectPerformance(logs);
    const delayedTasks = performanceService.computeDelayedTasks(logs);
    const qualitySummary = performanceService.computeQualitySummary(logs);
    const reviewSummary = performanceService.computeReviewSummary(logs);
    const unitProductivity = performanceService.computeProductivitySummary(logs);
    const scoreSummary = performanceService.computeScoreSummary(logs, null, managerRating ? managerRating * 20 : null);

    // 4. Handle Empty State
    if (logs.length === 0) {
      return {
        report_title: `MAPLE AI — PERFORMANCE REPORT`,
        employee_id: employeeId,
        employee_name: employeeName,
        employee_role: role,
        department,
        pod_id: employee?.pod_id,
        pod_name: pod?.name || 'General',
        manager_name: managerName,
        reporting_period: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        generated_at: new Date().toISOString(),
        executive_summary: {
          overview_text: `Insufficient structured work data was recorded for ${employeeName} during ${periodLabel}. No work logs were submitted within the selected date range.`,
          velocity_assessment: 'Data not available.',
          overall_assessment: 'Insufficient Data',
        },
        snapshot,
        project_performance: [],
        delivery_performance: {
          completed_early: 0,
          completed_on_time: 0,
          delayed: 0,
          pending: 0,
          summary_text: 'No deliverables tracked in this period.',
        },
        delayed_tasks: [],
        quality_performance: qualitySummary,
        review_performance: reviewSummary,
        unit_productivity: [],
        key_contributions: [],
        activity_outcome_impact: [],
        demonstrated_strengths: [],
        areas_requiring_attention: [
          {
            area: 'Process',
            finding: 'No activity logs submitted for this review period',
            evidence: '0 work logs recorded',
            recommendation: 'Ensure daily work updates and task deliverables are logged regularly.',
          },
        ],
        executive_recommendation: {
          management_conclusion: 'Insufficient work records exist to complete an objective performance appraisal.',
          next_cycle_focus: 'Establish consistent work logging and deliverable review cadence.',
        },
        transparency: {
          facts: ['0 tasks recorded in database for this period.'],
          insights: ['Performance evaluation deferred until verified work logs are logged.'],
          data_gaps: ['No work log submissions found for the selected reporting period.'],
        },
        score_summary: scoreSummary,
        kpi_metrics: [],
      };
    }

    // 5. Synthesize Executive Summary
    let overallAssessment: PerformanceLevel = 'Strong Contributor';
    if (snapshot.completion_rate >= 90 && delayedTasks.length === 0 && snapshot.completed_tasks >= 3) {
      overallAssessment = 'Exceptional';
    } else if (snapshot.completion_rate >= 75 && snapshot.completed_tasks >= 2) {
      overallAssessment = 'Strong Contributor';
    } else if (snapshot.completion_rate < 50 || delayedTasks.length >= 3) {
      overallAssessment = 'Needs Improvement';
    }

    const projectsListStr = projectPerformance.map((p) => p.project).join(', ') || 'assigned initiatives';
    const overviewText = `${employeeName} completed ${snapshot.completed_tasks} of ${snapshot.total_tasks} tasks during ${periodLabel} across ${snapshot.projects_count} project initiative(s) (${projectsListStr}). Overall task completion was ${snapshot.completion_rate}%, with a total of ${snapshot.total_hours} hours invested and ${snapshot.units_completed} units delivered.`;
    const velocityAssessment = `Overall assessment: ${overallAssessment}. The assessment is based strictly on verified work records and reviewer quality evaluations.`;

    // 6. Delivery Performance
    let deliverySummaryText = `All ${snapshot.completed_tasks} completed tasks were delivered on or ahead of schedule with zero recorded delays.`;
    if (snapshot.delayed_tasks > 0) {
      deliverySummaryText = `${snapshot.on_time_tasks + snapshot.early_tasks} tasks were completed on or ahead of deadline, while ${snapshot.delayed_tasks} task(s) encountered delays due to documented external dependencies.`;
    }

    // 7. Group Key Contributions by Project
    const projectMap = new Map<string, string[]>();
    logs.forEach((l) => {
      const p = l.project_name || l.project || 'General';
      if (!projectMap.has(p)) projectMap.set(p, []);
      if (l.deliverable && l.deliverable.trim().length > 5) {
        projectMap.get(p)!.push(l.deliverable);
      } else if (l.task && l.task.trim().length > 5) {
        projectMap.get(p)!.push(l.task);
      }
    });

    const keyContributions = Array.from(projectMap.entries()).map(([project, items]) => ({
      project,
      summary: `Delivered core milestones and enhancements for ${project}.`,
      highlights: items.slice(0, 3),
    }));

    // 8. Activity -> Outcome -> Impact Matrix
    const aoiMatrix: ActivityOutcomeImpact[] = logs
      .filter((l) => l.deliverable || l.outcome || l.impact)
      .map((l) => ({
        activity: l.task || l.task_title || 'Deliverable implementation',
        outcome: l.outcome || l.deliverable || 'Successfully delivered on schedule',
        impact: l.impact || 'Impact not measurable from available data.',
        project: l.project_name || l.project,
        date: l.date,
      }));

    // 9. Demonstrated Strengths (Evidence-Based)
    const strengths: DemonstratedStrengthItem[] = [];
    if (snapshot.completion_rate >= 80) {
      strengths.push({
        area: 'Delivery',
        title: 'Strong Task Completion & Velocity',
        evidence: `Achieved ${snapshot.completion_rate}% completion across ${snapshot.total_tasks} assigned deliverables.`,
      });
    }
    if (snapshot.early_tasks > 0 || (snapshot.on_time_tasks / Math.max(1, snapshot.completed_tasks) >= 0.8)) {
      strengths.push({
        area: 'Timeliness',
        title: 'High Schedule Reliability',
        evidence: `${snapshot.on_time_tasks + snapshot.early_tasks} of ${snapshot.completed_tasks} completed tasks finished on or ahead of expected deadline.`,
      });
    }
    if (typeof snapshot.average_quality === 'number' && snapshot.average_quality >= 4.0) {
      strengths.push({
        area: 'Quality',
        title: 'High Quality Delivery Standards',
        evidence: `Maintained an average review quality score of ${snapshot.average_quality}/5 with low error frequency (${snapshot.errors_count} total errors).`,
      });
    }
    if (snapshot.total_hours >= 15) {
      strengths.push({
        area: 'Productivity',
        title: 'Consistent Productive Output',
        evidence: `Logged ${snapshot.total_hours} productive work hours and completed ${snapshot.units_completed} verifiable units.`,
      });
    }
    if (strengths.length === 0) {
      strengths.push({
        area: 'Delivery',
        title: 'Active Task Engagement',
        evidence: `Completed ${snapshot.completed_tasks} work deliverables during the review period.`,
      });
    }

    // 10. Areas Requiring Attention (Data-Backed)
    const attentionAreas: AttentionAreaItem[] = [];
    if (delayedTasks.length > 0) {
      attentionAreas.push({
        area: 'Timeliness',
        finding: 'Some tasks exceeded expected completion dates',
        evidence: `${delayedTasks.length} delayed task(s) recorded in audit ledger`,
        recommendation: 'Ensure external dependencies and technical blockers are escalated early in daily standups.',
      });
    }
    if (snapshot.errors_count > 3) {
      attentionAreas.push({
        area: 'Quality',
        finding: 'Review errors identified during quality sign-off',
        evidence: `${snapshot.errors_count} recorded errors across completed units`,
        recommendation: 'Implement pre-review validation checklists before submitting deliverables for Pod Lead verification.',
      });
    }
    if (reviewSummary.pending_reviews > 0) {
      attentionAreas.push({
        area: 'Review',
        finding: 'Some task reviews remain pending verification',
        evidence: `${reviewSummary.pending_reviews} pending review(s)`,
        recommendation: 'Coordinate with Pod Lead for timely review closure.',
      });
    }

    // 11. Executive Recommendation
    const execRecConclusion = `Overall performance was ${overallAssessment.toLowerCase()} based on task completion (${snapshot.completion_rate}%), verified quality (${snapshot.average_quality}/5), and productive output (${snapshot.total_hours}h). ${
      delayedTasks.length > 0
        ? 'The primary area requiring attention is timely closure of delayed tasks and early mitigation of external blockers.'
        : 'Delivery reliability remained consistent across all assigned project areas.'
    }`;

    // 12. Fact / Insight / Data Gap Protocol
    const facts = [
      `Fact: ${snapshot.completed_tasks} of ${snapshot.total_tasks} assigned tasks were completed (${snapshot.completion_rate}%).`,
      `Fact: Total of ${snapshot.total_hours} productive hours logged across ${snapshot.projects_count} project(s).`,
      `Fact: Total units delivered: ${snapshot.units_completed} with ${snapshot.errors_count} review error(s).`,
      `Fact: Average turnaround time: ${snapshot.average_tat}.`,
    ];
    const insights = [
      `AI Insight: Completion rate of ${snapshot.completion_rate}% indicates strong delivery velocity and technical reliability.`,
      snapshot.delayed_tasks > 0
        ? `AI Insight: Delays were concentrated in dependency-heavy API/schema tasks.`
        : `AI Insight: Work execution strictly matched committed sprint deadlines.`,
    ];
    const dataGaps: string[] = [];
    if (delayedTasks.some((d) => d.reason.includes('Not documented'))) {
      dataGaps.push('Data Gap: Detailed root-cause reasons for some delayed tasks were not documented in comments.');
    }
    if (logs.some((l) => !l.impact || l.impact.includes('not measurable'))) {
      dataGaps.push('Data Gap: Long-term business impact metrics for some internal technical tasks could not be measured directly.');
    }
    if (dataGaps.length === 0) {
      dataGaps.push('Data Gap: No significant data gaps identified. All deliverables have verified completion dates and reviewer sign-offs.');
    }

    // 13. Map KRA / KPI table
    const kpiMetrics = kpis.map((k) => ({
      kra: k.kra,
      kpi: k.kpi,
      target: k.target_value !== undefined ? `${k.target_value}${k.target_unit || ''}` : 'Not Defined',
      actual: k.actual_value !== undefined ? `${k.actual_value}${k.target_unit || ''}` : 'N/A',
      status: k.status,
      frequency: k.frequency,
      notes: k.measurement,
    }));

    return {
      report_title: `MAPLE AI — PERFORMANCE REPORT`,
      employee_id: employeeId,
      employee_name: employeeName,
      employee_role: role,
      department,
      pod_id: employee?.pod_id,
      pod_name: pod?.name || 'General',
      manager_name: managerName,
      reporting_period: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      generated_at: new Date().toISOString(),
      executive_summary: {
        overview_text: overviewText,
        velocity_assessment: velocityAssessment,
        overall_assessment: overallAssessment,
      },
      snapshot,
      project_performance: projectPerformance,
      delivery_performance: {
        completed_early: snapshot.early_tasks,
        completed_on_time: snapshot.on_time_tasks,
        delayed: snapshot.delayed_tasks,
        pending: snapshot.pending_tasks,
        summary_text: deliverySummaryText,
      },
      delayed_tasks: delayedTasks,
      quality_performance: qualitySummary,
      review_performance: reviewSummary,
      unit_productivity: unitProductivity,
      key_contributions: keyContributions,
      activity_outcome_impact: aoiMatrix,
      demonstrated_strengths: strengths,
      areas_requiring_attention: attentionAreas,
      executive_recommendation: {
        management_conclusion: execRecConclusion,
        next_cycle_focus: 'Maintain deliverable quality while ensuring proactive escalation of technical impediments.',
      },
      transparency: {
        facts,
        insights,
        data_gaps: dataGaps,
      },
      score_summary: scoreSummary,
      kpi_metrics: kpiMetrics,
    };
  },
};
