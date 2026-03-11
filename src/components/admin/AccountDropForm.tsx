import { useState } from 'react';
import { Plus, Trash2, RotateCcw, ImagePlus, X, FileArchive } from 'lucide-react';
import { AccountDrop, AccountCategory, NetflixType, CATEGORY_COLORS, addAccount } from '@/lib/accounts';
import { supabase } from '@/integrations/supabase/client';

interface AccountDropFormProps {
  onAccountAdded: () => void;
  userId?: string;
}

export function AccountDropForm({ onAccountAdded, userId }: AccountDropFormProps) {
  const [form, setForm] = useState({
    title: '', category: 'Steam' as AccountCategory, email: '', password: '',
    notes: '', games: '', netflixType: 'account' as NetflixType, planDetails: '',
  });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [cookieFile, setCookieFile] = useState<{ data: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setError('');
    const fileName = `${crypto.randomUUID()}.${file.name.split('.').pop() || 'png'}`;
    const { error: uploadError } = await supabase.storage.from('screenshots').upload(fileName, file, { contentType: file.type, upsert: true });
    if (uploadError) { setError('Upload failed: ' + uploadError.message); return; }
    const { data } = supabase.storage.from('screenshots').getPublicUrl(fileName);
    setScreenshot(data.publicUrl);
  };

  const handleCookieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setCookieFile({ data: reader.result as string, name: file.name });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNetflixCookies = form.category === 'Netflix' && form.netflixType === 'cookies';
    if (!form.title) { setError('Title is required.'); return; }
    if (!isNetflixCookies && (!form.email || !form.password)) { setError('Email and password are required.'); return; }
    if (isNetflixCookies && !cookieFile) { setError('Please upload a cookie file.'); return; }

    const result = await addAccount({
      ...form,
      email: isNetflixCookies ? '' : form.email,
      password: isNetflixCookies ? '' : form.password,
      screenshot: screenshot || undefined,
      games: form.category === 'Steam' ? form.games || undefined : undefined,
      netflixType: form.category === 'Netflix' ? form.netflixType : undefined,
      cookieFile: isNetflixCookies && cookieFile ? cookieFile.data : undefined,
      cookieFileName: isNetflixCookies && cookieFile ? cookieFile.name : undefined,
      planDetails: form.category === 'Crunchyroll' ? form.planDetails || undefined : undefined,
    });

    if (!result) { setError('Failed to drop account.'); return; }

    // Discord webhook
    try {
      const accountUrl = `${window.location.origin}/account/${result.slug}`;
      await supabase.functions.invoke('discord-webhook', {
        body: { title: result.title, category: result.category, imageUrl: screenshot || undefined, accountUrl },
      });
    } catch {}

    setForm({ title: '', category: 'Steam', email: '', password: '', notes: '', games: '', netflixType: 'account', planDetails: '' });
    setScreenshot(null); setCookieFile(null); setError('');
    setSuccess('Account dropped!');
    setTimeout(() => setSuccess(''), 3000);
    onAccountAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className="text-[11px] text-muted-foreground block mb-1">Title *</label>
        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Steam Account with GTA V" className="admin-input" />
      </div>
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">Category</label>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as AccountCategory })} className="admin-input cursor-pointer">
          {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {form.category === 'Netflix' && (
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Netflix Type</label>
          <select value={form.netflixType} onChange={e => setForm({ ...form, netflixType: e.target.value as NetflixType })} className="admin-input cursor-pointer">
            <option value="account">Account (Email/Pass)</option>
            <option value="cookies">Cookies (.rar file)</option>
          </select>
        </div>
      )}
      {!(form.category === 'Netflix' && form.netflixType === 'cookies') && (
        <>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Email *</label>
            <input type="text" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="account@email.com" className="admin-input" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Password *</label>
            <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="password" className="admin-input" />
          </div>
        </>
      )}
      {form.category === 'Netflix' && form.netflixType === 'cookies' && (
        <div className="sm:col-span-2">
          <label className="text-[11px] text-muted-foreground block mb-1">Cookie File *</label>
          <input type="file" accept=".rar,.zip,.7z" onChange={handleCookieFileChange} className="hidden" id="cookie-single" />
          {cookieFile ? (
            <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg border border-border">
              <FileArchive className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-foreground flex-1">{cookieFile.name}</span>
              <button type="button" onClick={() => setCookieFile(null)} className="text-muted-foreground hover:text-destructive cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <label htmlFor="cookie-single" className="w-full p-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary cursor-pointer flex items-center justify-center gap-2">
              <FileArchive className="w-3.5 h-3.5" /> Upload cookie file
            </label>
          )}
        </div>
      )}
      {form.category === 'Steam' && (
        <div className="sm:col-span-2">
          <label className="text-[11px] text-muted-foreground block mb-1">Games</label>
          <input type="text" value={form.games} onChange={e => setForm({ ...form, games: e.target.value })} placeholder="GTA V, CS2, Rust" className="admin-input" />
        </div>
      )}
      {form.category === 'Crunchyroll' && (
        <div className="sm:col-span-2">
          <label className="text-[11px] text-muted-foreground block mb-1">Plan Details</label>
          <input type="text" value={form.planDetails} onChange={e => setForm({ ...form, planDetails: e.target.value })} placeholder="e.g. Mega Fan" className="admin-input" />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="text-[11px] text-muted-foreground block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Extra info..." className="admin-input resize-none" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[11px] text-muted-foreground block mb-1">Screenshot</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="ss-single" />
        {screenshot ? (
          <div className="relative inline-block">
            <img src={screenshot} alt="Preview" className="w-28 h-16 object-cover rounded-lg border border-border" />
            <button type="button" onClick={() => setScreenshot(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] cursor-pointer"><X className="w-2.5 h-2.5" /></button>
          </div>
        ) : (
          <label htmlFor="ss-single" className="w-full p-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary cursor-pointer flex items-center justify-center gap-2">
            <ImagePlus className="w-3.5 h-3.5" /> Upload
          </label>
        )}
      </div>
      {error && <p className="sm:col-span-2 text-destructive text-xs">{error}</p>}
      {success && <p className="sm:col-span-2 text-success text-xs">{success}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-primary text-primary-foreground hover:opacity-90 cursor-pointer flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Drop Account
        </button>
      </div>
    </form>
  );
}
