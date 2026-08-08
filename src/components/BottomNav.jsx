import React from 'react';
import { Home, ScanLine, Calendar, Users, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'barn', label: 'Barn Areas', icon: Home },
    { id: 'scanner', label: 'Scanner', icon: ScanLine },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'goats', label: 'Goats', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
