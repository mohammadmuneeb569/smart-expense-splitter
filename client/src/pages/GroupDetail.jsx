import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Users, Receipt, Zap, Activity,
  Trash2, UserPlus, ArrowRight, CheckCircle2, Clock,
  FileDown, Mail, Settings, RefreshCw, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Categories ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  'General', 'Food & Drink', 'Transportation', 'Entertainment',
  'Utilities', 'Shopping', 'Healthcare', 'Travel', 'Rent', 'Other'
];

const CATEGORY_ICONS = {
  'General': '📋', 'Food & Drink': '🍕', 'Transportation': '🚗',
  'Entertainment': '🎮', 'Utilities': '💡', 'Shopping': '🛍️',
  'Healthcare': '🏥', 'Travel': '✈️', 'Rent': '🏠', 'Other': '📦'
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (amount, currency = 'PKR') =>
  `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const timeAgo = (date) => {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

// ─── Add Expense Modal ──────────────────────────────────────────────────────
function AddExpenseModal({ isOpen, onClose, group, onAdded }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    description: '', totalAmount: '', currency: group?.defaultCurrency || 'PKR',
    paidBy: user?._id || '', category: 'General', splitType: 'equal',
  });
  const [customSplits, setCustomSplits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group && isOpen) {
      setForm(prev => ({
        ...prev,
        currency: group.defaultCurrency,
        paidBy: user?._id || '',
      }));
      setCustomSplits(
        group.members.map(m => ({ user: m._id, name: m.name, amount: '' }))
      );
    }
  }, [group, isOpen, user]);

  const handleAmountChange = (amount) => {
    setForm(prev => ({ ...prev, totalAmount: amount }));
    if (form.splitType === 'equal' && group?.members?.length > 0) {
      const perPerson = parseFloat(amount) / group.members.length;
      setCustomSplits(prev =>
        prev.map(s => ({ ...s, amount: isNaN(perPerson) ? '' : perPerson.toFixed(2) }))
      );
    }
  };

  const handleSplitTypeChange = (type) => {
    setForm(prev => ({ ...prev, splitType: type }));
    if (type === 'equal' && form.totalAmount) {
      const perPerson = parseFloat(form.totalAmount) / group.members.length;
      setCustomSplits(prev =>
        prev.map(s => ({ ...s, amount: isNaN(perPerson) ? '' : perPerson.toFixed(2) }))
      );
    }
  };

  const handleSplitChange = (userId, value) => {
    setCustomSplits(prev =>
      prev.map(s => s.user === userId ? { ...s, amount: value } : s)
    );
  };

  const totalSplit = customSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const splitDiff = Math.abs(totalSplit - (parseFloat(form.totalAmount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.totalAmount || !form.paidBy) {
      return setError('Description, amount, and payer are required');
    }
    if (form.splitType === 'custom' && splitDiff > 0.05) {
      return setError(`Custom split amounts must sum to ${form.totalAmount}. Current: ${totalSplit.toFixed(2)}`);
    }

    setLoading(true);
    try {
      const payload = {
        groupId: group._id,
        description: form.description,
        totalAmount: parseFloat(form.totalAmount),
        currency: form.currency,
        paidBy: form.paidBy,
        category: form.category,
        splitType: form.splitType,
        splitBetween: form.splitType === 'custom'
          ? customSplits.filter(s => parseFloat(s.amount) > 0).map(s => ({
              user: s.user, amount: parseFloat(s.amount)
            }))
          : group.members.map(m => ({ user: m._id })),
      };
      const { data } = await api.post('/expenses', payload);
      onAdded(data.expense);
      setForm({ description: '', totalAmount: '', currency: group.defaultCurrency, paidBy: user._id, category: 'General', splitType: 'equal' });
      setError('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Grocery shopping, Uber ride"
              className="app-input"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.totalAmount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="app-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                className="app-input"
              >
                {['PKR','USD','EUR','GBP','AED','SAR','INR','CAD','AUD'].map(c => (
                  <option key={c} value={c} className="bg-slate-900">{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Paid By *</label>
              <select
                value={form.paidBy}
                onChange={e => setForm(prev => ({ ...prev, paidBy: e.target.value }))}
                className="app-input"
              >
                {group?.members?.map(m => (
                  <option key={m._id} value={m._id} className="bg-slate-900">{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="app-input"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-slate-900">{CATEGORY_ICONS[c]} {c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Split Method Toggle */}
        <div className="pt-1">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Split Allocation</label>
          <div className="grid grid-cols-2 gap-2 bg-[#0F172A] p-1 rounded-lg border border-slate-800">
            {['equal', 'custom'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleSplitTypeChange(type)}
                className={`py-2 text-xs font-medium rounded-md transition-colors ${
                  form.splitType === type
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{ minHeight: '38px' }}
              >
                {type === 'equal' ? 'Split Equally' : 'Custom Amounts'}
              </button>
            ))}
          </div>
        </div>

        {/* Equal split summary */}
        {form.splitType === 'equal' && form.totalAmount && group?.members?.length > 0 && (
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300 flex items-center justify-between">
            <span className="text-slate-400">Each of {group.members.length} members pays:</span>
            <span className="font-semibold text-emerald-400">
              {form.currency} {(parseFloat(form.totalAmount) / group.members.length).toFixed(2)}
            </span>
          </div>
        )}

        {/* Custom Split Inputs */}
        {form.splitType === 'custom' && (
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-800">
              <span className="font-medium text-slate-300">Member breakdown</span>
              <span className={`font-mono text-[11px] ${splitDiff < 0.05 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {form.currency} {totalSplit.toFixed(2)} / {form.totalAmount || '0'}
              </span>
            </div>
            {customSplits.map(split => (
              <div key={split.user} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 flex-1 truncate">{split.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={split.amount}
                  onChange={e => handleSplitChange(split.user, e.target.value)}
                  placeholder="0.00"
                  className="app-input w-28 py-1.5 text-right font-mono text-xs"
                  style={{ minHeight: '36px' }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2.5 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? (
              <>
                <div className="w-4 h-4 spinner rounded-full mr-2" />
                Adding...
              </>
            ) : (
              'Save Expense'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Member Modal ───────────────────────────────────────────────────────
function AddMemberModal({ isOpen, onClose, groupId, onAdded }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Email is required');

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/groups/${groupId}/members`, { email });
      setSuccess(data.message);
      setEmail('');
      onAdded(data.group);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member to Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">User Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="member@example.com"
            className="app-input"
            autoFocus
          />
          <p className="text-[11px] text-slate-500 mt-1">The user must have an active SplitSmart account.</p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? (
              <>
                <div className="w-4 h-4 spinner rounded-full mr-2" />
                Adding...
              </>
            ) : (
              'Add Member'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Expense Row Card ───────────────────────────────────────────────────────
function ExpenseCard({ expense, group, currentUser, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${expense.description}"? Group balances will recalculate.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${expense._id}`);
      onDelete(expense._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  const paidByMe = expense.paidBy?._id === currentUser._id;
  const myShare = expense.splitBetween?.find(s => s.user?._id === currentUser._id);

  return (
    <div className="app-card p-3.5 sm:p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className="w-9 h-9 rounded-lg bg-[#0F172A] border border-slate-800 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
          {CATEGORY_ICONS[expense.category] || '📋'}
        </div>

        {/* Info & Amounts */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{expense.description}</h4>
              <div className="flex items-center flex-wrap gap-2 mt-1 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  {timeAgo(expense.createdAt)}
                </span>
                <span className={`badge ${paidByMe ? 'badge-emerald' : 'badge-slate'}`}>
                  {paidByMe ? 'You paid' : `${expense.paidBy?.name || 'Someone'} paid`}
                </span>
                <span className="text-slate-500 font-mono text-[10px] uppercase">{expense.category}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-100 font-mono">
                {fmt(expense.totalAmount, expense.currency)}
              </p>
              {myShare && (
                <p className={`text-[11px] font-medium mt-0.5 font-mono ${paidByMe ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {paidByMe
                    ? `+${fmt(expense.totalAmount - myShare.amount, expense.currency)}`
                    : `-${fmt(myShare.amount, expense.currency)}`}
                </p>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-xs">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{expense.splitBetween?.length || 0} participants</span>
            </button>

            {(paidByMe || String(group?.createdBy?._id || group?.createdBy) === currentUser._id) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] text-rose-400 hover:text-rose-300 p-1 rounded transition-colors flex items-center gap-1"
                title="Delete this expense"
              >
                {deleting ? <div className="w-3 h-3 spinner rounded-full" /> : <Trash2 size={12} />}
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Expanded Splits Breakdown */}
          {expanded && expense.splitBetween?.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5 animate-slide-up">
              {expense.splitBetween.map((split, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={split.user?.avatar}
                      alt={split.user?.name}
                      className="w-4 h-4 rounded-full bg-slate-800"
                      onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(split.user?.name || 'U')}&background=10b981&color=fff&size=32`; }}
                    />
                    <span className="text-slate-300 text-[11px] truncate">{split.user?.name || 'Unknown'}</span>
                  </div>
                  <span className="text-slate-200 font-mono text-[11px]">{fmt(split.amount, expense.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Smart Settlement Tab ───────────────────────────────────────────────────
function SettlementsTab({ group }) {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState(null);
  const [memberSummaries, setMemberSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/groups/${group._id}/settlements`);
      setSettlements(data.transactions);
      setMemberSummaries(data.memberSummaries || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate settlements');
    } finally {
      setLoading(false);
    }
  }, [group._id]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const handleSettle = async (transaction) => {
    const key = `${transaction.from.id}-${transaction.to.id}`;
    setSettling(key);
    setError('');
    try {
      const { data } = await api.post(`/groups/${group._id}/settle-up`, {
        fromUserId: transaction.from.id,
        toUserId: transaction.to.id,
        amount: transaction.amount,
        currency: group.defaultCurrency,
      });
      setSuccess(data.message);
      await fetchSettlements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="md" text="Optimizing group debts..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} autoClose />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            <Zap size={14} className="text-emerald-400" />
            Optimized Settlement Plan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Minimizes transactions to resolve all group debts directly.
          </p>
        </div>
        <button
          onClick={fetchSettlements}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-[#111827] border border-slate-800 transition-colors"
          title="Recalculate debts"
          aria-label="Recalculate debts"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Net Balances Overview Card */}
      <div className="app-card p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-3">
          Member Net Balances ({group.defaultCurrency})
        </p>
        <div className="divide-y divide-slate-800/80">
          {memberSummaries.map(m => (
            <div key={m.userId} className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-200">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-200 font-medium">
                  {m.name} {m.userId === user._id && <span className="text-slate-500 font-normal">(you)</span>}
                </span>
              </div>
              <span className={`font-mono font-medium ${
                m.netBalance > 0.01
                  ? 'text-emerald-400'
                  : m.netBalance < -0.01
                  ? 'text-rose-400'
                  : 'text-slate-500'
              }`}>
                {m.netBalance > 0.01 ? '+' : ''}{m.netBalance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Simplified Transactions List */}
      {settlements?.length === 0 ? (
        <div className="app-card p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle2 size={20} />
          </div>
          <h4 className="text-sm font-semibold text-white mb-0.5">All Debts Settled</h4>
          <p className="text-xs text-slate-400">There are no outstanding balances in this group.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Recommended Transactions ({settlements?.length})
          </p>

          {settlements?.map((t, i) => {
            const key = `${t.from.id}-${t.to.id}`;
            const isMeInvolved = t.from.id === user._id || t.to.id === user._id;

            return (
              <div
                key={i}
                className={`app-card p-4 transition-colors ${
                  isMeInvolved ? 'border-emerald-500/30 bg-[#121c2d]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* From & Direction & To */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-rose-300 truncate">
                      {t.from.id === user._id ? 'You' : t.from.name}
                    </span>
                    <ArrowRight size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-emerald-300 truncate">
                      {t.to.id === user._id ? 'You' : t.to.name}
                    </span>
                  </div>

                  {/* Amount Badge */}
                  <div className="text-right font-mono font-bold text-xs sm:text-sm text-slate-100 flex-shrink-0">
                    {fmt(t.amount, group.defaultCurrency)}
                  </div>
                </div>

                {/* Settle Action Button */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {t.from.id === user._id ? 'You owe this amount' : t.to.id === user._id ? 'You receive this amount' : 'Group settlement'}
                  </span>
                  <button
                    onClick={() => handleSettle(t)}
                    disabled={!!settling}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    style={{ minHeight: '34px' }}
                  >
                    {settling === key ? (
                      <>
                        <div className="w-3 h-3 spinner rounded-full" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Mark Settled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Activity Audit Log Tab ─────────────────────────────────────────────────
function ActivityTab({ groupId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/groups/${groupId}/activities`);
        setActivities(data.activities);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [groupId]);

  if (loading) return <div className="py-12 flex justify-center"><LoadingSpinner text="Loading log..." /></div>;
  if (error) return <Alert type="error" message={error} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Audit Feed History
        </h3>
        <span className="text-xs text-slate-500 font-mono">{activities.length} events</span>
      </div>

      {activities.length === 0 ? (
        <div className="app-card p-8 text-center text-xs text-slate-400">
          No recorded activity in this group yet.
        </div>
      ) : (
        <div className="app-card divide-y divide-slate-800/80">
          {activities.map((act) => (
            <div key={act._id} className="p-3 sm:p-3.5 flex items-start gap-3 text-xs">
              <div className="w-7 h-7 rounded-md bg-[#0F172A] border border-slate-800 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                📝
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 leading-snug">{act.details}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className="capitalize">{act.action}</span>
                  <span>•</span>
                  <span>{timeAgo(act.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Group Settings Tab ─────────────────────────────────────────────────────
function SettingsTab({ group, onUpdateGroup, onExportPdf, exportingPdf }) {
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(group.emailAlertsEnabled !== false);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [notice, setNotice] = useState('');

  const handleToggle = async () => {
    const nextVal = !emailAlertsEnabled;
    setTogglingEmail(true);
    try {
      const { data } = await api.patch(`/groups/${group._id}/settings`, {
        emailAlertsEnabled: nextVal,
      });
      setEmailAlertsEnabled(nextVal);
      onUpdateGroup(data.group);
      setNotice(nextVal ? 'Email notifications enabled for new expenses.' : 'Email notifications paused.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setTogglingEmail(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice && <Alert type="info" message={notice} onClose={() => setNotice('')} />}

      {/* Email Alert Preference Card */}
      <div className="app-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white tracking-tight">Email Notifications</h4>
              <p className="text-xs text-slate-300 mt-0.5">Enable Email Alerts for New Expenses</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                Sends an email notification to members involved in a split whenever an expense is added (excluding the payer).
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={emailAlertsEnabled}
            disabled={togglingEmail}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none ${
              emailAlertsEnabled ? 'bg-emerald-600' : 'bg-slate-700'
            } ${togglingEmail ? 'opacity-50' : ''}`}
            aria-label="Toggle email alerts"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ${
                emailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
          <span>Current status:</span>
          <span className={`badge ${emailAlertsEnabled ? 'badge-emerald' : 'badge-slate'}`}>
            {emailAlertsEnabled ? 'Active' : 'Muted'}
          </span>
        </div>
      </div>

      {/* PDF Export Card */}
      <div className="app-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileDown size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white tracking-tight">Export PDF Statement</h4>
              <p className="text-xs text-slate-300 mt-0.5">Download Financial Statement Report</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                Generates a printable PDF report with member net balances, minimal debt simplification flow, and full expense log.
              </p>
            </div>
          </div>

          <button
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="btn-outline text-xs px-3.5 py-2 flex items-center gap-1.5 flex-shrink-0"
          >
            {exportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 spinner rounded-full" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileDown size={14} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main GroupDetail Page ──────────────────────────────────────────────────
export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, expensesRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/expenses/group/${groupId}`),
      ]);
      setGroup(groupRes.data.group);
      setExpenses(expensesRes.data.expenses);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExpenseAdded = (expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const handleExpenseDeleted = (expenseId) => {
    setExpenses(prev => prev.filter(e => e._id !== expenseId));
  };

  const handleMemberAdded = (updatedGroup) => {
    setGroup(updatedGroup);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const response = await api.get(`/groups/${groupId}/export-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (group?.name || 'Group').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Group_Statement_${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Failed to generate PDF statement report.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading group..." />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-white mb-1">Group Not Found</h2>
        <p className="text-xs text-slate-400 mb-5">{error || 'This group does not exist or you do not have permission to access it.'}</p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-1.5 text-xs">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: <Receipt size={14} />, count: expenses.length },
    { id: 'settlements', label: 'Settlement', icon: <Zap size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={13} />
        Back to Dashboard
      </Link>

      {/* Group Header Card */}
      <div className="app-card p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Group Identity */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
              {group.icon || '👥'}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{group.description}</p>
              )}
              <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                <span className="badge-slate font-mono text-[11px]">{group.defaultCurrency}</span>
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Users size={11} />
                  {group.members?.length || 0} members
                </span>
                <span className="text-slate-400 text-[11px] font-mono">
                  Total spent: {fmt(totalExpenses, group.defaultCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <button
              onClick={() => setShowAddExpense(true)}
              className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Plus size={14} />
              Add Expense
            </button>
            <button
              onClick={() => setShowAddMember(true)}
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 flex-1 sm:flex-initial"
            >
              <UserPlus size={14} />
              Add Member
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
              title="Download Statement PDF"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Member Avatars Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] text-slate-500 font-medium mr-1 flex-shrink-0">Members:</span>
          {group.members?.map(m => (
            <div
              key={m._id}
              className="inline-flex items-center gap-1.5 bg-[#0F172A] border border-slate-800 rounded-full pl-1.5 pr-2.5 py-1 text-xs text-slate-300 flex-shrink-0"
            >
              <img
                src={m.avatar}
                alt={m.name}
                className="w-4 h-4 rounded-full bg-slate-800"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=10b981&color=fff&size=32`; }}
              />
              <span className="text-[11px]">{m.name.split(' ')[0]}</span>
              {m._id === String(group.createdBy?._id || group.createdBy) && (
                <span className="text-[10px] text-emerald-400">admin</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="grid grid-cols-4 gap-1 bg-[#111827] p-1 rounded-lg border border-slate-800 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{ minHeight: '38px' }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="animate-fade-in">
        {activeTab === 'expenses' && (
          <div className="space-y-2.5">
            {expenses.length === 0 ? (
              <div className="app-card p-10 text-center">
                <Receipt size={36} className="text-slate-600 mx-auto mb-2.5" />
                <h3 className="text-sm font-semibold text-slate-200 mb-0.5">No expenses yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                  Log your first group expense to start tracking splits.
                </p>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="btn-primary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Add First Expense
                </button>
              </div>
            ) : (
              expenses.map(expense => (
                <ExpenseCard
                  key={expense._id}
                  expense={expense}
                  group={group}
                  currentUser={user}
                  onDelete={handleExpenseDeleted}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'settlements' && <SettlementsTab group={group} />}
        {activeTab === 'activity' && <ActivityTab groupId={groupId} />}
        {activeTab === 'settings' && (
          <SettingsTab
            group={group}
            onUpdateGroup={setGroup}
            onExportPdf={handleExportPdf}
            exportingPdf={exportingPdf}
          />
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        group={group}
        onAdded={handleExpenseAdded}
      />
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        groupId={groupId}
        onAdded={handleMemberAdded}
      />
    </div>
  );
}
