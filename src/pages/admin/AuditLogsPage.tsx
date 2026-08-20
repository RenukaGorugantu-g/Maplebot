import React, { useState } from 'react';
import { auditService } from '../../services/googleChatService';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { ShieldAlert, Search, Filter, Calendar, Activity } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('');

  const logs = auditService.getLogs();

  const filteredLogs = logs.filter((log) => {
    if (selectedActionFilter && log.action !== selectedActionFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.target_type.toLowerCase().includes(q) ||
      (log.actor?.full_name && log.actor.full_name.toLowerCase().includes(q))
    );
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Security & Compliance
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Organization Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of user invitations, role changes, blocker actions, and exports.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
          SOC 2 / GDPR Ready
        </span>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions or actors..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50"
          />
        </div>

        <select
          value={selectedActionFilter}
          onChange={(e) => setSelectedActionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
        >
          <option value="">All Action Types</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Target Type</th>
                <th className="px-5 py-3.5">Metadata / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 font-sans">
                    <EmptyState
                      title="No audit entries match"
                      description="Clear filters to inspect historical audit events."
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-sans font-medium text-white flex items-center gap-2">
                      <Avatar name={log.actor?.full_name || 'System'} src={log.actor?.avatar_url} size="xs" />
                      <span>{log.actor?.full_name || 'System / Admin'}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-maple-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans">
                      {log.target_type}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-400 font-mono max-w-xs truncate">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
