import { useState, useEffect } from 'react';
import { Download, AlertCircle, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { ImportHistory } from '@/types';
import { formatDateTime } from '@/lib/utils';

const DEFAULT_FEED = 'https://gamemonetize.com/feed.php?format=0&company=3v3.info&num=50&page=1';

interface ImportResult {
  success?: boolean;
  total_processed?: number;
  new_games?: number;
  updated_games?: number;
  failed?: number;
  categories_found?: string[];
  error?: string;
  import_id?: string;
}

export default function AdminImportGames() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [feedUrl, setFeedUrl] = useState(DEFAULT_FEED);
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('10');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('import_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory((data as ImportHistory[]) || []);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const start = parseInt(startPage, 10);
    const end = parseInt(endPage, 10);

    if (!feedUrl.trim()) {
      setError('Feed URL is required');
      return;
    }
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      setError('Invalid page range. Start must be >= 1 and end must be >= start.');
      return;
    }
    if (end - start > 49) {
      setError('Maximum 50 pages per import.');
      return;
    }

    try {
      const url = new URL(feedUrl);
      if (!['gamemonetize.com', 'www.gamemonetize.com'].includes(url.hostname)) {
        setError('Only gamemonetize.com feed URLs are allowed.');
        return;
      }
    } catch {
      setError('Invalid URL format.');
      return;
    }

    setImporting(true);

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-games`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          feed_url: feedUrl.trim(),
          start_page: start,
          end_page: end,
          admin_token: session?.access_token,
        }),
      });

      const data: ImportResult = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || `Import failed with status ${res.status}`);
      } else {
        setResult(data);
        showToast('Import completed successfully', 'success');
        fetchHistory();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light">Import Games</h1>
        <p className="text-sm text-surface-light/50">Import games from GameMonetize JSON feed</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Import form */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light">
              <Download className="h-5 w-5 text-aqua" />
              Feed Configuration
            </h2>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {result && (
              <div className="mb-4 rounded-btn border border-green-200 bg-green-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Import Completed
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.total_processed}</p>
                    <p className="text-xs text-green-400">Processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.new_games}</p>
                    <p className="text-xs text-green-400">New Games</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{result.updated_games}</p>
                    <p className="text-xs text-blue-500">Updated</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                    <p className="text-xs text-red-400">Failed</p>
                  </div>
                </div>
                {result.categories_found && result.categories_found.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {result.categories_found.map((cat) => (
                      <span key={cat} className="badge bg-white text-green-700">{cat}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-light">
                  <span className="flex items-center gap-1.5"><Link2 className="h-4 w-4" /> Feed URL</span>
                </label>
                <input
                  type="url"
                  required
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  className="input-field"
                  placeholder={DEFAULT_FEED}
                />
                <p className="mt-1 text-xs text-surface-light/50">Only gamemonetize.com feed URLs are accepted.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-surface-light">Start Page</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-surface-light">End Page</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={endPage}
                    onChange={(e) => setEndPage(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={importing} className="btn-primary">
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import Games
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setFeedUrl(DEFAULT_FEED); setStartPage('1'); setEndPage('10'); setResult(null); setError(null); }}
                  className="btn-secondary"
                >
                  Reset
                </button>
              </div>
            </form>

            {importing && (
              <div className="mt-4 rounded-btn bg-aqua/5 px-4 py-3">
                <p className="text-sm text-surface-light/50">
                  Importing pages {startPage} to {endPage} from GameMonetize... This may take a while for large imports.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History sidebar */}
        <div>
          <div className="admin-card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold text-surface-light">Import History</h2>
            </div>
            {history.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-surface-light/50">No imports yet</p>
            ) : (
              <div className="divide-y divide-border-subtle max-h-96 overflow-y-auto">
                {history.map((imp) => (
                  <div key={imp.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-light">
                        {imp.new_games} new, {imp.updated_games} updated
                      </span>
                      <span className={`badge ${
                        imp.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        imp.status === 'running' ? 'bg-blue-50 text-blue-500' :
                        imp.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        'bg-dark-hover text-surface-light/50'
                      }`}>
                        {imp.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-surface-light/50">
                      Pages {imp.start_page}-{imp.end_page} - {formatDateTime(imp.created_at)}
                    </p>
                    <p className="text-xs text-surface-light/50">
                      {imp.total_processed} processed, {imp.failed} failed
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
