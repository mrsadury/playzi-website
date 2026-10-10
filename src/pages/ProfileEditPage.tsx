import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { AvatarPreset } from '@/types';

export default function ProfileEditPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [presets, setPresets] = useState<AvatarPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    supabase.from('avatar_presets').select('*').order('name').then(({ data }) => {
      setPresets((data as AvatarPreset[]) || []);
    });
  }, []);

  const selectPreset = (url: string) => {
    setSelectedPreset(url);
    setAvatarUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      await refreshProfile();
      showToast('Profile updated successfully', 'success');
      navigate('/profile');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-aqua border-t-transparent" />
      </div>
    );
  }

  const currentAvatar = avatarUrl || profile?.avatar_url;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Link to="/profile" className="mb-4 inline-flex items-center gap-1 text-sm text-surface-light/50 hover:text-aqua text-surface-light/60 hover:text-aqua">
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-surface-light text-surface-light sm:text-3xl">Edit Profile</h1>

      <div className="card p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current avatar preview */}
          <div className="flex items-center gap-4">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="h-16 w-16 rounded-full border-2 border-aqua object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-aqua text-xl font-bold text-dark-bg">
                {(username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-surface-light text-surface-light">Profile Picture</p>
              <p className="text-xs text-surface-light/50 text-surface-light/50">Choose a preset or paste a custom URL</p>
            </div>
          </div>

          {/* Avatar presets grid */}
          {presets.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-surface-light text-surface-light">Pre-installed Avatars</label>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.url)}
                    className={`relative rounded-btn p-1 transition-all ${
                      selectedPreset === preset.url || (currentAvatar === preset.url && !selectedPreset)
                        ? 'ring-2 ring-aqua bg-aqua/10'
                        : 'ring-1 ring-border-subtle hover:ring-aqua/50 ring-dark-surface'
                    }`}
                    title={preset.name || 'Avatar'}
                  >
                    <img src={preset.url} alt={preset.name || 'Avatar'} className="h-12 w-12 rounded-full object-cover" />
                    {(selectedPreset === preset.url || (currentAvatar === preset.url && !selectedPreset)) && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-aqua">
                        <Check className="h-3 w-3 text-dark-bg" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light text-surface-light">Or paste custom avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setSelectedPreset(null);
              }}
              placeholder="https://example.com/avatar.png"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light text-surface-light">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light text-surface-light">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/profile" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
