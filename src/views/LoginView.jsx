import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import { LogIn, Eye, EyeOff, Loader2, Sprout } from 'lucide-react';

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (authError) throw authError;
      onLogin(data.session);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      background: 'linear-gradient(160deg, #f0fdf4 0%, #ffffff 60%)'
    }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          width: '72px', height: '72px',
          background: 'var(--primary-gradient)',
          borderRadius: '22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 24px -4px rgba(5,150,105,0.4)'
        }}>
          <Sprout size={36} color="white" strokeWidth={2} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Beit Minerva
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Goat Farm Management
        </p>
      </div>

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '28px 24px',
        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.1)',
        border: '1px solid var(--border-color)'
      }}>
        <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>Welcome back</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '22px' }}>
          Sign in with your farm admin account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@yourfarm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#dc2626',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '4px', height: '46px', fontSize: '14px' }}
          >
            {loading
              ? <Loader2 size={18} className="spinner" />
              : <><LogIn size={16} /> Sign In</>
            }
          </button>
        </form>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '24px', textAlign: 'center' }}>
        Beit Minerva Farm · Private Access Only
      </p>
    </div>
  );
}
