import React, { useState } from 'react';
import { kudosService } from '../../services/kudosService';
import { dataStore } from '../../services/dataStore';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Trophy, Medal, Heart, ArrowLeft, Crown } from 'lucide-react';

export const KudosLeaderboardPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [selectedPod, setSelectedPod] = useState<string>('');

  const pods = dataStore.getPods();
  const leaderboard = kudosService.getLeaderboard(period, selectedPod || undefined);

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/recognition/kudos')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                Peer Recognition Honors
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Kudos Leaderboard</h2>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                period === 'month' ? 'bg-maple-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                period === 'all' ? 'bg-maple-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          <select
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
          >
            <option value="">All Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium Top 3 */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* Rank 2 - Silver */}
          <div className="glass-card p-6 border border-slate-700/80 text-center flex flex-col items-center justify-between order-2 sm:order-1 bg-gradient-to-t from-slate-900/60 to-[#0B1728]">
            <div>
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs mx-auto mb-3">
                #2
              </div>
              <Avatar name={top3[1].profile.full_name} src={top3[1].profile.avatar_url} size="lg" />
              <h4 className="text-sm font-bold text-white mt-3">{top3[1].profile.full_name}</h4>
              <span className="text-xs text-slate-400">{top3[1].profile.pod?.name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2 text-rose-400 font-bold text-sm">
              <Heart className="w-4 h-4 fill-rose-400" />
              <span>{top3[1].receivedCount} Kudos Received</span>
            </div>
          </div>

          {/* Rank 1 - Gold */}
          <div className="glass-card p-6 border border-yellow-500/40 text-center flex flex-col items-center justify-between order-1 sm:order-2 bg-gradient-to-t from-yellow-950/20 to-[#0F1E33] shadow-glow-sm">
            <div>
              <div className="w-9 h-9 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center font-black text-sm mx-auto mb-3 shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <Avatar name={top3[0].profile.full_name} src={top3[0].profile.avatar_url} size="xl" />
              <h4 className="text-base font-bold text-white mt-3">{top3[0].profile.full_name}</h4>
              <span className="text-xs text-maple-400 font-semibold">{top3[0].profile.pod?.name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2 text-yellow-400 font-extrabold text-base">
              <Trophy className="w-5 h-5" />
              <span>{top3[0].receivedCount} Kudos Received</span>
            </div>
          </div>

          {/* Rank 3 - Bronze */}
          <div className="glass-card p-6 border border-amber-800/60 text-center flex flex-col items-center justify-between order-3 sm:order-3 bg-gradient-to-t from-amber-950/20 to-[#0B1728]">
            <div>
              <div className="w-8 h-8 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center font-bold text-xs mx-auto mb-3">
                #3
              </div>
              <Avatar name={top3[2].profile.full_name} src={top3[2].profile.avatar_url} size="lg" />
              <h4 className="text-sm font-bold text-white mt-3">{top3[2].profile.full_name}</h4>
              <span className="text-xs text-slate-400">{top3[2].profile.pod?.name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2 text-rose-400 font-bold text-sm">
              <Heart className="w-4 h-4 fill-rose-400" />
              <span>{top3[2].receivedCount} Kudos Received</span>
            </div>
          </div>
        </div>
      )}

      {/* Remaining Leaderboard Table */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Full Team Standings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Kudos Received</th>
                <th className="px-4 py-3">Kudos Given</th>
                <th className="px-4 py-3 text-right">Recognition Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboard.map((item, idx) => (
                <tr key={item.profile.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-3">
                    <Avatar name={item.profile.full_name} src={item.profile.avatar_url} size="sm" />
                    <span className="font-bold text-white">{item.profile.full_name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-medium">
                    {item.profile.pod?.name || 'Admin'}
                  </td>
                  <td className="px-4 py-3.5 text-rose-400 font-semibold">
                    {item.receivedCount} received
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {item.givenCount} given
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-maple-400">
                    {item.score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
