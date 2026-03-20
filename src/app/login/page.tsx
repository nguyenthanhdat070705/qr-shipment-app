'use client';

import './login.css';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the redirect URL from query params (set by AuthGuard)
  const redirectUrl = searchParams.get('redirect') || '/';

  // If already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.replace(decodeURIComponent(redirectUrl));
    }
  }, [router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
        return;
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      // Redirect to the original page (or home if none)
      const target = decodeURIComponent(redirectUrl);
      router.push(target);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      {/* ── Left panel — branding ─────────────────────── */}
      <div className="login-branding">
        <div className="login-branding-content">
          <Image
            src="/blackstones-logo.webp"
            alt="Blackstones Logo"
            width={280}
            height={60}
            className="login-logo"
            priority
          />
          <p className="login-tagline">
            Hệ thống quản lý xuất kho
          </p>
          <div className="login-branding-decoration">
            <div className="login-decoration-line" />
            <div className="login-decoration-line" />
            <div className="login-decoration-line" />
          </div>
        </div>
        {/* Floating orbs for visual effect */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      {/* ── Right panel — login form ─────────────────── */}
      <div className="login-form-panel">
        {/* Mobile logo (shown only on small screens) */}
        <div className="login-mobile-header">
          <Image
            src="/blackstones-logo.webp"
            alt="Blackstones Logo"
            width={200}
            height={43}
            className="login-logo-mobile"
            priority
          />
        </div>

        <div className="login-form-container">
          <div className="login-form-header">
            <h1 className="login-title">Đăng nhập</h1>
            <p className="login-subtitle">
              Nhập email và mật khẩu để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Error message */}
            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Redirect notice */}
            {redirectUrl !== '/' && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <LogIn size={14} />
                <span>Vui lòng đăng nhập để xem sản phẩm</span>
              </div>
            )}

            {/* Email field */}
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email
              </label>
              <div className="login-input-wrapper">
                <Mail size={18} className="login-input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Mật khẩu
              </label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input login-input-password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-password"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>© {new Date().getFullYear()} Blackstones. All rights reserved.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f8 100%)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #e5e7eb',
          borderTopColor: '#4f46e5',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
