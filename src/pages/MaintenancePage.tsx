import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

export default function MaintenancePage() {
  const { settings } = useSettings();
  const title = settings?.maintenance_title || 'Under Maintenance';
  const message = settings?.maintenance_message || 'We are performing maintenance. We will be back shortly.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-aqua/10 animate-pulse-glow">
        <Wrench className="h-12 w-12 text-aqua" />
      </div>
      <h1 className="mb-4 text-4xl font-extrabold text-surface-light sm:text-5xl">{title}</h1>
      <p className="mb-8 max-w-md text-lg text-surface-light/60">{message}</p>
      <div className="flex items-center gap-1 text-sm text-surface-light/40">
        <ArrowLeft className="h-4 w-4" />
        <Link to="/" className="hover:text-aqua">Try again later</Link>
      </div>
    </div>
  );
}
