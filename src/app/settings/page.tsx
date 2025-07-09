import { Metadata } from 'next';
import { SettingsContent } from './SettingsContent';

export const metadata: Metadata = {
  title: 'Settings - IdeaForge',
  description: 'Configure your Reddit AI Opportunity Finder settings',
};

export default function SettingsPage() {
  return <SettingsContent />;
}