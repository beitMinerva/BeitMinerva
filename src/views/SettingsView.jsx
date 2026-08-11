import { User, LogIn, LogOut, ShieldCheck, Info, BarChart2, ChevronRight } from 'lucide-react';

export default function SettingsView({ goats = [], barnAreas = [], session = null, onOpenLogin, onSignOut, onOpenAnalytics }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Settings & Access</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage admin access and farm business analytics.
        </p>
      </div>

      {/* FARM BUSINESS ANALYTICS CARD */}
      <div
        className="card"
        onClick={onOpenAnalytics}
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          border: '1px solid var(--primary-border)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}>
            <BarChart2 size={22} color="var(--primary-dark)" />
          </div>
          <div>
            <strong style={{ fontSize: '15px', color: 'var(--primary-dark)', display: 'block' }}>
              Farm Business Analytics & Smart Metrics
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Milk yields, feed conversion ratios (FCR), & financial projections
            </span>
          </div>
        </div>
        <ChevronRight size={20} color="var(--primary-dark)" />
      </div>

      {/* ACCOUNT ACCESS CARD */}
      <div className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="var(--primary)" />
          Account & Access Level
        </h3>

        {session ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid var(--primary-border)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <ShieldCheck size={16} color="var(--primary-dark)" />
                  <strong style={{ fontSize: '14px', color: 'var(--primary-dark)' }}>Admin Access Granted</strong>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {session.user?.email || 'Logged in as Admin'}
                </span>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-full"
              onClick={onSignOut}
              style={{ color: '#dc2626', borderColor: '#fee2e2', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <LogOut size={16} />
              <span>Log Out Admin</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>Guest Mode (Read-Only)</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                You can browse all farm records. Sign in to add or edit data.
              </span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={onOpenLogin}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <LogIn size={16} />
              <span>Admin Sign In</span>
            </button>
          </div>
        )}
      </div>

      {/* FARM SUMMARY CARD */}
      <div className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--primary)" />
          Farm Overview
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Farm Name:</span>
            <strong>Beit Minerva</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Goats Registered:</span>
            <strong>{goats.length} Goats</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Status:</span>
            <strong style={{ color: 'var(--primary)' }}>● Connected to Supabase</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
