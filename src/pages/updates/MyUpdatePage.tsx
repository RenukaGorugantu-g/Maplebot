// ==============================================================================
// MapleBot: My Daily Check-in & Work Performance Submission
// Direct Work Performance Table (Check-in & Deliverables)
// ==============================================================================

import React from 'react';
import { MemberWorkTab } from '../performance/components/MemberWorkTab';
import { WarmGreetingBanner } from '../../components/ui/WarmGreetingBanner';

export const MyUpdatePage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Warm Uplifting Check-in Greeting Banner */}
      <WarmGreetingBanner
        variant="checkin"
        customSubtext="Take a moment to record your daily tasks, hours invested, and deliverables. Your team appreciates your dedication! 🌟"
      />

      {/* RENDER DIRECT WORK PERFORMANCE TABLE */}
      <MemberWorkTab />
    </div>
  );
};
