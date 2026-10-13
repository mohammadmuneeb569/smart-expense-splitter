import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Users, ChevronRight, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Scale
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'CAD', 'AUD'];
const GROUP_ICONS = ['👥', '🏠', '✈️', '🎉', '🍕', '🚗', '💼', '🏖️', '⚡', '📦'];

function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', defaultCurrency: 'PKR', icon: '👥',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Group name is required');

    setLoading(true);
    try {
      const { data } = await api.post('/groups', form);
      onCreated(data.group);
      setForm({ name: '', description: '', defaultCurrency: 'PKR', icon: '👥' });
      setError('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Group Icon</label>
          <div className="flex flex-wrap gap-2">
            {GROUP_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm({ ...form, icon })}
                className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-colors ${
                  form.icon === icon
                    ? 'bg-emerald-500/15 border border-emerald-500/60'
                    : 'bg-[#0F172A] border border-slate-800 hover:border-slate-700'
                }`}
                style={{ minHeight: '40px' }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Group Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Weekend Road Trip, Flat 402"
            className="app-input"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is this group for?"
            className="app-input resize-none h-20"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Default Currency</label>
          <select
            value={form.defaultCurrency}
            onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
            className="app-input"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900">{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2.5 pt-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? (
              <>
                <div className="w-4 h-4 spinner rounded-full mr-2" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GroupCard({ group, userBalances }) {
  const balance = userBalances?.[group._id];

  return (
    <Link
      to={`/groups/${group._id}`}
      className="app-card-interactive p-4 sm:p-5 flex items-start gap-3.5 group select-none"
    >
      <div className="w-11 h-11 rounded-lg bg-[#0F172A] border border-slate-800 flex items-center justify-center text-xl flex-shrink-0">
        {group.icon || '👥'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
            {group.name}
          </h3>
          <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5" />
        </div>

        {group.description && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{group.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2.5">
          <span className="badge-slate">
            <Users size={11} className="mr-0.5" />
            {group.members?.length || 0}
          </span>
          <span className="badge-slate font-mono text-[11px]">{group.defaultCurrency}</span>
        </div>

        {balance !== undefined && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Your balance:</span>
            <span className={`font-medium ${
              balance > 0.01
                ? 'text-emerald-400'
                : balance < -0.01
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}>
              {balance > 0.01
                ? `+${group.defaultCurrency} ${balance.toFixed(2)}`
                : balance < -0.01
                ? `-${group.defaultCurrency} ${Math.abs(balance).toFixed(2)}`
                : 'Settled'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [userBalances, setUserBalances] = useState({});
  const [summary, setSummary] = useState({ totalOwed: 0, totalOwe: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data.groups);

      const balancesMap = {};
      let totalOwed = 0;
      let totalOwe = 0;

      await Promise.all(
        data.groups.map(async (group) => {
          try {
            const { data: sData } = await api.get(`/groups/${group._id}/settlements`);
            const myBalance = sData.memberSummaries?.find(
              (m) => m.userId === user._id
            );
            if (myBalance) {
              balancesMap[group._id] = parseFloat(myBalance.netBalance.toFixed(2));
              if (myBalance.netBalance > 0) totalOwed += myBalance.netBalance;
              if (myBalance.netBalance < 0) totalOwe += Math.abs(myBalance.netBalance);
            }
          } catch {
            // Ignore per-group settlement errors silently
          }
        })
      );

      setUserBalances(balancesMap);
      setSummary({ totalOwed, totalOwe });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [user._id]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

  const netBalance = summary.totalOwed - summary.totalOwe;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Welcome back, {user.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGroups}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors"
            title="Refresh groups"
            aria-label="Refresh groups"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs sm:text-sm px-3.5 sm:px-4 py-2 flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5">
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {/* Total Net Balance */}
        <div className="metric-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Net Balance</span>
            <Scale size={15} className="text-slate-500" />
          </div>
          <div className="mt-2.5">
            <p className={`text-xl sm:text-2xl font-bold tracking-tight ${
              netBalance > 0.01
                ? 'text-emerald-400'
                : netBalance < -0.01
                ? 'text-rose-400'
                : 'text-slate-200'
            }`}>
              {loading ? '—' : `${netBalance >= 0 ? '+' : '-'}PKR ${Math.abs(netBalance).toFixed(2)}`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Overall group standing</p>
          </div>
        </div>

        {/* You Are Owed */}
        <div className="metric-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">You Are Owed</span>
            <ArrowDownLeft size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              {loading ? '—' : `+PKR ${summary.totalOwed.toFixed(2)}`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Incoming repayments</p>
          </div>
        </div>

        {/* You Owe */}
        <div className="metric-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">You Owe</span>
            <ArrowUpRight size={15} className="text-rose-400" />
          </div>
          <div className="mt-2.5">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-rose-400">
              {loading ? '—' : `-PKR ${summary.totalOwe.toFixed(2)}`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pending debts to pay</p>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">Your Groups</h2>
            {groups.length > 0 && (
              <span className="badge-slate font-mono text-[11px]">{groups.length}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" text="Loading your groups..." />
          </div>
        ) : groups.length === 0 ? (
          <div className="app-card p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-2xl mx-auto mb-3">
              👥
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">No groups yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-5">
              Create a group to start adding expenses, splitting costs, and settling debts with friends.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs sm:text-sm px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              Create First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {groups.map((group) => (
              <GroupCard key={group._id} group={group} userBalances={userBalances} />
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
