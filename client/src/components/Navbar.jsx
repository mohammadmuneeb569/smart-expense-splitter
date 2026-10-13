import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  SplitSquareHorizontal, LogOut, ChevronDown,
  LayoutDashboard, Menu, X, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'CAD', 'AUD'];

export default function Navbar() {
  const { user, logout, currency, setCurrency } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white transition-transform group-hover:scale-105">
                <SplitSquareHorizontal size={17} strokeWidth={2.2} />
              </div>
              <span className="text-base font-semibold tracking-tight text-white">SplitSmart</span>
            </Link>

            {/* Desktop Link */}
            <div className="hidden sm:flex items-center">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => { setCurrencyOpen(!currencyOpen); setProfileOpen(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors"
                style={{ minHeight: '36px' }}
                aria-label="Change Currency"
              >
                <Globe size={13} className="text-slate-400" />
                <span>{currency}</span>
                <ChevronDown size={11} className={`text-slate-400 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} />
              </button>

              {currencyOpen && (
                <div className="absolute right-0 top-11 w-32 bg-[#111827] border border-slate-800 rounded-lg py-1 shadow-2xl z-50 animate-slide-up">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCurrency(c); setCurrencyOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                        currency === c
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setCurrencyOpen(false); }}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-slate-800/60 transition-colors"
                style={{ minHeight: '36px' }}
                aria-label="User profile menu"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&size=64`;
                  }}
                />
                <span className="hidden md:block text-xs font-medium text-slate-200 truncate max-w-[100px]">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 w-48 bg-[#111827] border border-slate-800 rounded-lg py-1.5 shadow-2xl z-50 animate-slide-up">
                  <div className="px-3.5 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-semibold text-slate-100 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="sm:hidden py-3 border-t border-slate-800 animate-slide-up">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
