import React from 'react';
import { ScanLine, Plus, LogIn, LogOut, ShieldCheck } from 'lucide-react';

export default function Header({
  session,
  onOpenScanner,
  onOpenAddGoat,
  onOpenLogin,
  onSignOut
}) {
  return (
    <header className="header">
      <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 className="header-title" style={{ margin: 0, lineHeight: 1, fontSize: '20px', fontWeight: '800' }}>
          Beit Minerva
        </h1>
        {session ? (
          <span style={{
            fontSize: '10px',
            fontWeight: '800',
            background: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            border: '1px solid var(--primary-border)',
            padding: '2px 7px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <ShieldCheck size={11} /> Admin
          </span>
        ) : (
          <span style={{
            fontSize: '10px',
            fontWeight: '600',
            background: '#f1f5f9',
            color: 'var(--text-muted)',
            padding: '2px 7px',
            borderRadius: '9999px'
          }}>
            Guest
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenScanner}
        >
          <ScanLine size={15} />
          <span>Scan</span>
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenAddGoat}
        >
          <Plus size={15} />
          <span>Add Goat</span>
        </button>

        {session ? (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onSignOut}
            title="Sign out as Admin"
            style={{ color: '#dc2626', padding: '6px 10px' }}
          >
            <LogOut size={14} />
          </button>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            onClick={onOpenLogin}
            style={{ padding: '6px 10px' }}
          >
            <LogIn size={14} />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
