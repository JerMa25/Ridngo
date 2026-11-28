/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Page, Card, Loading, Empty, Badge } from '@/components/ui/Page';
import { platformService, apiError } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

const ROLE: Record<string, [string, 'orange' | 'blue' | 'red']> = {
  RIDE_AND_GO_DRIVER: ['Chauffeur', 'orange'], RIDE_AND_GO_PASSENGER: ['Passager', 'blue'], RIDE_AND_GO_ADMIN: ['Admin', 'red'],
};

export default function AdminUsers() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<any>(null);
  const [msg, setMsg] = useState({ title: '', message: '' });
  const [sending, setSending] = useState(false);

  // recherche serveur 300 ms après la dernière frappe
  useEffect(() => { const id = setTimeout(() => setSearch(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users', search], queryFn: () => platformService.admin.users(search) });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.message.trim()) return;
    setSending(true);
    try {
      await platformService.admin.messageUser(target.id, msg.title, msg.message);
      toast.success(t('Message envoyé à {name}', { name: target.name }));
      setTarget(null); setMsg({ title: '', message: '' });
    } catch (err) { toast.error(apiError(err, t('Action impossible pour le moment.'))); }
    finally { setSending(false); }
  };

  return (
    <Page title={t('Utilisateurs')} subtitle={t('Recherchez un compte et assistez-le directement')}
      actions={<input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Nom, email ou téléphone…')} aria-label={t('Nom, email ou téléphone…')}
        className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn text-sm" />}>
      {isLoading ? <Loading /> : (
        <Card className="p-0 md:p-0 overflow-hidden">
          {data.length === 0 ? <Empty text={t('Aucun utilisateur trouvé.')} /> : (
            <ul className="divide-y divide-foreground/5">
              {data.map((u: any) => (
                <li key={u.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-btn/15 text-orange-btn flex items-center justify-center font-black shrink-0">
                    {u.photoUri ? <img src={u.photoUri} alt="" className="w-full h-full object-cover" /> : u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black truncate">{u.name ?? '—'}</p>
                    <p className="text-[11px] text-foreground/50 truncate">{u.email} {u.phone && `· ${u.phone}`}</p>
                  </div>
                  <div className="hidden sm:flex gap-1">
                    {(u.roles ? String(u.roles).split(',') : []).map((r: string) => ROLE[r] && <Badge key={r} tone={ROLE[r][1]}>{t(ROLE[r][0])}</Badge>)}
                  </div>
                  <button onClick={() => setTarget(u)} aria-label={t('Envoyer un message')} title={t('Envoyer un message')}
                    className="w-9 h-9 rounded-xl bg-foreground/5 hover:bg-orange-btn hover:text-white flex items-center justify-center transition-colors"><MessageSquare size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {target && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-label={t('Envoyer un message')}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setTarget(null)} />
          <form onSubmit={send} className="relative w-full max-w-md bg-background border border-foreground/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">{t('Message à {name}', { name: target.name })}</h3>
              <button type="button" onClick={() => setTarget(null)} aria-label={t('Fermer')}><X size={18} /></button>
            </div>
            <p className="text-xs text-foreground/55">{t("Le message apparaîtra dans ses notifications.")}</p>
            <input value={msg.title} onChange={e => setMsg({ ...msg, title: e.target.value })} placeholder={t('Objet (facultatif)')} maxLength={120}
              className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn text-sm" />
            <textarea value={msg.message} onChange={e => setMsg({ ...msg, message: e.target.value })} placeholder={t('Votre message…')} rows={4} required maxLength={1000}
              className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn text-sm resize-none" />
            <button disabled={sending || !msg.message.trim()} className="w-full py-3 rounded-xl bg-orange-btn text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {sending && <Loader2 size={16} className="animate-spin" />} {t('Envoyer')}
            </button>
          </form>
        </div>
      )}
    </Page>
  );
}
