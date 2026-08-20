import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { aiService } from '../../services/aiService';
import { AIResponsePayload } from '../../types/database';
import { GradientButton, Button } from '../../components/ui/Button';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  HelpCircle,
  Lightbulb,
  ShieldAlert
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  payload?: AIResponsePayload;
  timestamp: string;
}

export const MapleAIPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile, currentRole, userPod } = useAuth();
  const { showToast } = useNotifications();

  // Role Access Control: Members cannot access Ask Maple AI
  if (currentRole === 'member') {
    return (
      <div className="max-w-2xl mx-auto glass-card p-12 text-center space-y-4 border border-slate-800 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Maple AI Access Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Ask Maple AI is reserved exclusively for Pod Leads and Organization Administrators to analyze pod health, deliverables, and blockers.
        </p>
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isManager = currentRole === 'manager';
  const podName = userPod?.name || 'Assigned Pod';

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: isManager
        ? `Hello **${profile?.full_name?.split(' ')[0] || 'Lead'}**! I am **Maple AI**. My analysis is strictly scoped to the **${podName}** pod. Ask me anything about today's standups, team member deliverables, or active blockers in ${podName}.`
        : `Hello **${profile?.full_name?.split(' ')[0] || 'Admin'}**! I am **Maple AI**, your executive intelligence assistant across Maple Learning Solutions. Ask me anything about all pods, cross-pod deliverables, blockers, or sprint velocity.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const managerPrompts = [
    { label: `${podName} Summary`, query: `Give me today's standup summary for ${podName}.` },
    { label: 'Active Pod Blockers', query: `What active blockers or dependencies are slowing down ${podName}?` },
    { label: 'Pending Check-ins', query: `Who in ${podName} has not submitted their standup check-in today?` },
    { label: 'Today\'s Deliverables', query: `What are the key deliverables in progress today in ${podName}?` },
  ];

  const adminPrompts = [
    { label: "Today's Org Summary", query: "Give me today's standup summary across all pods." },
    { label: 'Org-wide Blockers', query: 'What active blockers or dependencies are slowing us down?' },
    { label: 'Pending Submissions', query: 'Who has not submitted their standup update today?' },
    { label: 'Web & Sales Pod', query: 'Give me the current progress and status for Web & Sales.' },
    { label: 'Marketing Pod', query: 'What is the Marketing team working on today?' },
    { label: 'eLearning Pod', query: 'What is the eLearning team working on today?' },
    { label: 'HR Operations', query: 'What is the HR Operations team working on today?' },
  ];

  const quickPrompts = isManager ? managerPrompts : adminPrompts;

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading || !profile) return;

    setInputQuery('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await aiService.askMapleAI(textToSend, profile);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        payload: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      showToast('error', 'AI Assistant Notice', err.message || 'Unable to process query');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isManager ? `${podName} Intelligence Scope` : 'Executive AI Assistant'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {isManager ? 'Strict Pod Isolation Active' : 'All Pods Access'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Ask Maple AI
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {isManager
              ? `Live operational intelligence strictly locked to ${podName}.`
              : 'Synthesize standups, blockers, deliverables, and velocity in real time.'}
          </p>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Suggested:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendQuery(p.query)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Transcript Area */}
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="animate-in fade-in duration-200">
            {m.sender === 'user' ? (
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-xl p-4 rounded-2xl rounded-tr-none bg-gradient-to-r from-maple-600 to-maple-500 text-slate-950 font-medium text-xs shadow-glow-sm">
                  {m.text}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-maple-500/10 border border-maple-500/30 flex items-center justify-center text-maple-400 flex-shrink-0 shadow-glow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-4">
                  {m.text && (
                    <div className="glass-card p-4 border border-slate-800 text-xs text-slate-200 leading-relaxed max-w-2xl">
                      {m.text}
                    </div>
                  )}

                  {m.payload && (
                    <div className="glass-card p-6 border border-slate-800 space-y-5 shadow-2xl">
                      {/* Response Title & Intent */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {m.payload.summaryTitle}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Generated at {new Date(m.payload.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-maple-400 border border-slate-700 self-start sm:self-center">
                          {m.payload.intent}
                        </span>
                      </div>

                      {/* Main Prose / Markdown Answer */}
                      {m.payload.answerText && (
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                          {m.payload.answerText}
                        </div>
                      )}

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Analyzed</span>
                          <span className="text-lg font-bold text-white">{m.payload.metrics.totalAnalyzed} Updates</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-rose-400 block">Blockers</span>
                          <span className="text-lg font-bold text-rose-300">{m.payload.metrics.activeBlockersCount} Active</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">On Track</span>
                          <span className="text-lg font-bold text-emerald-300">{m.payload.metrics.onTrackCount}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-amber-400 block">At Risk</span>
                          <span className="text-lg font-bold text-amber-300">{m.payload.metrics.atRiskCount}</span>
                        </div>
                      </div>

                      {/* Structured Insights */}
                      <div className="space-y-3">
                        {m.payload.insights.map((ins, iIdx) => (
                          <div
                            key={iIdx}
                            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                              ins.type === 'warning'
                                ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                                : ins.type === 'success'
                                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                                : 'bg-slate-900/90 border-slate-800 text-slate-200'
                            }`}
                          >
                            <span className="font-bold text-[11px] uppercase tracking-wider block">
                              {ins.category}
                            </span>
                            <ul className="space-y-1 pl-4 list-disc text-slate-300">
                              {ins.points.map((pt, pIdx) => (
                                <li key={pIdx} className="leading-relaxed">{pt}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Actionable Follow Ups */}
                      {m.payload.recommendedFollowUps && m.payload.recommendedFollowUps.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-maple-500/5 border border-maple-500/20 space-y-2">
                          <span className="text-[11px] font-bold text-maple-400 uppercase tracking-wider block">
                            Recommended Next Steps
                          </span>
                          <div className="space-y-1.5">
                            {m.payload.recommendedFollowUps.map((act, aIdx) => (
                              <div key={aIdx} className="flex items-center gap-2 text-xs text-slate-200">
                                <ArrowRight className="w-3.5 h-3.5 text-maple-400 flex-shrink-0" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-maple-500/10 border border-maple-500/30 flex items-center justify-center text-maple-400 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-maple-400 animate-ping" />
              <span>Analyzing live {isManager ? podName : 'organization'} records...</span>
            </div>
          </div>
        )}
      </div>

      {/* Query Input Bar */}
      <div className="glass-card p-3 border border-slate-800 flex items-center gap-3">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendQuery();
          }}
          placeholder={
            isManager
              ? `Ask Maple AI about ${podName} standups, blockers, or deliverables...`
              : "Ask Maple AI about team standups, blockers, deliverables, or pods..."
          }
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
        />
        <GradientButton
          size="md"
          onClick={() => handleSendQuery()}
          isLoading={isLoading}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Ask AI
        </GradientButton>
      </div>
    </div>
  );
};
