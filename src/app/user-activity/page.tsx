import { Metadata } from 'next';
import { UserActivityContent } from './UserActivityContent';

export const metadata: Metadata = {
  title: 'User Activity',
  description: 'Analyze Reddit user activity and discover opportunities from their posts and comments',
};

export default function UserActivityPage() {
  return <UserActivityContent />;
}