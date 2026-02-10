import React from 'react';
import { ViewState } from '../types';

interface NavBarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, onChangeView }) => {
  const navItems: { id: ViewState; icon: string; label: string }[] = [
    { id: 'input', icon: 'mic', label: 'Input' },
    { id: 'focus', icon: 'center_focus_strong', label: 'Focus' },
    { id: 'projects', icon: 'grid_view', label: 'Projects' }, // grid_view or folder_open
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6">
      <nav className="glass-nav rounded-full px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/50 min-w-[320px] max-w-sm">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ease-out ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${
                  isActive ? 'font-variation-fill' : ''
                }`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              {isActive && (
                <span className="text-[11px] font-bold tracking-wider uppercase animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default NavBar;
