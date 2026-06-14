"use client"
import React from 'react';
import { Banknote, ShieldCheck, Clock } from 'lucide-react';

export const Features = () => {
  const data = [
    { title: "Prix Négociable", desc: "Vous proposez un tarif. Le chauffeur accepte ou contre-propose.", icon: <Banknote size={32}/> },
    { title: "Sécurité Totale", desc: "Suivi GPS en temps réel et chauffeurs vérifiés par CNI.", icon: <ShieldCheck size={32}/> },
    { title: "Rapidité", desc: "Un chauffeur devant votre porte en moins de 5 minutes.", icon: <Clock size={32}/> },
  ];

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-orange-btn font-black tracking-[0.3em] text-xs uppercase mb-4 text-orange-btn">Pourquoi nous choisir ?</h2>
        <p className="text-4xl font-black text-foreground">La révolution du transport urbain</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-foreground">
        {data.map((f, i) => (
          <div key={i} className="glass p-10 border-none shadow-lg hover:bg-orange-btn/5 transition-colors group bg-background/50">
            <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center text-orange-btn mb-6 group-hover:scale-110 transition-transform">
              {f.icon}
            </div>
            <h3 className="text-xl font-black mb-3">{f.title}</h3>
            <p className="opacity-60 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};