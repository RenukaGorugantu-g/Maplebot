import React from 'react';
import { SprintReviewAnalyticsCockpit } from '../performance/components/SprintReviewAnalyticsCockpit';

export const SprintAnalyticsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SprintReviewAnalyticsCockpit
        onNavigateToExecutiveReport={(empId) => onNavigate(`/performance?tab=individual-reports&emp=${empId}`)}
        onNavigateToWorkTable={() => onNavigate('/performance')}
      />
    </div>
  );
};

