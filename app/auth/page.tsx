'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'login' | 'register' | 'verify';

interface FormError {
  field: string;
  message: string;
}

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'AI Security Tutors',
    desc: 'Learn from expert personas — Prof. Chen, Agent Ramos, and more.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Adaptive Learning',
    desc: 'Diagnostic, teach, quiz — progression tied to your understanding.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: 'Progress Tracking',
    desc: 'Scores, streaks, heatmaps — see your growth at a glance.',
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [errors, setErrors] = useState<FormError[]>([]);
  const [loading, setLoading] = useState(false);
  // OTP state
  const [otpUserId, setOtpUserId] = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpLoginCreds, setOtpLoginCreds] = useState<{ username: string; password: string } | null>(null);

  function getError(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleOtpResponse(data: { status: string; userId: string; maskedEmail: string }, creds?: { username: string; password: string }) {
    setOtpUserId(data.userId);
    setOtpMaskedEmail(data.maskedEmail);
    if (creds) setOtpLoginCreds(creds);
    setErrors([]);
    setTab('verify');
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const username = (form.get('username') as string).trim();
    const password = form.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors([{ field: 'form', message: (data.error as string | undefined) ?? 'Login failed' }]);
        return;
      }
      if (data.status === 'otp_sent') {
        handleOtpResponse(
          data as { status: string; userId: string; maskedEmail: string },
          { username, password },
        );
        return;
      }
      router.push('/dashboard');
    } catch {
      setErrors([{ field: 'form', message: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const username = (form.get('username') as string).trim();
    const email = (form.get('email') as string).trim();
    const password = form.get('password') as string;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors([{ field: 'form', message: (data.error as string | undefined) ?? 'Registration failed' }]);
        return;
      }
      // Auto-login after registration → will trigger OTP flow
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const loginData = await loginRes.json() as Record<string, unknown>;
      if (loginRes.ok && loginData.status === 'otp_sent') {
        handleOtpResponse(loginData as { status: string; userId: string; maskedEmail: string });
      } else {
        setTab('login');
      }
    } catch {
      setErrors([{ field: 'form', message: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const code = (form.get('code') as string).replace(/\s/g, '');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otpUserId, code }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors([{ field: 'form', message: (data.error as string | undefined) ?? 'Verification failed' }]);
        return;
      }
      router.push('/dashboard');
    } catch {
      setErrors([{ field: 'form', message: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!otpLoginCreds) return;
    setErrors([]);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpLoginCreds),
      });
      const data = await res.json() as Record<string, unknown>;
      if (res.ok && data.status === 'otp_sent') {
        setErrors([{ field: 'form', message: 'A new code has been sent to your email.' }]);
      } else {
        setErrors([{ field: 'form', message: 'Could not resend code. Please try again.' }]);
      }
    } catch {
      setErrors([{ field: 'form', message: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — auth form ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 text-center lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            CyberTutor <span className="font-normal text-neutral-400">AI</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Learn cybersecurity with AI tutors</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">
              {tab === 'login' ? 'Welcome back' : tab === 'register' ? 'Create your account' : 'Check your email'}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {tab === 'login'
                ? 'Sign in to continue your learning journey.'
                : tab === 'register'
                ? 'Start learning cybersecurity today.'
                : `We sent a 6-digit code to ${otpMaskedEmail}`}
            </p>
          </div>

          {/* Form-level error / info */}
          {getError('form') && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{getError('form')}</p>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Username" name="username" type="text" required autoComplete="username" />
              <Field label="Password" name="password" type="password" required autoComplete="current-password" />
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
              >
                {loading ? <Spinner label="Logging in…" /> : 'Log in'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Username" name="username" type="text" required autoComplete="username" />
              <Field label="Email" name="email" type="email" required autoComplete="email" />
              <Field label="Password" name="password" type="password" required autoComplete="new-password" />
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
              >
                {loading ? <Spinner label="Creating account…" /> : 'Create account'}
              </button>
            </form>
          )}

          {tab === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-xs font-semibold text-neutral-600">
                  Verification code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="000000"
                  required
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-neutral-900 placeholder-neutral-300 transition-all focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
              >
                {loading ? <Spinner label="Verifying…" /> : 'Verify & sign in'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-neutral-400">
            {tab === 'login' && (
              <>No account?{' '}
                <button type="button" onClick={() => { setTab('register'); setErrors([]); }} className="font-medium text-neutral-700 underline underline-offset-2">
                  Register free
                </button>
              </>
            )}
            {tab === 'register' && (
              <>Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); setErrors([]); }} className="font-medium text-neutral-700 underline underline-offset-2">
                  Log in
                </button>
              </>
            )}
            {tab === 'verify' && (
              <>Didn&apos;t receive it?{' '}
                <button type="button" onClick={handleResendOtp} disabled={loading} className="font-medium text-neutral-700 underline underline-offset-2 disabled:opacity-40">
                  Resend code
                </button>
                {' · '}
                <button type="button" onClick={() => { setTab('login'); setErrors([]); }} className="font-medium text-neutral-700 underline underline-offset-2">
                  Back to login
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Right panel — dark branding ──────────────────────────────────────── */}
      <div className="hidden flex-col justify-between bg-neutral-900 px-12 py-14 lg:flex lg:w-[480px] xl:w-[520px]">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <svg className="h-5 w-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">CyberTutor AI</span>
          </div>

          <div className="mt-14">
            <h2 className="text-3xl font-bold leading-snug text-white">
              Master cybersecurity<br />with AI-powered tutors.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Structured learning paths, expert personas, and real-time feedback — all in one platform.
            </p>
          </div>

          <ul className="mt-12 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-neutral-600">© 2025 CyberTutor AI. All rights reserved.</p>
      </div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
      </svg>
      {label}
    </span>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-semibold text-neutral-600">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
    </div>
  );
}
