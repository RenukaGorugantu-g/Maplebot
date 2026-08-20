import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { kudosService } from '../../services/kudosService';
import { dataStore } from '../../services/dataStore';
import { KudosCategory } from '../../types/database';
import { Avatar } from '../../components/ui/Avatar';
import { Button, GradientButton } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import confetti from 'canvas-confetti';
import {
  Heart,
  Trophy,
  Sparkles,
  Plus,
  Send,
  Filter,
  Flame,
  Award
} from 'lucide-react';

export const KudosPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const [isGiveKudosOpen, setIsGiveKudosOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [category, setCategory] = useState<KudosCategory>('Teamwork');
  const [message, setMessage] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  const members = dataStore.getProfiles().filter((m) => (!profile ? true : m.id !== profile.id) && m.status === 'active');
  const allKudos = kudosService.getKudos({
    category: (selectedCategoryFilter as KudosCategory) || undefined,
  });

  const categories: Array<{ label: KudosCategory; color: string; desc: string }> = [
    { label: 'Teamwork', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', desc: 'Collaborating & uniting the team' },
    { label: 'Ownership', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', desc: 'Driving results & accountability' },
    { label: 'Innovation', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', desc: 'Creative solutions & ingenuity' },
    { label: 'Customer Focus', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Going above & beyond for clients' },
    { label: 'Helping Others', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', desc: 'Mentoring & unblocking peers' },
    { label: 'Great Work', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', desc: 'Exceptional craftsmanship' },
  ];

  const handleGiveKudos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) {
      showToast('warning', 'Select Recipient', 'Please choose a colleague to recognize.');
      return;
    }
    if (!message.trim()) {
      showToast('warning', 'Message Required', 'Please share why you are recognizing this teammate.');
      return;
    }

    const recipient = dataStore.getProfileById(recipientId);

    kudosService.giveKudos({
      organization_id: profile?.organization_id || 'org-maple-01',
      sender_id: profile?.id || '',
      recipient_id: recipientId,
      pod_id: recipient?.pod_id,
      category,
      message,
    });

    setIsGiveKudosOpen(false);
    setMessage('');
    setRecipientId('');
    showToast('success', 'Kudos Sent! 🎉', `Your recognition was sent to ${recipient?.full_name}.`);

    // Confetti effect
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#00DC82', '#f43f5e', '#3b82f6', '#eab308'],
      });
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="glass-card p-6 lg:p-8 bg-gradient-to-r from-[#081426] via-[#151226] to-[#0A1B30] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Culture & Peer Recognition
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Team Kudos & Recognition
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Celebrate wins, thank collaborators, and spotlight teammates living Maple Learning values.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigate('/recognition/leaderboard')}
            leftIcon={<Trophy className="w-4 h-4 text-yellow-400" />}
          >
            Leaderboard
          </Button>
          <GradientButton
            size="md"
            onClick={() => setIsGiveKudosOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Give Kudos
          </GradientButton>
        </div>
      </div>

      {/* Categories Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategoryFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            selectedCategoryFilter === ''
              ? 'bg-maple-500/20 border-maple-500 text-maple-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Categories ({dataStore.getKudos().length})
        </button>
        {categories.map((c) => (
          <button
            key={c.label}
            onClick={() => setSelectedCategoryFilter(c.label)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
              selectedCategoryFilter === c.label
                ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Kudos Stream Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allKudos.map((k) => (
          <div
            key={k.id}
            className="glass-card p-6 border border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={k.recipient?.full_name || 'Recipient'} src={k.recipient?.avatar_url} size="md" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{k.recipient?.full_name}</span>
                      <span className="text-xs text-slate-400">received kudos from</span>
                      <span className="text-xs font-semibold text-maple-400">{k.sender?.full_name?.split(' ')[0]}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {k.pod?.name} • {new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {k.category}
                </span>
              </div>

              {/* Message */}
              <p className="mt-4 text-sm text-slate-200 leading-relaxed italic bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                "{k.message}"
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60">
              <span className="flex items-center gap-1 text-rose-400">
                <Heart className="w-3.5 h-3.5 fill-rose-400" />
                <span>Recognized for {k.category}</span>
              </span>
              <span>{new Date(k.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Give Kudos Modal */}
      <Modal
        isOpen={isGiveKudosOpen}
        onClose={() => setIsGiveKudosOpen(false)}
        title="Give Team Kudos 🎉"
        subtitle="Recognize a colleague for outstanding contribution, teamwork, or ownership."
      >
        <form onSubmit={handleGiveKudos} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-white">Select Recipient <span className="text-rose-400">*</span></label>
            <select
              required
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 cursor-pointer"
            >
              <option value="">Choose a team member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.pod?.name || m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-white">Recognition Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategory(c.label)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    category === c.label
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">{c.label}</span>
                  <span className="text-[10px] text-slate-500 block">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Your Message <span className="text-rose-400">*</span></label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., Thank you for staying late to help debug the customer portal release..."
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsGiveKudosOpen(false)}>Cancel</Button>
            <GradientButton type="submit" rightIcon={<Send className="w-3.5 h-3.5" />}>
              Send Kudos
            </GradientButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
