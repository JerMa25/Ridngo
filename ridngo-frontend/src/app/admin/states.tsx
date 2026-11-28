"use client"
import React from 'react';
import { Badge } from '@/components/ui/Page';
import { useI18n } from '@/lib/i18n';

const STATES: Record<string, [string, 'gray' | 'green' | 'orange' | 'red' | 'blue']> = {
  CREATED: ['En approche', 'blue'], ONGOING: ['En cours', 'orange'], COMPLETED: ['Terminée', 'green'], CANCELLED: ['Annulée', 'red'],
  PENDING: ['En attente', 'gray'], BID_RECEIVED: ['Candidatures', 'blue'], DRIVER_SELECTED: ['Chauffeur choisi', 'orange'], VALIDATED: ['Validée', 'green'],
};

/** Statut d'une course ou d'une offre, traduit et coloré. */
export const StateBadge = ({ state }: { state: string }) => {
  const { t } = useI18n();
  const [label, tone] = STATES[state] ?? [state, 'gray'];
  return <Badge tone={tone}>{t(label)}</Badge>;
};
