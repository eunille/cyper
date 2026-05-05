'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'login' | 'register';

interface FormError {
  field: string;
  message: string;
}

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [errors, setErrors] = useState<FormError[]>([]);
  const [loading, setLoading] = useState(false);

  function getError(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
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
      const data: unknown = await res.json();
      if (!res.ok) {
        setErrors([{ field: 'form', message: (data as { error?: string }).error ?? 'Login failed' }]);
        return;
      }
      router.push('/learn');
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
      const data: unknown = await res.json();
      if (!res.ok) {
        setErrors([{ field: 'form', message: (data as { error?: string }).error ?? 'Registration failed' }]);
        return;
      }
      // Auto-login after registration
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (loginRes.ok) {
        router.push('/learn');
      } else {
        setTab('login');
      }
    } catch {
      setErrors([{ field: 'form', message: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            CyberTutor <span className="font-normal text-neutral-400">AI</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Learn cybersecurity with AI tutors</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-xl bg-neutral-100 p-1">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setErrors([]); }}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {t === 'login' ? 'Log in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form error */}
        {getError('form') && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {getError('form')}
          </p>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Username" name="username" type="text" required autoComplete="username" />
            <Field label="Password" name="password" type="password" required autoComplete="current-password" />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <Field label="Username" name="username" type="text" required autoComplete="username" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Password" name="password" type="password" required autoComplete="new-password" />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">
          {tab === 'login' ? (
            <>No account?{' '}
              <button type="button" onClick={() => { setTab('register'); setErrors([]); }} className="font-medium text-neutral-700 underline underline-offset-2">
                Register
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" onClick={() => { setTab('login'); setErrors([]); }} className="font-medium text-neutral-700 underline underline-offset-2">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
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
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
      />
    </div>
  );
}
