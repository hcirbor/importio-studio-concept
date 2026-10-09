import { Suspense } from 'react';
import { AuthScreen } from '@/components/auth-screen';

export const metadata = { title: 'Create account' };
export default function SignupPage() { return <Suspense><AuthScreen mode="signup" /></Suspense>; }
