import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { dataStore } from '../../services/dataStore';
import { Button, GradientButton } from '../../components/ui/Button';
import { Checkin, CheckinQuestion } from '../../types/database';
import {
  Sliders,
  Clock,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Save
} from 'lucide-react';

export const CheckinsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const initialCheckin = dataStore.getCheckin();

  const [name, setName] = useState(initialCheckin.name);
  const [description, setDescription] = useState(initialCheckin.description || '');
  const [startTime, setStartTime] = useState(initialCheckin.start_time);
  const [reminderTime, setReminderTime] = useState(initialCheckin.reminder_time);
  const [deadlineTime, setDeadlineTime] = useState(initialCheckin.deadline_time);
  const [activeDays, setActiveDays] = useState<string[]>(initialCheckin.days);
  const [questions, setQuestions] = useState<CheckinQuestion[]>(initialCheckin.questions || []);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      setActiveDays(activeDays.filter((d) => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const handleAddQuestion = () => {
    const newQ: CheckinQuestion = {
      id: `q-${Date.now()}`,
      checkin_id: initialCheckin.id,
      question: 'New custom question?',
      question_type: 'text',
      required: false,
      sort_order: questions.length + 1,
      created_at: new Date().toISOString(),
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleUpdateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, question: text } : q)));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.updateCheckin({
      name,
      description,
      start_time: startTime,
      reminder_time: reminderTime,
      deadline_time: deadlineTime,
      days: activeDays,
      questions,
    });
    showToast('success', 'Standup Schedule Saved', 'Check-in schedule & questions configuration updated.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
              Standup Automation
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Check-in Schedules & Questions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated daily check-in windows, reminder triggers, and question templates.
          </p>
        </div>

        <GradientButton size="md" onClick={handleSaveConfig} leftIcon={<Save className="w-4 h-4" />}>
          Save Configuration
        </GradientButton>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Schedule & Timing Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-maple-400" />
            <span>Standup Windows & Timing</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Check-in Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
              <span className="text-[10px] text-slate-500 block">When prompt opens</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Reminder Trigger Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
              <span className="text-[10px] text-slate-500 block">Ping for pending members</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Daily Standup Deadline</label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
              <span className="text-[10px] text-slate-500 block">When report compiles</span>
            </div>
          </div>

          {/* Active Days */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 block">
              Active Standup Days
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const isActive = activeDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? 'bg-maple-500/20 border-maple-500 text-maple-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Questions Builder Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Standup Questions Template</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize default questions presented to team members</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddQuestion}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3 text-xs"
              >
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500/50"
                />

                <span className="text-[10px] text-slate-400 capitalize px-2 py-1 bg-slate-800 rounded-md">
                  {q.question_type}
                </span>

                {questions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
