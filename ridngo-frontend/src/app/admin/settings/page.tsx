"use client"
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Page, Card, Loading, fcfa, fmtDate } from '@/components/ui/Page';
import { platformService, apiError } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

export default function AdminSettings() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: platformService.admin.settings });
  const [form, setForm] = useState({ rate: '', monthly: '', yearly: '', enabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setForm({ rate: String(Math.round(data.commissionRate * 1000) / 10), monthly: String(data.monthlyPrice), yearly: String(data.yearlyPrice), enabled: data.subscriptionsEnabled });
  }, [data]);

  const rate = Number(form.rate), monthly = Number(form.monthly), yearly = Number(form.yearly);
  const error = !(form.rate !== '' && rate >= 0 && rate <= 50) ? t('Le taux doit être compris entre 0 et 50 %.')
    : !(monthly > 0 && yearly > 0) ? t('Les prix doivent être supérieurs à 0.') : '';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error) return;
    setSaving(true);
    try {
      await platformService.admin.updateSettings({ commissionRate: rate / 100, monthlyPrice: monthly, yearlyPrice: yearly, subscriptionsEnabled: form.enabled });
      toast.success(t('Réglages enregistrés'));
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    } catch (err) { toast.error(apiError(err, t('Action impossible pour le moment.'))); }
    finally { setSaving(false); }
  };

  if (isLoading || !data) return <Loading />;
  const field = 'w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn font-bold';

  return (
    <Page title={t('Réglages')} subtitle={t('Dernière modification : {date}', { date: fmtDate(data.updatedAt, lang) })}>
      <form onSubmit={save} className="grid lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <h3 className="font-black">{t('Commission Ride&Go')}</h3>
          <label className="block space-y-2">
            <span className="text-xs font-black text-foreground/55">{t('Pourcentage prélevé sur chaque course')}</span>
            <div className="relative">
              <input type="number" step="0.5" min={0} max={50} value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} className={field} aria-invalid={!!error} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-foreground/40">%</span>
            </div>
          </label>
          <p className="text-xs text-foreground/55">{t('Exemple : sur une course à 2 000 FCFA, le chauffeur paie {amount}.', { amount: fcfa(2000 * (rate || 0) / 100) })}</p>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black">{t('Abonnements chauffeur')}</h3>
            <label className="flex items-center gap-2 text-xs font-black cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4 accent-orange-500" />
              {t(form.enabled ? 'Activés' : 'Désactivés')}
            </label>
          </div>
          <p className="text-xs text-foreground/55">{t('Un chauffeur abonné ne paie plus de commission pendant toute la période.')}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-xs font-black text-foreground/55">{t('Pack mensuel (FCFA)')}</span>
              <input type="number" min={1} value={form.monthly} onChange={e => setForm({ ...form, monthly: e.target.value })} className={field} />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-black text-foreground/55">{t('Pack annuel (FCFA)')}</span>
              <input type="number" min={1} value={form.yearly} onChange={e => setForm({ ...form, yearly: e.target.value })} className={field} />
            </label>
          </div>
        </Card>

        <div className="lg:col-span-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          {error && <p role="alert" className="text-sm font-bold text-red-500">{error}</p>}
          <button disabled={saving || !!error} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-btn text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {t('Enregistrer')}
          </button>
        </div>
      </form>
    </Page>
  );
}
