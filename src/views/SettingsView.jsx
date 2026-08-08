import React, { useState } from 'react';
import { Database, Copy, Check, Server, ShieldCheck, Image, Smartphone, LogOut, User } from 'lucide-react';
import { getSupabaseSqlSchema } from '../services/goatService';

export default function SettingsView({ goats = [], session = null, onSignOut }) {
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseSqlSchema());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>System & Developer Settings</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          System diagnostics and database deployment script.
        </p>
      </div>

      {/* Signed-in Admin Account Card */}
      {session && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'var(--primary-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px -2px rgba(5,150,105,0.3)'
              }}>
                <User size={20} color="white" />
              </div>
              <div>
                <strong style={{ fontSize: '14px', fontWeight: '800', display: 'block' }}>Farm Admin</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.user?.email}</span>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', borderColor: '#fee2e2' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Pure Supabase Connection Status Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Direct Supabase Database</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Environment variable configured (`src/config/supabase.js`)
            </span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Connection:</span>
            <strong style={{ color: '#2e7d32' }}>● Active Supabase Client</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Goats Registered:</span>
            <strong>{goats.length} Goats</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Photo Storage:</span>
            <strong>Supabase Storage (`goat-photos`)</strong>
          </div>
        </div>
      </div>

      {/* SQL Setup Helper for Deployment */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#0284c7" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Supabase SQL Schema</h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleCopySql}>
            {copiedSql ? <Check size={14} color="#2e7d32" /> : <Copy size={14} />}
            <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Run this SQL script in your Supabase project SQL Editor to automatically create tables for `goats`, `timeline_events`, and `barn_areas`.
        </p>

        <pre
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '11px',
            maxHeight: '160px',
            overflowY: 'auto',
            fontFamily: 'monospace'
          }}
        >
          {getSupabaseSqlSchema()}
        </pre>
      </div>
    </div>
  );
}
