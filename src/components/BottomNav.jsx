import React from 'react';
import { Home, QrCode, Calendar, ClipboardList } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'barn', label: 'Barn Grid', icon: Home },
    { id: 'scanner', label: 'Scanner', icon: QrCode },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'goats', label: 'Goat Herd', icon: ClipboardList },
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
            aria-label={item.label}
          >
            <Icon size={20} color={isActive ? '#16a34a' : '#64748b'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
