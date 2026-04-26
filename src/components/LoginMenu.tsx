'use client';

import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';

interface LoginMenuProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginMenu({ onLoginSuccess }: LoginMenuProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [usernameForReset, setUsernameForReset] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isSignup = mode === 'signup';
  const isForgotPassword = mode === 'forgot';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: isSignup ? name : undefined,
          action: isSignup ? 'signup' : 'signin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      // Save user to localStorage
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          username: usernameForReset,
          securityAnswer,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '重置密码失败');
        return;
      }

      setSuccessMessage('密码重置成功，请使用新密码登录');
      setMode('signin');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSecurityAnswer('');
      setEmail('');
      setUsernameForReset('');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dorm Communication System
          </h1>
          <p className="text-gray-600 mt-2">
            {isSignup
              ? 'Create a new account'
              : isForgotPassword
              ? 'Reset your password'
              : 'Sign in to your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <User size={18} />
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                required
              />
            </div>
          )}

          {!isForgotPassword && (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Mail size={18} />
                  Account
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your account (e.g. user1.com)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Lock size={18} />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>
            </>
          )}

          {isForgotPassword && (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <User size={18} />
                  Username
                </label>
                <input
                  type="text"
                  value={usernameForReset}
                  onChange={(e) => setUsernameForReset(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Lock size={18} />
                  密保问题答案（统一为 123）
                </label>
                <input
                  type="password"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="请输入密保答案"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Lock size={18} />
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Lock size={18} />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border-2 border-green-300 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignup ? 'Sign Up' : isForgotPassword ? 'Reset Password' : 'Sign In'}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setError('');
                setSuccessMessage('');
              }}
              className="ml-2 text-purple-600 font-semibold hover:underline"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          <button
            onClick={() => {
              setMode(isForgotPassword ? 'signin' : 'forgot');
              setError('');
              setSuccessMessage('');
            }}
            className="mt-3 text-sm text-purple-600 font-semibold hover:underline"
          >
            {isForgotPassword ? 'Back to Sign In' : 'Forgot Password?'}
          </button>
        </div>

        {/* Demo Users */}
        {!isForgotPassword && <div className="mt-8 pt-6 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600 mb-3 font-semibold">Demo Accounts (click to sign in instantly):</p>
          {[
            { email: 'user1.com', label: '👤 Alice Chen' },
            { email: 'user2.com', label: '👤 Bob Smith' },
            { email: 'user3.com', label: '👤 Chris Wang' },
            { email: 'user4.com', label: '👤 Diana Lee' },
            { email: 'staffadmin.com', label: '🧑‍💼 Staff Admin' },
          ].map(({ email: demoEmail, label }, idx) => (
            <button
              key={demoEmail}
              disabled={loading}
              onClick={async () => {
                setError('');
                setMode('signin');
                setLoading(true);
                try {
                  const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: demoEmail, password: 'password123', action: 'signin' }),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data.error || 'Authentication failed');
                  } else {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    onLoginSuccess(data.user);
                  }
                } catch {
                  setError('An error occurred. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              className={`w-full text-left px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 ${idx < 4 ? 'mb-2' : ''}`}
            >
              {label} <span className="text-gray-400">/ password123</span>
            </button>
          ))}
        </div>}
      </div>
    </div>
  );
}
