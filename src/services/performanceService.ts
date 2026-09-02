// ==============================================================================
// MapleBot: Performance Calculation Engine (100% Deterministic Arithmetic)
// Code-First Metrics: TAT, Review TAT, Delays, Error Rates, Productivity & Efficiency
// ==============================================================================

import {
  PerformanceWorkLog,
  PerformanceSnapshotMetrics,
  ProjectPerformanceItem,
  ProjectBreakdownItem,
  CategoryBreakdownItem,
  DelayedTaskItem,
  QualityPerformanceSummary,
  ReviewPerformanceSummary,
  UnitProductivityItem,
  TeamExecutiveReportData,
  PerformanceScoreSummary,
  ScoreComponent,
  DeliveryStatus,
  QualityRating,
} from '../types/performance';
import { dataStore } from './dataStore';

export class PerformanceCalculationService {
  /**
   * Calculates Turnaround Time (TAT) in days between Assigned Date and Completed Date.
   * Formula: TAT = Completed Date - Assigned Date
   */
  calculateTAT(assignedDate?: string, completedDate?: string): { label: string; days: number | null } {
    if (!assignedDate || !completedDate) {
      return { label: 'Not Available', days: null };
    }
    const start = new Date(assignedDate);
    const end = new Date(completedDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { label: 'Not Available', days: null };
    }
    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    return {
      label: `${days} day${days === 1 ? '' : 's'}`,
      days,
    };
  }

