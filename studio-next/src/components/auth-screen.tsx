'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandMark, Button, Input } from '@/components/design-system';
import { LoginStage } from '@/components/auth/login-stage';
import { useAuth } from '@/lib/auth';

function GoogleIcon() {
  return (
    <svg className="auth-provider-icon" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.8 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2L12 13.5c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A8.8 8.8 0 0 0 9 0a9 9 0 0 0-8 5l3 2.3c.7-2.1 2.7-3.7 5-3.7Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="auth-provider-icon" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#F25022" d="M0 0h8.5v8.5H0z" /><path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
      <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" /><path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
    </svg>
  );
}

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inboxState, setInboxState] = useState<'idle' | 'checking' | 'ready'>('idle');
  const [emailError, setEmailError] = useState('');

  function finish(method: Parameters<typeof auth.signIn>[0]) {
    auth.signIn(method);
    router.replace(next);
  }

  function emailLink() {
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a work email address');
      return;
    }
    setEmailError('');
    setInboxState('checking');
    window.setTimeout(() => setInboxState('ready'), 1000);
  }

  function createWorkspace() {
    if (!email.trim() || !name.trim() || !workspaceName.trim()) return;
    finish({ type: 'signup', email, name, workspaceName });
  }

  return (
    <main className="auth-layout">
      <section className="auth-pane">
        <div className="auth-card">
          <div className="auth-logo"><BrandMark title="" /><strong>import.io</strong></div>
          {mode === 'login' ? (
            <>
              <h1>Sign in to Studio</h1>
              <p>Watch the web become data you can check.</p>
              <div className="auth-actions">
                <Button variant="secondary" onClick={() => finish({ type: 'google' })}><GoogleIcon />Continue with Google</Button>
                <Button variant="secondary" onClick={() => finish({ type: 'microsoft' })}><MicrosoftIcon />Continue with Microsoft</Button>
              </div>
              <div className="auth-divider"><span>or</span></div>
              {inboxState === 'idle' ? (
                <>
                  <label className="auth-field">
                    <span>Work email</span>
                    <Input aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'login-email-error' : undefined} type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(''); }} placeholder="you@company.com" />
                    {emailError ? <small id="login-email-error" className="auth-error">{emailError}</small> : null}
                  </label>
                  <Button variant="primary" onClick={emailLink}>Email me a sign-in link</Button>
                </>
              ) : (
                <div className="auth-inbox-state">
                  <strong>Check your inbox</strong>
                  <p>{inboxState === 'checking' ? `Sending a demo sign-in link to ${email}…` : `A demo sign-in link is ready for ${email}.`}</p>
                  <Button variant="primary" disabled={inboxState !== 'ready'} onClick={() => finish({ type: 'email', email })}>
                    Continue (demo)
                  </Button>
                </div>
              )}
              <button className="auth-sso-link" type="button" onClick={() => finish({ type: 'sso' })}>Use single sign-on (SSO)</button>
              <p className="auth-switch">New to Import.io? <Link href="/signup">Create an account</Link></p>
            </>
          ) : (
            <>
              <h1>Create your Studio workspace</h1>
              <p>Start with a clean workspace. Nothing leaves this browser.</p>
              <label>
                Work email
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
              </label>
              <label>
                Name
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </label>
              <label>
                Workspace name
                <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Acme research" />
              </label>
              <Button variant="primary" disabled={!email.trim() || !name.trim() || !workspaceName.trim()} onClick={createWorkspace}>
                Create workspace
              </Button>
              <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
            </>
          )}
        </div>
        <footer className="auth-footer">
          <span>One Import.io account for Studio, MCP and the API.</span>
          <div>
            <a href="https://www.import.io/terms" target="_blank" rel="noreferrer">Terms</a>
            <a href="https://www.import.io/privacy-policy" target="_blank" rel="noreferrer">Privacy</a>
          </div>
        </footer>
      </section>
      <div className="auth-stage-shell">
        <span className="demo-chip">Interactive demo</span>
        <LoginStage />
      </div>
    </main>
  );
}
