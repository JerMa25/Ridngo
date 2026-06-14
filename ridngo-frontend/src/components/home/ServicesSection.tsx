"use client"
import { motion } from 'framer-motion';
import { Car, Bus, Key } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ServicesSection = ({ t }: { t: any }) => {
  // On utilise une vérification de sécurité pour éviter les crashs si t.services est manquant
  if (!t.services) return null;

  const services = [
    { title: t.services.urbanTitle, desc: t.services.urbanDesc, icon: <Car size={40}/> },
    { title: t.services.agencyTitle, desc: t.services.agencyDesc, icon: <Bus size={40}/> },
    { title: t.services.rentalTitle, desc: t.services.rentalDesc, icon: <Key size={40}/> }
  ];

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-foreground">
        <div className="space-y-4">
          <h2 className="text-orange-btn font-black tracking-[0.3em] text-sm uppercase">{t.services.tag}</h2>
          <p className="text-4xl md:text-5xl font-black">{t.services.title}</p>
        </div>
        <p className="opacity-50 max-w-sm font-medium">{t.services.desc}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service, i) => (
          <motion.div whileHover={{ y: -10 }} key={i} className="glass p-10 group border-none shadow-xl hover:shadow-orange-btn/5 transition-all text-foreground">
            <div className="mb-8 p-4 bg-orange-btn/10 rounded-3xl w-fit text-orange-btn group-hover:scale-110 transition-transform">{service.icon}</div>
            <h3 className="text-2xl font-black mb-4">{service.title}</h3>
            <p className="opacity-60 leading-relaxed font-medium">{service.desc}</p>
            <button className="mt-8 text-orange-btn font-black flex items-center gap-2 group-hover:gap-4 transition-all">{t.services.more} <span className="text-xl">→</span></button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};