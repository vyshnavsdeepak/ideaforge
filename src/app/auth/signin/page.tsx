import { Metadata } from 'next';
import { SignInContent } from './SignInContent';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to access your Reddit AI Opportunity Finder dashboard',
};

export default function SignInPage() {
  return <SignInContent />;
}