  /**
   * Calculates Review TAT in days between Review Assigned Date and Review Completed Date.
   */
  calculateReviewTAT(reviewAssignedDate?: string, reviewCompletedDate?: string): number | null {
    if (!reviewAssignedDate || !reviewCompletedDate) return null;
    const start = new Date(reviewAssignedDate);
    const end = new Date(reviewCompletedDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculates Delivery Status & Delay days based on Expected vs Actual Completed Date.
   */
  calculateDeliveryStatus(
    expectedDate?: string,
    completedDate?: string
  ): { status: DeliveryStatus; delayDays: number; delayLabel: string } {
    if (!completedDate) {
      return { status: 'pending', delayDays: 0, delayLabel: 'In Progress / Pending' };
    }
    if (!expectedDate) {
      return { status: 'completed_on_time', delayDays: 0, delayLabel: 'Completed (No deadline)' };
    }

    const expected = new Date(expectedDate);
    const completed = new Date(completedDate);
    if (isNaN(expected.getTime()) || isNaN(completed.getTime())) {
      return { status: 'completed_on_time', delayDays: 0, delayLabel: 'Completed' };
    }

    const diffDays = Math.round((completed.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        status: 'completed_early',
        delayDays: diffDays,
        delayLabel: `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} early`,
      };
    }
    if (diffDays === 0) {
      return { status: 'completed_on_time', delayDays: 0, delayLabel: 'On Time' };
    }
    return {
      status: 'delayed',
      delayDays: diffDays,
      delayLabel: `${diffDays} day${diffDays === 1 ? '' : 's'} delayed`,
    };
  }

  /**
   * Converts Quality rating (numeric 1-5 or text string) to normalized 1-5 number.
   */
  normalizeQualityScore(quality?: number | QualityRating | string): number | null {
    if (quality === undefined || quality === null || quality === '') return null;
    if (typeof quality === 'number') return quality;
    const qStr = quality.toLowerCase().trim();
    if (qStr === 'excellent' || qStr === '5') return 5.0;
    if (qStr === 'good' || qStr === '4') return 4.0;
    if (qStr === 'satisfactory' || qStr === '3') return 3.0;
    if (qStr === 'needs improvement' || qStr === 'needs_improvement' || qStr === '2') return 2.0;
    if (qStr === 'poor' || qStr === '1') return 1.0;
    const num = parseFloat(qStr);
    return isNaN(num) ? null : num;
  }

  /**
   * Transparent Efficiency Formula:
   * Efficiency = [ 0.35 * CompletionRate + 0.25 * OnTimeRate + 0.25 * (Quality/5.0) + 0.15 * (1 - ErrorRate) ] * 100
   * Output: numeric % or "Not Available" if insufficient data.
   */
  calculateEfficiencyScore(params: {
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    qualityScore: number | null;
    totalUnits: number;
    totalErrors: number;
  }): { score: number | null; label: string } {
    if (params.totalTasks === 0) {
      return { score: null, label: 'Not Available' };
    }

    const completionRatio = Math.min(1, params.completedTasks / params.totalTasks);
    const onTimeRatio = params.completedTasks > 0 ? Math.min(1, params.onTimeTasks / params.completedTasks) : 0;
    const qualityRatio = params.qualityScore !== null ? Math.min(1, Math.max(0, params.qualityScore / 5.0)) : null;
    const errorRatio = params.totalUnits > 0 ? Math.min(1, params.totalErrors / params.totalUnits) : 0;
    const errorFactor = Math.max(0, 1 - errorRatio);

    // If quality is not evaluated, re-weight among available factors
    let calculated = 0;
    if (qualityRatio !== null) {
      calculated = 0.35 * completionRatio + 0.25 * onTimeRatio + 0.25 * qualityRatio + 0.15 * errorFactor;
    } else {
      // 0.35 / 0.75, 0.25 / 0.75, 0.15 / 0.75
      calculated = (0.45 * completionRatio) + (0.35 * onTimeRatio) + (0.20 * errorFactor);
    }

    const finalPercent = Math.round(calculated * 100);
    return {
      score: finalPercent,
      label: `${finalPercent}%`,
    };
  }

  /**
   * Retrieves and filters all structured work logs for a given period and employee/pod.
   */
  getAllWorkLogsForPeriod(
    employeeId?: string,
    podId?: string,
    startDate?: string,
    endDate?: string
  ): PerformanceWorkLog[] {
    const rawLogs = dataStore.getPerformanceWorkLogs({
      employeeId,
      podId,
      startDate,
      endDate,
    });

    // Auto-enrich any logs that have dates but missing TAT or delivery status
    return rawLogs.map((log) => {
      const tatResult = this.calculateTAT(log.assigned_date || log.date, log.completed_date);
      const deliveryResult = this.calculateDeliveryStatus(log.expected_completion_date, log.completed_date);
      const revTat = this.calculateReviewTAT(log.review_assigned_date, log.review_completed_date);
      const errRate = (log.unit_count_completed > 0 && log.error_count !== undefined)
        ? Math.round(((log.error_count || 0) / log.unit_count_completed) * 1000) / 10
        : undefined;
      const unitsPerHr = (log.time_invested > 0 && log.unit_count_completed > 0)
        ? Math.round((log.unit_count_completed / log.time_invested) * 10) / 10
        : undefined;

      return {
        ...log,
        tat: log.tat || tatResult.label,
        tat_days: log.tat_days ?? (tatResult.days ?? undefined),
        delivery_status: log.delivery_status || deliveryResult.status,
        delay_days: log.delay_days ?? deliveryResult.delayDays,
        review_tat_days: log.review_tat_days ?? (revTat ?? undefined),
        error_rate: log.error_rate ?? errRate,
        units_per_hour: log.units_per_hour ?? unitsPerHr,
        duration_hours: log.time_invested || log.duration_hours || 0,
        project: log.project_name || log.project || 'General',
        task_title: log.task || log.task_title || 'Work Task',
      };
    });
  }

  /**
   * Computes high-level Snapshot Metrics across a set of logs.
   */
  computeSnapshotMetrics(logs: PerformanceWorkLog[]): PerformanceSnapshotMetrics {
    const total_tasks = logs.length;
    const completed_tasks = logs.filter(
      (l) => l.status === 'completed' || !!l.completed_date
    ).length;
    const completion_rate = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 1000) / 10 : 0;
    const total_hours = Math.round(logs.reduce((acc, l) => acc + (l.time_invested || l.duration_hours || 0), 0) * 10) / 10;
    const units_completed = logs.reduce((acc, l) => acc + (l.unit_count_completed || 0), 0);
    const errors_count = logs.reduce((acc, l) => acc + (l.error_count || l.errors || 0), 0);

    // Compute average quality
    const ratedLogs = logs.filter((l) => l.quality !== undefined && l.quality !== null);
    let average_quality: number | string = 'Pending Manager Review';
    let qualityNumTotal = 0;
    if (ratedLogs.length > 0) {
      ratedLogs.forEach((l) => {
        qualityNumTotal += this.normalizeQualityScore(l.quality) || 0;
      });
      average_quality = Math.round((qualityNumTotal / ratedLogs.length) * 10) / 10;
    }

    // Compute average TAT
    const tatDaysList = logs
      .map((l) => this.calculateTAT(l.assigned_date || l.date, l.completed_date).days)
      .filter((d): d is number => d !== null);
    const average_tat = tatDaysList.length > 0
      ? `${(tatDaysList.reduce((a, b) => a + b, 0) / tatDaysList.length).toFixed(1)} days`
      : 'Not Available';

    // Delivery breakdown
    let early = 0;
    let on_time = 0;
    let delayed = 0;
    let pending = 0;

    logs.forEach((l) => {
      const del = this.calculateDeliveryStatus(l.expected_completion_date, l.completed_date);
      if (del.status === 'completed_early') early++;
      else if (del.status === 'completed_on_time') on_time++;
      else if (del.status === 'delayed') delayed++;
      else pending++;
    });

    // Efficiency
    const effResult = this.calculateEfficiencyScore({
      totalTasks: total_tasks,
      completedTasks: completed_tasks,
      onTimeTasks: on_time + early,
      qualityScore: typeof average_quality === 'number' ? average_quality : null,
      totalUnits: units_completed,
      totalErrors: errors_count,
    });

    const projectsSet = new Set(logs.map((l) => l.project_name || l.project || 'General'));
    const high_priority = logs.filter((l) => l.priority === 'high' || l.priority === 'critical').length;
    const blocked = logs.filter((l) => l.status === 'blocked').length;

    return {
      total_tasks,
      completed_tasks,
      completion_rate,
      total_hours,
      units_completed,
      errors_count,
      average_quality,
      average_tat,
      efficiency: effResult.label,
      projects_count: projectsSet.size,
      high_priority_tasks: high_priority,
      pending_tasks: pending,
      blocked_tasks: blocked,
      delayed_tasks: delayed,
      early_tasks: early,
      on_time_tasks: on_time,
    };
  }

  /**
   * Computes granular Project Performance breakdown table (Section 35).
   */
  computeProjectPerformance(logs: PerformanceWorkLog[]): ProjectPerformanceItem[] {
    const map = new Map<string, PerformanceWorkLog[]>();
    logs.forEach((l) => {
      const p = l.project_name || l.project || 'General';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(l);
    });

    return Array.from(map.entries()).map(([project, pLogs]) => {
      const tasks = pLogs.length;
      const completed = pLogs.filter((l) => l.status === 'completed' || !!l.completed_date).length;
      const units = pLogs.reduce((acc, l) => acc + (l.unit_count_completed || 0), 0);
      const time_hours = Math.round(pLogs.reduce((acc, l) => acc + (l.time_invested || l.duration_hours || 0), 0) * 10) / 10;
      const errors = pLogs.reduce((acc, l) => acc + (l.error_count || l.errors || 0), 0);

      const rated = pLogs.filter((l) => l.quality !== undefined && l.quality !== null);
      let quality: number | string = 'Pending';
      if (rated.length > 0) {
        const sum = rated.reduce((acc, l) => acc + (this.normalizeQualityScore(l.quality) || 0), 0);
        quality = Math.round((sum / rated.length) * 10) / 10;
      }

      const tatDays = pLogs
        .map((l) => this.calculateTAT(l.assigned_date || l.date, l.completed_date).days)
        .filter((d): d is number => d !== null);
      const avg_tat = tatDays.length > 0
        ? `${(tatDays.reduce((a, b) => a + b, 0) / tatDays.length).toFixed(1)}d`
        : 'N/A';

      const onTimeCount = pLogs.filter((l) => {
        const d = this.calculateDeliveryStatus(l.expected_completion_date, l.completed_date);
        return d.status === 'completed_on_time' || d.status === 'completed_early';
      }).length;

      const eff = this.calculateEfficiencyScore({
        totalTasks: tasks,
        completedTasks: completed,
        onTimeTasks: onTimeCount,
        qualityScore: typeof quality === 'number' ? quality : null,
        totalUnits: units,
        totalErrors: errors,
      });

      return {
        project,
        tasks,
        completed,
        units,
        time_hours,
        errors,
        quality,
        avg_tat,
        efficiency: eff.label,
        completion_rate: tasks > 0 ? Math.round((completed / tasks) * 100) : 0,
      };
    });
  }

  /**
   * Computes delayed tasks for root-cause analysis (Section 37).
   */
  computeDelayedTasks(logs: PerformanceWorkLog[]): DelayedTaskItem[] {
    const delayed: DelayedTaskItem[] = [];

    logs.forEach((l) => {
      const del = this.calculateDeliveryStatus(l.expected_completion_date, l.completed_date);
      if (del.status === 'delayed') {
        let reason = 'Reason: Not documented';
        if (l.comments && l.comments.trim().length > 3) {
          reason = l.comments.trim();
        } else if (l.task_description && l.task_description.trim().length > 3) {
          reason = l.task_description.trim();
        }

        delayed.push({
          task: l.task || l.task_title || 'Task',
          project: l.project_name || l.project || 'General',
          expected_date: l.expected_completion_date || 'Not Defined',
          completed_date: l.completed_date || 'Pending',
          delay_days: del.delayDays,
          delay_label: del.delayLabel,
          reason,
        });
      }
    });

    return delayed;
  }

  /**
   * Computes Quality Performance summary (Section 38).
   */
  computeQualitySummary(logs: PerformanceWorkLog[]): QualityPerformanceSummary {
    const rated = logs.filter((l) => l.quality !== undefined && l.quality !== null);
    let avgQuality: number | string = 'Pending Manager Review';
    if (rated.length > 0) {
      const sum = rated.reduce((acc, l) => acc + (this.normalizeQualityScore(l.quality) || 0), 0);
      avgQuality = Math.round((sum / rated.length) * 10) / 10;
    }

    const totalErrors = logs.reduce((acc, l) => acc + (l.error_count || l.errors || 0), 0);
    const totalUnits = logs.reduce((acc, l) => acc + (l.unit_count_completed || 0), 0);
    const errorRate = totalUnits > 0
      ? Math.round((totalErrors / totalUnits) * 1000) / 10
      : (logs.length > 0 ? Math.round((totalErrors / logs.length) * 1000) / 10 : 0);

    const tasksWithErrors = logs.filter((l) => (l.error_count || l.errors || 0) > 0).length;
    const errorFreeTasks = Math.max(0, logs.length - tasksWithErrors);

    let interpretation = 'Quality remained strong during the reporting period with low error frequency.';
    if (totalErrors > 5) {
      interpretation = `Total of ${totalErrors} errors recorded across ${tasksWithErrors} tasks requiring management attention on review checklists.`;
    } else if (rated.length === 0) {
      interpretation = 'Quality evaluation pending manager assessment.';
    }

    return {
      average_quality: avgQuality,
      total_errors: totalErrors,
      error_rate_percent: `${errorRate}%`,
      error_free_tasks: errorFreeTasks,
      tasks_with_errors: tasksWithErrors,
      interpretation,
    };
  }

  /**
   * Computes Review Performance summary (Section 39).
   */
  computeReviewSummary(logs: PerformanceWorkLog[]): ReviewPerformanceSummary {
    const reviewsAssigned = logs.filter((l) => !!l.review_assigned_date).length;
    const reviewsCompleted = logs.filter((l) => !!l.review_completed_date).length;
    const pendingReviews = Math.max(0, reviewsAssigned - reviewsCompleted);

    const revTatDays = logs
      .map((l) => this.calculateReviewTAT(l.review_assigned_date, l.review_completed_date))
      .filter((d): d is number => d !== null);

    const avgRevTat = revTatDays.length > 0
      ? `${(revTatDays.reduce((a, b) => a + b, 0) / revTatDays.length).toFixed(1)} days`
      : (reviewsCompleted > 0 ? '1.0 day' : 'Not Available');

    return {
      reviews_assigned: reviewsAssigned || logs.length,
      reviews_completed: reviewsCompleted,
      pending_reviews: pendingReviews,
      average_review_tat: avgRevTat,
      review_completion_rate: reviewsAssigned > 0 ? Math.round((reviewsCompleted / reviewsAssigned) * 100) : 100,
    };
  }

  /**
   * Computes Unit Productivity summary (Section 40).
   */
  computeProductivitySummary(logs: PerformanceWorkLog[]): UnitProductivityItem[] {
    const map = new Map<string, { units: number; hours: number }>();

    logs.forEach((l) => {
      const p = l.project_name || l.project || 'General';
      if (!map.has(p)) map.set(p, { units: 0, hours: 0 });
      const entry = map.get(p)!;
      entry.units += l.unit_count_completed || 0;
      entry.hours += l.time_invested || l.duration_hours || 0;
    });

    return Array.from(map.entries()).map(([project, data]) => {
      const hrs = Math.round(data.hours * 10) / 10;
      const uPerHr = hrs > 0 ? Math.round((data.units / hrs) * 10) / 10 : 'N/A';
      return {
        project,
        units: data.units,
        hours: hrs,
        units_per_hour: uPerHr,
      };
    });
  }

  /**
   * Computes 100-point Weighted Corporate Scorecard.
   * Formula: 30% Task Completion, 20% On-Time, 20% Priority, 15% KPI, 15% Manager Evaluation.
   */
  computeScoreSummary(
    logs: PerformanceWorkLog[],
    kpiScore: number | null = null,
    managerScore: number | null = null
  ): PerformanceScoreSummary {
    const total = logs.length;
    const completed = logs.filter((l) => l.status === 'completed' || !!l.completed_date).length;
    const taskCompletionRaw = total > 0 ? Math.round((completed / total) * 100) : 0;

    let onTimeCount = 0;
    logs.forEach((l) => {
      const d = this.calculateDeliveryStatus(l.expected_completion_date, l.completed_date);
      if (d.status === 'completed_on_time' || d.status === 'completed_early') onTimeCount++;
    });
    const onTimeRaw = completed > 0 ? Math.round((onTimeCount / completed) * 100) : (total > 0 ? 0 : 100);

    const highPriority = logs.filter((l) => l.priority === 'high' || l.priority === 'critical');
    const highPriorityCompleted = highPriority.filter((l) => l.status === 'completed' || !!l.completed_date).length;
    const priorityRaw = highPriority.length > 0 ? Math.round((highPriorityCompleted / highPriority.length) * 100) : taskCompletionRaw;

    const taskComponent: ScoreComponent = {
      name: 'Task Completion',
      weight_percent: 30,
      raw_score: taskCompletionRaw,
      weighted_score: Math.round(taskCompletionRaw * 0.3),
      is_evaluated: true,
      notes: `${completed} of ${total} tasks closed (${taskCompletionRaw}%)`,
    };

    const onTimeComponent: ScoreComponent = {
      name: 'On-Time Delivery',
      weight_percent: 20,
      raw_score: onTimeRaw,
      weighted_score: Math.round(onTimeRaw * 0.2),
      is_evaluated: true,
      notes: `${onTimeCount} delivered on or ahead of deadline`,
    };

    const priorityComponent: ScoreComponent = {
      name: 'Priority Work Delivery',
      weight_percent: 20,
      raw_score: priorityRaw,
      weighted_score: Math.round(priorityRaw * 0.2),
      is_evaluated: true,
      notes: `${highPriorityCompleted} of ${highPriority.length} high-priority tasks completed`,
    };

    const kpiComponent: ScoreComponent = {
      name: 'KPI Achievement',
      weight_percent: 15,
      raw_score: kpiScore,
      weighted_score: kpiScore !== null ? Math.round(kpiScore * 0.15) : null,
      is_evaluated: kpiScore !== null,
      notes: kpiScore !== null ? `KPI target attainment: ${kpiScore}%` : 'Target: Not Defined',
    };

    const managerComponent: ScoreComponent = {
      name: 'Manager Evaluation',
      weight_percent: 15,
      raw_score: managerScore,
      weighted_score: managerScore !== null ? Math.round(managerScore * 0.15) : null,
      is_evaluated: managerScore !== null,
      notes: managerScore !== null ? `Manager appraisal score: ${managerScore}/100` : 'Not Yet Evaluated',
    };

    // Calculate total
    let totalScore = (taskComponent.weighted_score || 0) + (onTimeComponent.weighted_score || 0) + (priorityComponent.weighted_score || 0);
    let maxWeightEvaluated = 70;

    if (kpiComponent.is_evaluated && kpiComponent.weighted_score !== null) {
      totalScore += kpiComponent.weighted_score;
      maxWeightEvaluated += 15;
    }
    if (managerComponent.is_evaluated && managerComponent.weighted_score !== null) {
      totalScore += managerComponent.weighted_score;
      maxWeightEvaluated += 15;
    }

    const normalizedTotalScore = Math.round((totalScore / maxWeightEvaluated) * 100);

    let evaluation_status: 'Fully Evaluated' | 'Partially Evaluated' | 'Not Yet Evaluated' = 'Partially Evaluated';
    if (kpiComponent.is_evaluated && managerComponent.is_evaluated) {
      evaluation_status = 'Fully Evaluated';
    } else if (!kpiComponent.is_evaluated && !managerComponent.is_evaluated) {
      evaluation_status = 'Partially Evaluated';
    }

    let overall_assessment: any = 'Strong Contributor';
    if (normalizedTotalScore >= 90) overall_assessment = 'Exceptional';
    else if (normalizedTotalScore >= 75) overall_assessment = 'Strong Contributor';
    else if (normalizedTotalScore >= 60) overall_assessment = 'Meets Expectations';
    else overall_assessment = 'Needs Improvement';

    return {
      total_score: normalizedTotalScore,
      max_score: 100,
      evaluation_status,
      overall_assessment,
      components: {
        task_completion: taskComponent,
        on_time_delivery: onTimeComponent,
        priority_work: priorityComponent,
        kpi_achievement: kpiComponent,
        manager_evaluation: managerComponent,
      },
    };
  }

  /**
   * Computes high-level project breakdown for legacy dashboard compatibility.
   */
  computeProjectBreakdown(logs: PerformanceWorkLog[]): ProjectBreakdownItem[] {
    const map = new Map<string, PerformanceWorkLog[]>();
    logs.forEach((l) => {
      const p = l.project_name || l.project || 'General';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(l);
    });

    return Array.from(map.entries()).map(([project, pLogs]) => {
      const tasks = pLogs.length;
      const completed = pLogs.filter((l) => l.status === 'completed' || !!l.completed_date).length;
      const hours = Math.round(pLogs.reduce((acc, l) => acc + (l.time_invested || l.duration_hours || 0), 0) * 10) / 10;
      return {
        project,
        total_tasks: tasks,
        completed_tasks: completed,
        total_hours: hours,
        completion_rate: tasks > 0 ? Math.round((completed / tasks) * 100) : 0,
      };
    });
  }

  /**
   * Computes category breakdown.
   */
  computeCategoryBreakdown(logs: PerformanceWorkLog[]): CategoryBreakdownItem[] {
    const map = new Map<string, PerformanceWorkLog[]>();
    logs.forEach((l) => {
      const c = l.category || 'Development';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(l);
    });

    return Array.from(map.entries()).map(([category, cLogs]) => {
      const tasks = cLogs.length;
      const completed = cLogs.filter((l) => l.status === 'completed' || !!l.completed_date).length;
      const hours = Math.round(cLogs.reduce((acc, l) => acc + (l.time_invested || l.duration_hours || 0), 0) * 10) / 10;
      return {
        category,
        total_tasks: tasks,
        completed_tasks: completed,
        total_hours: hours,
        completion_rate: tasks > 0 ? Math.round((completed / tasks) * 100) : 0,
      };
    });
  }

  /**
   * Transforms raw 3-question standup update into structured work logs.
   */
  transformUpdateToWorkLogs(update: any): Omit<PerformanceWorkLog, 'id' | 'created_at' | 'updated_at'>[] {
    const lines = (update.yesterday || '').split('\n').filter((line: string) => line.trim().length > 3);
    const author = dataStore.getProfileById(update.profile_id);
    const pod = author?.pod_id ? dataStore.getPodById(author.pod_id) : undefined;
    const items: Omit<PerformanceWorkLog, 'id' | 'created_at' | 'updated_at'>[] = [];

    if (lines.length === 0 && update.yesterday) {
      lines.push(update.yesterday);
    }

    lines.forEach((line: string, index: number) => {
      const cleanTask = line.replace(/^[-*•\d.]+\s*/, '').trim();
      if (!cleanTask) return;

      let project = 'General Operations';
      if (cleanTask.toLowerCase().includes('lxd') || cleanTask.toLowerCase().includes('marketplace')) project = 'LXD Marketplace';
      else if (cleanTask.toLowerCase().includes('lms') || cleanTask.toLowerCase().includes('learndash')) project = 'Maple LMS';
      else if (cleanTask.toLowerCase().includes('website') || cleanTask.toLowerCase().includes('portal')) project = 'Corporate Website';
      else if (cleanTask.toLowerCase().includes('seo') || cleanTask.toLowerCase().includes('schema')) project = 'Organic SEO';

      let cat: any = 'Development';
      if (cleanTask.toLowerCase().includes('seo') || cleanTask.toLowerCase().includes('traffic')) cat = 'SEO';
      else if (cleanTask.toLowerCase().includes('form') || cleanTask.toLowerCase().includes('lead') || cleanTask.toLowerCase().includes('hubspot')) cat = 'Sales';
      else if (cleanTask.toLowerCase().includes('course') || cleanTask.toLowerCase().includes('scorm')) cat = 'LMS';

      const hrs = Math.max(1.0, Math.round((4.0 / (lines.length || 1)) * 10) / 10);

      items.push({
        organization_id: update.organization_id || 'org-maple-01',
        employee_id: update.profile_id,
        employee_name: author?.full_name || 'Team Member',
        department_id: author?.pod_id,
        department: pod?.name || 'Maple Learning Solutions',
        pod_id: author?.pod_id,
        pod_name: pod?.name,
        date: update.update_date || new Date().toISOString().split('T')[0],
        project_name: project,
        project,
        task: cleanTask,
        task_title: cleanTask,
        assigned_date: update.update_date || new Date().toISOString().split('T')[0],
        completed_date: update.status === 'on_track' ? update.update_date : undefined,
        time_invested: hrs,
        duration_hours: hrs,
        unit_count_completed: 1,
        review_assigned_date: update.update_date || new Date().toISOString().split('T')[0],
        comments: update.blocker || '',
        category: cat,
        status: update.status === 'blocked' ? 'blocked' : 'completed',
        priority: update.priority || 'medium',
        workflow_status: 'submitted',
        delivery_status: update.status === 'blocked' ? 'pending' : 'completed_on_time',
        deliverable: cleanTask,
        outcome: 'Completed and verified via daily standup check-in',
        impact: 'Impact not measurable from available data.',
        source_update_id: update.id,
      });
    });

    return items;
  }

  /**
   * Generates Aggregate Team Executive Data for Pod and Manager views (Section 62).
   */
  generateTeamExecutiveData(
    podId?: string,
    startDate?: string,
    endDate?: string,
    periodLabel = 'August 2026'
  ): TeamExecutiveReportData {
    const pod = podId ? dataStore.getPodById(podId) : undefined;
    const teamName = pod ? `${pod.name} Pod` : 'Maple Learning Solutions (All Pods)';
    const lead = pod?.manager_id ? dataStore.getProfileById(pod.manager_id) : undefined;

    const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
    const memberProfiles = podId
      ? allProfiles.filter((p) => p.pod_id === podId || (p.pod_ids && p.pod_ids.includes(podId)))
      : allProfiles;

    const teamLogs = this.getAllWorkLogsForPeriod(undefined, podId, startDate, endDate);
    const snapshot = this.computeSnapshotMetrics(teamLogs);

    const members_summary = memberProfiles.map((member) => {
      const mLogs = teamLogs.filter((l) => l.employee_id === member.id);
      const mSnapshot = this.computeSnapshotMetrics(mLogs);
      const mScore = mLogs.length > 0 ? this.computeScoreSummary(mLogs).total_score : null;
      const memberBlockers = dataStore.getBlockers().filter((b) => b.reported_by === member.id && b.status === 'open');

      return {
        employee_id: member.id,
        employee_name: member.full_name,
        role: member.role || 'Specialist',
        total_tasks: mSnapshot.total_tasks,
        completed_tasks: mSnapshot.completed_tasks,
        total_hours: mSnapshot.total_hours,
        total_units: mSnapshot.units_completed,
        completion_rate: mSnapshot.completion_rate,
        quality: mSnapshot.average_quality,
        errors: mSnapshot.errors_count,
        tat: mSnapshot.average_tat,
        efficiency: mSnapshot.efficiency,
        projects_count: mSnapshot.projects_count,
        active_blockers_count: memberBlockers.length,
        performance_score: mScore,
      };
    });

    // Extract High Priority Pending
    const highPending = teamLogs
      .filter((l) => (l.status === 'pending' || l.status === 'in_progress') && (l.priority === 'high' || l.priority === 'critical'))
      .map((l) => ({
        task: l.task || l.task_title || 'Critical Deliverable',
        employee: l.employee_name,
        priority: l.priority || 'high',
        project: l.project_name || l.project || 'General',
        reason: l.comments || 'Pending completion',
      }));

    // Extract active blockers
    const rawBlockers = dataStore.getBlockers().filter((b) => (!podId || b.pod_id === podId) && b.status === 'open');
    const repeated_blockers = rawBlockers.map((b) => ({
      blocker: b.title,
      affected_employee: b.reporter?.full_name || 'Team Member',
      impact: b.severity.toUpperCase(),
      suggested_resolution: b.description || 'Requires lead assistance & dependency resolution',
    }));

    return {
      team_name: teamName,
      pod_id: podId,
      lead_name: lead?.full_name || 'Renuka Gorugantu',
      manager_name: 'Sandeep Guntupalli',
      reporting_period: periodLabel,
      period_start: startDate || '2026-08-01',
      period_end: endDate || '2026-08-31',
      generated_at: new Date().toISOString(),
      team_summary: {
        total_members: memberProfiles.length,
        total_tasks: snapshot.total_tasks,
        completed_tasks: snapshot.completed_tasks,
        completion_rate: snapshot.completion_rate,
        total_hours: snapshot.total_hours,
        total_units: snapshot.units_completed,
        total_errors: snapshot.errors_count,
        average_quality: snapshot.average_quality,
        average_tat: snapshot.average_tat,
        active_projects_count: snapshot.projects_count,
        pending_tasks: snapshot.pending_tasks,
        delayed_tasks: snapshot.delayed_tasks,
        at_risk_tasks: snapshot.blocked_tasks + snapshot.delayed_tasks,
      },
      members_summary,
      management_attention: {
        high_priority_pending: highPending,
        repeated_blockers,
      },
      transparency: {
        facts: [
          `${snapshot.completed_tasks} of ${snapshot.total_tasks} tasks completed across ${memberProfiles.length} active team members.`,
          `Total logged productive work: ${snapshot.total_hours} hours across ${snapshot.projects_count} project initiatives.`,
          `Total completed units: ${snapshot.units_completed} with ${snapshot.errors_count} identified errors.`,
        ],
        insights: [
          `Overall team completion rate of ${snapshot.completion_rate}% demonstrates healthy delivery cadence.`,
          snapshot.delayed_tasks > 0
            ? `${snapshot.delayed_tasks} delayed deliverables identified requiring sprint priority adjustment.`
            : 'All completed work was delivered within or ahead of estimated turnaround time.',
        ],
        data_gaps: [
          highPending.filter((h) => h.reason === 'Pending completion').length > 0
            ? 'Root cause explanations for some delayed deliverables were not documented.'
            : 'All active pending items have documented context.',
        ],
      },
    };
  }
}

export const performanceService = new PerformanceCalculationService();
