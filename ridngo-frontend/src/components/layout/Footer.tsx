"use client"
import Link from 'next/link';
import { Mail, Phone, Globe, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="py-16 border-t border-foreground/5 bg-background text-foreground/60 font-medium px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* COLONNE 1 : CONTACT & DPO */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck size={20} className="text-orange-btn" />
            <h3 className="font-black uppercase text-xs tracking-widest text-foreground">Data Protection</h3>
          </div>
          <div className="space-y-4 text-sm">
            <p className="font-bold text-foreground">Yowyob Inc. Ltd – Data Protection Officer</p>
            <div className="space-y-2">
              <a href="mailto:info@yowyob.com" className="flex items-center gap-3 hover:text-orange-btn transition-colors">
                <Mail size={16} /> info@yowyob.com
              </a>
              <a href="mailto:privacy@yowyob.com" className="flex items-center gap-3 hover:text-orange-btn transition-colors">
                <Mail size={16} /> privacy@yowyob.com
              </a>
              <div className="flex items-start gap-3">
                <Phone size={16} className="mt-1" />
                <div className="flex flex-col">
                  <a href="tel:+237675518880" className="hover:text-orange-btn">+237 675 518 880</a>
                  <a href="tel:+237656168129" className="hover:text-orange-btn">+237 656 168 129</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE 2 : LIENS UTILES */}
        <div className="space-y-6">
          <h3 className="font-black uppercase text-xs tracking-widest text-foreground">À propos</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a href="https://yowyob.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-orange-btn transition-colors">
                <Globe size={14} /> About Yowyob
              </a>
            </li>
            <li>
              <a href="/policy/RidnGo_Privacy_Notice_bilingual_A4.pdf" download className="hover:text-orange-btn transition-colors">
                Politique de Confidentialité
              </a>
            </li>
            <li>
              <a href="/policy/RidnGo_General_Terms_of_Service_bilingual_A4.pdf" download className="hover:text-orange-btn transition-colors">
                Conditions Générales d&apos;Utilisation
              </a>
            </li>
            <li>
              <a href="/policy/RidnGo_Cookies_Ads_Notice_bilingual_A4.pdf" download className="hover:text-orange-btn transition-colors">
                Notice Cookies & Publicités
              </a>
            </li>
            <li>
              <a href="/policy/Yowyob_Legal Notice.pdf" download className="hover:text-orange-btn transition-colors">
                Mentions Légales
              </a>
            </li>
          </ul>
        </div>

        {/* COLONNE 3 : BRAND & COPYRIGHT */}
        <div className="flex flex-col items-center md:items-end justify-between space-y-8">
          <div className="flex items-center gap-2 text-3xl font-black tracking-tighter text-foreground">
            <span className="bg-orange-btn text-white px-2 rounded-lg italic">R</span>
            <span>RidnGo</span>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Africa&apos;s Freedom Move</p>
            <p className="text-[10px] leading-relaxed opacity-40 uppercase font-bold tracking-tighter">
              © 2026 Yowyob Inc. Ltd.<br />
              All rights reserved.
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
};