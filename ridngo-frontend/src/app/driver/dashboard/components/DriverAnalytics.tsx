/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, Award, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api-client';

// Interfaces basées sur ton OpenAPI
interface EnrichedRide {
  rideId: string;
  price: number;
  createdAt: string;
  state: 'COMPLETED' | 'CANCELLED' | 'ONGOING' | 'CREATED';
}

interface Review {
  rating: number;
  createdAt: string;
}

export const DriverAnalytics = () => {
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer le token (à adapter selon ta gestion d'auth)
  const getToken = () => localStorage.getItem('accessToken'); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // 1. Récupération de l'historique enrichi (pour les revenus)
        // On demande une taille suffisante (ex: 50 dernières courses) pour avoir un graphe pertinent
        const historyRes = await api.get('/api/v1/trips/enriched-history?page=0&size=50', { headers });
        
        // 2. Récupération des avis (pour la distribution des notes)
        const reviewsRes = await api.get('/api/v1/reviews/me', { headers });

        const history: EnrichedRide[] = historyRes.data;
        const reviews: Review[] = reviewsRes.data;

        // --- TRAITEMENT DES DONNÉES REVENUS ---
        // On ne garde que les courses terminées
        const completedRides = history.filter(r => r.state === 'COMPLETED');
        
        // On regroupe par jour
        const groupedEarnings = completedRides.reduce((acc: any, ride) => {
          const dateKey = format(parseISO(ride.createdAt), 'dd MMM', { locale: fr });
          if (!acc[dateKey]) acc[dateKey] = { date: dateKey, amount: 0, count: 0 };
          acc[dateKey].amount += ride.price;
          acc[dateKey].count += 1;
          return acc;
        }, {});

        // On convertit en tableau et on inverse pour avoir l'ordre chronologique (si l'API renvoie le plus récent en premier)
        const chartData = Object.values(groupedEarnings).reverse();
        setEarningsData(chartData);

        // --- TRAITEMENT DES DONNÉES AVIS ---
        const ratingsCount = [0, 0, 0, 0, 0]; // Index 0 = 1 étoile, Index 4 = 5 étoiles
        reviews.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) {
            ratingsCount[r.rating - 1]++;
          }
        });

        const chartReviews = ratingsCount.map((count, index) => ({
          stars: `${index + 1} ★`,
          count: count
        }));
        setReviewsData(chartReviews);

      } catch (err) {
        console.error(err);
        setError("Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-orange-btn/50 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Chargement des données live...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4">
        <AlertCircle size={24} />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  // Si aucune donnée réelle trouvée
  if (earningsData.length === 0 && reviewsData.every((d: any) => d.count === 0)) {
    return (
      <div className="w-full p-8 rounded-[32px] glass text-center border-none bg-background/40">
        <p className="text-foreground/40 font-black uppercase tracking-widest">Aucune donnée d&apos;activité disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
      
      {/* GRAPHIQUE 1 : REVENUS */}
      <div className="lg:col-span-2 glass p-6 border-none bg-background/40 shadow-xl rounded-[32px] border border-white/10 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-btn" />
              Revenus
            </h3>
            <p className="text-[10px] font-bold opacity-40 uppercase">Basé sur vos courses terminées</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-orange-btn/10 text-orange-btn text-[10px] font-black uppercase">
            7 derniers jours
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earningsData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF8C00" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF8C00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 10, fontWeight: 800 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 10, fontWeight: 800 }} 
                tickFormatter={(value) => `${value/1000}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                labelStyle={{ color: '#FF8C00', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}
                formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`, 'Revenu']}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#FF8C00" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIncome)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPHIQUE 2 : QUALITÉ / AVIS */}
      <div className="glass p-6 border-none bg-background/40 shadow-xl rounded-[32px] border border-white/10 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Award size={20} className="text-blue-500" />
              Qualité
            </h3>
            <p className="text-[10px] font-bold opacity-40 uppercase">Distribution des avis</p>
          </div>
        </div>

        <div className="h-[250px] w-full flex items-center justify-center">
          {reviewsData.every((d: any) => d.count === 0) ? (
            <div className="text-center opacity-40">
                <p className="text-xs font-bold">Pas encore d&apos;avis</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="stars" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontWeight: 800, fontSize: 12 }}
                  width={30}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none' }}
                  labelStyle={{ display: 'none' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                  {reviewsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 4 ? '#22c55e' : index === 3 ? '#3b82f6' : '#FF8C00'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};