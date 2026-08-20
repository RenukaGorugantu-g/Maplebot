import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { dataStore } from '../../services/dataStore';
import { GradientButton, Button } from '../../components/ui/Button';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building,
  Layers,
  Users,
  Clock,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';

export const FirstAdminSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { showToast } = useNotifications();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [orgName, setOrgName] = useState('Maple Learning Solutions');
  const [timezone, setTimezone] = useState('America/Toronto');
  const [pods, setPods] = useState(['Web & Sales', 'Marketing', 'eLearning', 'HR']);
  const [newPodInput, setNewPodInput] = useState('');
  const [checkinStart, setCheckinStart] = useState('09:00');
  const [checkinDeadline, setCheckinDeadline] = useState('11:00');
  const [gchatSpace, setGchatSpace] = useState('Maple Team Updates');

  const steps = [
    { num: 1, label: 'Organization' },
    { num: 2, label: 'Pods Structure' },
    { num: 3, label: 'Managers' },
    { num: 4, label: 'Invite Members' },
    { num: 5, label: 'Standup Schedule' },
    { num: 6, label: 'Google Chat' },
    { num: 7, label: 'Complete' },
  ];

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finish setup
      dataStore.updateOrganization({
        name: orgName,
        timezone,
      });
      dataStore.updateCheckin({
        start_time: checkinStart,
        deadline_time: checkinDeadline,
      });
      dataStore.updateGoogleChatSettings({
        space_name: gchatSpace,
        enabled: true,
      });
      showToast('success', 'Workspace Configured!', 'Welcome to your initialized MapleBot workspace.');
      onComplete();
    }
  };

  const handleAddPod = () => {
    if (newPodInput.trim() && !pods.includes(newPodInput.trim())) {
      setPods([...pods, newPodInput.trim()]);
      setNewPodInput('');
    }
  };

  const handleRemovePod = (podName: string) => {
    setPods(pods.filter((p) => p !== podName));
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center mx-auto shadow-glow-sm">
            <span className="text-slate-950 font-black text-xl">M</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Welcome to MapleBot</h1>
          <p className="text-xs text-slate-400">First Administrator Onboarding Setup Wizard</p>
        </div>

        {/* Step Indicator */}
        <div className="glass-card p-4 border border-slate-800 flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s.num === currentStep
                    ? 'bg-maple-500 text-slate-950 shadow-glow-sm ring-2 ring-maple-500/30'
                    : s.num < currentStep
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {s.num < currentStep ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="hidden md:inline text-xs text-slate-300 font-medium">
                {s.label}
              </span>
              {idx < steps.length - 1 && <div className="hidden sm:block w-4 h-px bg-slate-800 mx-1" />}
            </div>
          ))}
        </div>

        {/* Main Step Body */}
        <div className="glass-card p-6 sm:p-8 border border-slate-800 space-y-6">
          {/* Step 1: Org Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-maple-400">
                <Building className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Organization Details</h3>
              </div>
              <p className="text-xs text-slate-400">
                Establish the root corporate entity name and primary timezone.
              </p>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Company Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Corporate Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 cursor-pointer"
                  >
                    <option value="America/Toronto">Eastern Time (America/Toronto)</option>
                    <option value="America/Chicago">Central Time (America/Chicago)</option>
                    <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                    <option value="Asia/Kolkata">India Standard Time (Asia/Kolkata)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pods */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-maple-400">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create Functional Pods</h3>
              </div>
              <p className="text-xs text-slate-400">
                Pods are the operational units (Web & Sales, Marketing, eLearning, HR) where updates are coordinated.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPodInput}
                    onChange={(e) => setNewPodInput(e.target.value)}
                    placeholder="Add pod name (e.g. Solutions Architecture)..."
                    className="flex-1 p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddPod}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {pods.map((p) => (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-semibold flex items-center gap-2"
                    >
                      {p}
                      {pods.length > 1 && (
                        <button
                          onClick={() => handleRemovePod(p)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pod Managers */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-maple-400">
                <Users className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Assign Pod Managers</h3>
              </div>
              <p className="text-xs text-slate-400">
                Pod managers oversee standups, follow up on blockers, and generate pod reports.
              </p>

              <div className="space-y-2.5 text-xs">
                {pods.map((p) => (
                  <div
                    key={p}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-white">{p}</span>
                    <span className="text-maple-400 font-medium">Assigned to Lead</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Invite Members */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-maple-400">
                <Users className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Invite Team Members</h3>
              </div>
              <p className="text-xs text-slate-400">
                You can invite team members to their respective pods now or from the Members tab later.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                12 team members are pre-configured in Maple Learning Solutions demo dataset.
              </div>
            </div>
          )}

          {/* Step 5: Standup Schedule */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-maple-400">
                <Clock className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Standup Schedule & Timing</h3>
              </div>
              <p className="text-xs text-slate-400">
                Configure daily prompt window and standup deadline.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Start Time</label>
                  <input
                    type="time"
                    value={checkinStart}
                    onChange={(e) => setCheckinStart(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Deadline</label>
                  <input
                    type="time"
                    value={checkinDeadline}
                    onChange={(e) => setCheckinDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Google Chat */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Google Chat Integration</h3>
              </div>
              <p className="text-xs text-slate-400">
                Connect your Google Workspace Space to broadcast daily standup summaries.
              </p>
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300">Target Google Chat Space Name</label>
                <input
                  type="text"
                  value={gchatSpace}
                  onChange={(e) => setGchatSpace(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Step 7: Complete */}
          {currentStep === 7 && (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-white">MapleBot is Ready!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Your organization architecture, pods, standup schedules, and intelligence policies are ready.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            <GradientButton
              size="md"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {currentStep === 7 ? 'Launch MapleBot Dashboard' : 'Continue'}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
};
