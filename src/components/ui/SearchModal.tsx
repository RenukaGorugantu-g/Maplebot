import React, { useState, useEffect } from 'react';
import { Search, User, FileText, AlertTriangle, Heart, Layers, X, ArrowRight } from 'lucide-react';
import { dataStore } from '../../services/dataStore';
import { Avatar } from './Avatar';
import { StatusBadge, SeverityBadge } from './StatusBadge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search Results
  const profiles = dataStore.getProfiles().filter(
    (p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );

  const updates = dataStore.getUpdates().filter(
    (u) =>
      u.yesterday.toLowerCase().includes(q) ||
      u.today.toLowerCase().includes(q) ||
      (u.blocker && u.blocker.toLowerCase().includes(q)) ||
      (u.profile?.full_name && u.profile.full_name.toLowerCase().includes(q))
  );

  const blockers = dataStore.getBlockers().filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.reporter?.full_name && b.reporter.full_name.toLowerCase().includes(q))
  );

  const kudos = dataStore.getKudos().filter(
    (k) =>
      k.message.toLowerCase().includes(q) ||
      k.category.toLowerCase().includes(q) ||
      (k.recipient?.full_name && k.recipient.full_name.toLowerCase().includes(q))
  );

  const pods = dataStore.getPods().filter(
    (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
  );

  const hasResults =
    profiles.length > 0 ||
    updates.length > 0 ||
    blockers.length > 0 ||
    kudos.length > 0 ||
    pods.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass-modal p-0 overflow-hidden shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#0B1728]">
          <Search className="w-5 h-5 text-maple-400 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across MapleBot (e.g. 'Raghavi', 'HubSpot', 'SCORM', 'Pricing')..."
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <p>Type keywords to find team members, daily updates, open blockers, kudos, or pods.</p>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <p>No results found for "{query}".</p>
            </div>
          ) : (
            <>
              {/* Profiles */}
              {profiles.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5" />
                    <span>Members ({profiles.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {profiles.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('/admin/members');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                          <div>
                            <span className="text-sm font-semibold text-white">{p.full_name}</span>
                            <span className="text-xs text-slate-400 block">{p.email} • {p.pod?.name || 'Admin'}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockers */}
              {blockers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Blockers ({blockers.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {blockers.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onNavigate('/blockers');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{b.title}</span>
                          <SeverityBadge severity={b.severity} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{b.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Updates */}
              {updates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Updates ({updates.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {updates.slice(0, 3).map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          onNavigate('/updates/team');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-maple-400">{u.profile?.full_name} ({u.pod?.name})</span>
                          <StatusBadge status={u.status} />
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">Today: {u.today}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kudos */}
              {kudos.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-maple-400 uppercase tracking-wider mb-2">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Kudos ({kudos.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {kudos.slice(0, 2).map((k) => (
                      <div
                        key={k.id}
                        onClick={() => {
                          onNavigate('/recognition/kudos');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold text-white">To: {k.recipient?.full_name} ({k.category})</span>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">"{k.message}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pods */}
              {pods.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Pods ({pods.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {pods.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('/admin/pods');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <span className="text-sm font-semibold text-white">{p.name}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
