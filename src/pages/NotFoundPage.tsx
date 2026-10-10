import { Link } from 'react-router-dom';
import { Home, Gamepad2 } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-dark-hover text-aqua">
        <Gamepad2 className="h-10 w-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-surface-light">404</h1>
      <p className="mt-2 text-sm text-surface-light/50">This page doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary mt-6">
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
