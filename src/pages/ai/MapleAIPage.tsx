import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { aiService } from '../../services/aiService';
import { blockersService } from '../../services/blockersService';
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
  Lightbulb
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  payload?: AIResponsePayload;
  timestamp: string;
}

export const MapleAIPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello ${profile.full_name.split(' ')[0]}! I am **Maple AI**, your intelligent standup and team coordination assistant for Maple Learning Solutions. I have scoped my data models to your **${profile.role.toUpperCase()}** permissions. Ask me anything about today's standup, deliverables, blocker risks, or sprint velocity.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const quickPrompts = [
    { label: "Today's Summary", query: "Give me today's standup summary across the team." },
    { label: 'Team Blockers', query: 'What active blockers or dependencies are slowing us down?' },
    { label: 'Pending Updates', query: 'Who has not submitted their standup update today?' },
    { label: 'Weekly Summary', query: 'Summarize key deliverables and milestones completed this week.' },
    { label: 'Sprint Summary', query: 'How is Sprint 56 tracking against our milestone targets?' },
    { label: 'Web & Sales Pod', query: 'Give me the current progress and status for Web & Sales.' },
    { label: 'eLearning Team', query: 'What is the eLearning team working on and are there any client review issues?' },
    { label: 'At-Risk Items', query: 'Which updates are flagged as at-risk or have subtle blockers?' },
  ];

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

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
      showToast('error', 'AI Query Failed', 'Unable to reach the AI endpoint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertSignalToBlocker = (signal: { profileName: string; podName: string; snippet: string; matchedKeyword: string }) => {
    blockersService.createBlocker({
      organization_id: profile?.organization_id || 'org-maple-01',
      reported_by: profile?.id || '',
      title: `Blocker: ${signal.matchedKeyword} (Detected by AI)`,
      description: `AI Blocker Detector flagged snippet: "${signal.snippet}" from ${signal.profileName} (${signal.podName}).`,
      category: 'Dependency',
      severity: 'medium',
      status: 'open',
    });
    showToast('success', 'Blocker Created', `Created new blocker from detected signal.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header card */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-maple-500/10 border border-maple-500/30 text-maple-400 shadow-glow-sm">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
                Authorized Intelligence Engine
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Role: {profile.role.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Maple AI Assistant</h2>
            <p className="text-xs text-slate-400">
              Query standup updates, analyze blocker trends, and generate executive summaries with role-based security.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Action Chips */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
          <span>Suggested Inquiries</span>
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => handleSendQuery(p.query)}
              className="px-3 py-1.5 rounded-xl bg-[#081426] hover:bg-[#0B1728] border border-slate-800 hover:border-maple-500/40 text-xs text-slate-300 hover:text-white font-medium whitespace-nowrap transition-all flex-shrink-0 shadow-sm"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4 min-h-[400px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs leading-relaxed ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center text-slate-950 font-bold flex-shrink-0 mt-1 shadow-glow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-5 ${
                msg.sender === 'user'
                  ? 'bg-maple-600/20 border border-maple-500/40 text-white shadow-md'
                  : 'glass-card border border-slate-800/90 text-slate-200'
              }`}
            >
              {msg.text && <p className="whitespace-pre-line text-sm">{msg.text}</p>}

              {/* Structured AI Response Payload */}
              {msg.payload && (
                <div className="space-y-4">
                  {/* Summary Title & Metric Badges */}
                  <div className="border-b border-slate-800/80 pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-maple-400" />
                        {msg.payload.summaryTitle}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Updates</span>
                        <span className="font-bold text-white text-xs">{msg.payload.metrics.totalAnalyzed}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 block">On Track</span>
                        <span className="font-bold text-emerald-400 text-xs">{msg.payload.metrics.onTrackCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-amber-400 block">At Risk</span>
                        <span className="font-bold text-amber-400 text-xs">{msg.payload.metrics.atRiskCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-rose-400 block">Blockers</span>
                        <span className="font-bold text-rose-400 text-xs">{msg.payload.metrics.activeBlockersCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Insights */}
                  <div className="space-y-3">
                    {msg.payload.insights.map((ins, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border space-y-1.5 ${
                          ins.type === 'warning'
                            ? 'bg-rose-950/20 border-rose-800/30'
                            : ins.type === 'success'
                            ? 'bg-emerald-950/20 border-emerald-800/30'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <span
                          className={`font-bold text-xs uppercase tracking-wider block ${
                            ins.type === 'warning'
                              ? 'text-rose-400'
                              : ins.type === 'success'
                              ? 'text-emerald-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {ins.category}
                        </span>
                        <ul className="space-y-1 pl-4 list-disc text-slate-200">
                          {ins.points.map((pt, pIdx) => (
                            <li key={pIdx} className="leading-relaxed">{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Subtle Blocker Detection Signals */}
                  {msg.payload.flaggedBlockerSignals && msg.payload.flaggedBlockerSignals.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>AI Blocker Signal Detected</span>
                      </div>
                      {msg.payload.flaggedBlockerSignals.map((sig, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                          <div>
                            <span className="font-semibold text-white">{sig.profileName} ({sig.podName}):</span>
                            <p className="text-[11px] text-slate-300 italic mt-0.5">"{sig.snippet}"</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleConvertSignalToBlocker(sig)}
                          >
                            Track Blocker
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommended Follow-ups */}
                  {msg.payload.recommendedFollowUps && (
                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-1">
                      <span className="font-semibold text-maple-400 text-[11px] uppercase tracking-wider block">
                        Recommended Manager Actions
                      </span>
                      <ul className="space-y-0.5 text-slate-300 pl-4 list-disc">
                        {msg.payload.recommendedFollowUps.map((fu, fIdx) => (
                          <li key={fIdx}>{fu}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-400 py-4 pl-2 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-maple-500/20 border border-maple-500/40 flex items-center justify-center text-maple-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>Analyzing standup data & generating structured executive insights...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-4 glass-card p-2 border border-slate-700 shadow-2xl bg-[#081426]/95 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about Maple Learning standups, blockers, or deliverables..."
            className="flex-1 px-4 py-3 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <GradientButton
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            size="md"
            rightIcon={<Send className="w-4 h-4" />}
          >
            Ask AI
          </GradientButton>
        </form>
      </div>
    </div>
  );
};
