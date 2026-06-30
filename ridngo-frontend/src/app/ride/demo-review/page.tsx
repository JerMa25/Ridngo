"use client"
import React, { useState } from 'react';
import { CheckCircle2, Star, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PAGE DE DÉMONSTRATION — Modale d'évaluation avec toggle anonyme
 * URL : /ride/demo-review
 * À supprimer en production
 */
export default function DemoReviewPage() {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-6">
      <div className="glass max-w-sm w-full p-8 rounded-[32px] border-none text-center">
        <h1 className="text-2xl font-black mb-2">Démo : Évaluation anonyme</h1>
        <p className="text-sm opacity-50 mb-6">Testez le toggle anonyme de la modale d&apos;évaluation</p>
        <button
          onClick={() => { setSubmitted(false); setAnonymous(false); setRating(5); setComment(''); setShowModal(true); }}
          className="w-full py-4 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest"
        >
          Ouvrir la modale d&apos;évaluation
        </button>
      </div>

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass max-w-sm w-full p-6 rounded-[24px] border-none"
        >
          <p className="text-xs font-black uppercase opacity-40 mb-3">Résultat envoyé au backend</p>
          <div className="space-y-2 text-sm font-bold">
            <div className="flex justify-between">
              <span className="opacity-50">Note :</span>
              <span>{'⭐'.repeat(rating)} ({rating}/5)</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-50">Commentaire :</span>
              <span className="text-right max-w-[60%] truncate">{comment || '(aucun)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-50">Anonyme :</span>
              <span className={anonymous ? 'text-orange-btn' : 'text-green-500'}>
                {anonymous ? '🎭 OUI — Le chauffeur verra "Anonyme"' : '👤 NON — Le chauffeur voit votre nom'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODALE */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-md w-full p-8 relative bg-background border-none text-center rounded-[40px] z-10 overflow-y-auto max-h-[90vh]"
            >
              <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-black mb-1">Trajet Terminé !</h2>
              <p className="text-sm opacity-50 mb-8">Comment s&apos;est passée votre course ?</p>

              {/* Étoiles */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star
                      size={32}
                      className={s <= rating ? 'fill-orange-btn text-orange-btn' : 'text-foreground/10'}
                    />
                  </button>
                ))}
              </div>

              {/* Commentaire */}
              <textarea
                placeholder="Un petit commentaire... (Optionnel)"
                className="w-full bg-foreground/5 p-4 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-orange-btn font-medium resize-none text-sm"
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />

              {/* ─── TOGGLE ANONYME ─── */}
              <button
                onClick={() => setAnonymous(!anonymous)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-6 transition-all duration-200 border-2 ${
                  anonymous
                    ? 'border-orange-btn/60 bg-orange-btn/10'
                    : 'border-foreground/10 bg-foreground/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      anonymous ? 'bg-orange-btn' : 'bg-foreground/10'
                    }`}
                  >
                    {anonymous
                      ? <EyeOff size={15} className="text-white" />
                      : <Eye size={15} className="text-foreground/50" />
                    }
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-xs font-black uppercase tracking-wider transition-colors ${
                        anonymous ? 'text-orange-btn' : 'text-foreground/60'
                      }`}
                    >
                      {anonymous ? 'Commentaire anonyme' : 'Envoyer avec mon nom'}
                    </p>
                    <p className="text-[10px] text-foreground/40 font-medium mt-0.5">
                      {anonymous
                        ? 'Le chauffeur verra "Anonyme" à la place de votre nom'
                        : 'Le chauffeur pourra voir votre nom'}
                    </p>
                  </div>
                </div>
                {/* Switch ON/OFF */}
                <div
                  className={`w-10 h-5 rounded-full relative transition-all duration-200 ${
                    anonymous ? 'bg-orange-btn' : 'bg-foreground/10'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                      anonymous ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>

              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-opacity"
              >
                Envoyer l&apos;évaluation
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
