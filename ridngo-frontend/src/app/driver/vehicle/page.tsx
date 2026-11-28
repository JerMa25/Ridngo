/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { 
  Car, Loader2, ClipboardList, Cog, Gauge, 
  ShieldCheck, Fuel, Users, Camera, Edit3, 
  Save, X, Plus, Trash2, Image as ImageIcon,
  Calendar, Wifi, Wind, MapPin, HardDrive, 
  ShieldAlert, Info, Check, Dog, Monitor
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { tr } from '@/lib/i18n';

export default function MyVehiclePage() {
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  // État pour le formulaire de modification (PATCH)
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await api.get('/api/v1/vehicles/me');
      setVehicle(res.data);
      setEditForm(res.data);
    } catch (e) {
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handlePatchVehicle = async () => {
    if (!vehicle?.id) return;
    setUpdateLoading(true);
    
    try {
      // CONSTRUCTION DU PAYLOAD STRICT (Évite l'erreur 400 en filtrant les champs)
      // On ne prend que ce qui est défini dans le UpdateVehicleDto du Swagger
      const brand = String(editForm.brand || '').trim();
      const seats = Number(editForm.totalSeatNumber);
      if (!brand) { toast.error(tr("Indiquez la marque du véhicule.")); return; }
      if (!Number.isInteger(seats) || seats < 1 || seats > 60) { toast.error(tr("Nombre de places invalide (1 à 60).")); return; }
      const numbers = ['tankCapacity', 'luggageMaxCapacity', 'averageFuelConsumptionPerKm', 'vehicleAgeAtStart', 'mileageSinceCommissioning'];
      const bad = numbers.find(k => editForm[k] !== undefined && editForm[k] !== '' && (!Number.isFinite(Number(editForm[k])) || Number(editForm[k]) < 0));
      if (bad) { toast.error(tr("Les valeurs numériques doivent être positives.")); return; }

      // Champs non envoyés = laissés tels quels côté backend (null = pas de modification)
      const payload = {
        makeName: brand, // le backend range la marque dans makeName
        vehicleSerialNumber: editForm.vehicleSerialNumber || undefined,
        tankCapacity: Number(editForm.tankCapacity || 0),
        luggageMaxCapacity: Number(editForm.luggageMaxCapacity || 0),
        totalSeatNumber: seats,
        averageFuelConsumptionPerKm: Number(editForm.averageFuelConsumptionPerKm || 0),
        mileageSinceCommissioning: Number(editForm.mileageSinceCommissioning || 0),
        vehicleAgeAtStart: Number(editForm.vehicleAgeAtStart || 0),
        // Booléens
        airConditioned: !!editForm.airConditioned,
        comfortable: !!editForm.comfortable,
        soft: !!editForm.soft,
        screen: !!editForm.screen,
        wifi: !!editForm.wifi,
        tollCharge: !!editForm.tollCharge,
        carParking: !!editForm.carParking,
        alarm: !!editForm.alarm,
        stateTax: !!editForm.stateTax,
        driverAllowance: !!editForm.driverAllowance,
        pickupAndDrop: !!editForm.pickupAndDrop,
        internet: !!editForm.internet,
        petsAllow: !!editForm.petsAllow
      };

      // Suppression des champs undefined pour être propre
      Object.keys(payload).forEach(key => 
        (payload as any)[key] === undefined && delete (payload as any)[key]
      );

      await api.patch(`/api/v1/vehicles/${vehicle.id}`, payload);
      
      await fetchVehicle();
      setIsEditing(false);
      toast.success(tr("Véhicule mis à jour !"));
    } catch (e: any) {
      toast.error(e.response?.data?.detail || e.response?.data?.message || tr("Mise à jour impossible : vérifiez les champs."));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUpdateLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', e.target.files[0]);
      await api.post(`/api/v1/vehicles/${vehicle.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchVehicle();
    } catch (e) {
      toast.error(tr("Erreur lors de l'upload"));
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) return (
    <div className="h-app flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{tr("Accès au garage...")}</p>
    </div>
  );

  return (
      <>
    <main className="max-w-6xl mx-auto p-4 md:p-12 space-y-10 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-5xl font-black tracking-tighter italic">{tr("Mon Véhicule")}</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mt-2">{tr("Gestion des paramètres et services")}</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <button
              onClick={handlePatchVehicle}
              disabled={updateLoading}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-green-600 text-white shadow-xl disabled:opacity-60"
            >
              {updateLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} {tr(" Enregistrer")}</button>
          ) : (
            <button
              onClick={() => {
                if (vehicle) setIsEditing(true);
                else setShowRegisterPrompt(true);
              }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-orange-btn text-white shadow-xl"
            >
              <Edit3 size={16}/> {tr(" Modifier mon véhicule")}</button>
          )}
          {isEditing && (
            <button onClick={() => { setIsEditing(false); setEditForm(vehicle); }} aria-label={tr("Annuler les modifications")} className="p-4 bg-foreground/5 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {!vehicle ? (
        <div className="glass p-20 text-center bg-background border-none shadow-2xl rounded-[48px] flex flex-col items-center">
          <div className="w-24 h-24 bg-orange-btn/10 text-orange-btn rounded-[40px] flex items-center justify-center mb-8"><Car size={48} /></div>
          <h2 className="text-3xl font-black mb-4">{tr("Garage vide")}</h2>
          <Link href="/driver/onboarding" className="bg-orange-btn text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl">{tr("Enregistrer un véhicule")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLONNE GAUCHE */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 border-none bg-background shadow-xl rounded-[40px] text-center relative overflow-hidden">
               <div className="absolute top-4 right-4 text-green-500"><ShieldCheck size={24} /></div>
               <div className="w-24 h-24 bg-foreground/5 rounded-[32px] flex items-center justify-center text-orange-btn mx-auto mb-6 shadow-inner"><Car size={48} /></div>
               {isEditing ? (
                 <input name="brand" className="input-edit text-center" value={editForm.brand} onChange={handleInputChange} />
               ) : (
                 <h2 className="text-3xl font-black tracking-tight">{vehicle.brand}</h2>
               )}
               <p className="text-sm font-bold opacity-40 uppercase tracking-widest mt-1">{vehicle.registrationNumber}</p>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">{tr("Documents")}</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="group relative aspect-video rounded-3xl overflow-hidden bg-foreground/5">
                     <img src={vehicle.registrationPhoto} className="w-full h-full object-cover" alt={tr("Grise")} />
                  </div>
                  <div className="group relative aspect-video rounded-3xl overflow-hidden bg-foreground/5">
                     <img src={vehicle.vehicleSerialPhoto} className="w-full h-full object-cover" alt="VIN" />
                  </div>
               </div>
            </div>
          </div>

          {/* COLONNE DROITE */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* GRILLE TECHNIQUE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {[
                 { label: tr("VIN / Châssis"), value: vehicle.vehicleSerialNumber, icon: <ClipboardList size={18}/>, key: 'vehicleSerialNumber', editable: true },
                 { label: tr("Réservoir (L)"), value: vehicle.tankCapacity, icon: <Fuel size={18}/>, key: 'tankCapacity', editable: true, type: 'number' },
                 { label: tr("Places"), value: vehicle.totalSeatNumber, icon: <Users size={18}/>, key: 'totalSeatNumber', editable: true, type: 'number' },
                 { label: tr("Coffre (L)"), value: vehicle.luggageMaxCapacity, icon: <ImageIcon size={18}/>, key: 'luggageMaxCapacity', editable: true, type: 'number' },
                 { label: tr("Conso (L/km)"), value: vehicle.averageFuelConsumptionPerKm, icon: <Gauge size={18}/>, key: 'averageFuelConsumptionPerKm', editable: true, type: 'number' },
                 { label: tr("Âge (ans)"), value: vehicle.vehicleAgeAtStart, icon: <Calendar size={18}/>, key: 'vehicleAgeAtStart', editable: true, type: 'number' },
                 { label: tr("Kilométrage"), value: vehicle.mileageSinceCommissioning, icon: <HardDrive size={18}/>, key: 'mileageSinceCommissioning', editable: true, type: 'number' },
               ].map((item, i) => (
                 <div key={i} className="glass p-5 border-none bg-background shadow-lg rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-foreground/5 rounded-2xl text-orange-btn">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-30">{item.label}</p>
                       {isEditing && item.editable ? (
                         <input 
                           name={item.key}
                           type={item.type || 'text'} 
                           className="bg-transparent font-black text-sm w-full outline-none text-orange-btn border-b border-orange-btn/20" 
                           value={editForm[item.key] ?? ""} 
                           onChange={handleInputChange}
                         />
                       ) : (
                         <p className="text-sm font-black truncate">{item.value}</p>
                       )}
                    </div>
                 </div>
               ))}
            </div>

            {/* SECTION SERVICES & OPTIONS (CHECKBOXES) */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">{tr("Confort & Services embarqués")}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                        { key: 'airConditioned', label: tr("Climatisation"), icon: <Wind size={16}/> },
                        { key: 'wifi', label: tr("WiFi Gratuit"), icon: <Wifi size={16}/> },
                        { key: 'screen', label: tr("Écran / TV"), icon: <Monitor size={16}/> },
                        { key: 'petsAllow', label: tr("Animaux"), icon: <Dog size={16}/> },
                        { key: 'tollCharge', label: tr("Péage Inclus"), icon: <MapPin size={16}/> },
                        { key: 'carParking', label: tr("Parking"), icon: <Info size={16}/> },
                        { key: 'alarm', label: tr("Alarme"), icon: <ShieldAlert size={16}/> },
                        { key: 'pickupAndDrop', label: tr("Porte à Porte"), icon: <Car size={16}/> },
                    ].map((opt) => (
                        <label key={opt.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${editForm[opt.key] ? 'border-orange-btn bg-orange-btn/5' : 'border-foreground/5 bg-foreground/[0.02]'} ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`${editForm[opt.key] ? 'text-orange-btn' : 'opacity-30'}`}>{opt.icon}</div>
                                <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                            </div>
                            {isEditing ? (
                                <input 
                                    type="checkbox" 
                                    name={opt.key} 
                                    checked={editForm[opt.key]} 
                                    onChange={handleInputChange} 
                                    className="w-4 h-4 accent-orange-btn" 
                                />
                            ) : (
                                editForm[opt.key] && <Check size={14} className="text-orange-btn" />
                            )}
                        </label>
                    ))}
                </div>
            </div>

            {/* GALERIE */}
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">{tr("Galerie Photos")}</h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-foreground text-background px-4 py-2 rounded-xl font-black text-[10px] uppercase">
                     <Plus size={14}/> {tr(" Ajouter")}<input type="file" hidden accept="image/*" onChange={handleUploadGallery} />
                  </label>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {vehicle.illustrationImages?.map((url: string, i: number) => (
                    <div key={i} className="group relative aspect-square rounded-[32px] overflow-hidden bg-foreground/5">
                       <img src={url} className="w-full h-full object-cover" alt={tr("Illustr")} />
                       {isEditing && (
                           <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                               <Trash2 size={24} className="text-white" />
                           </div>
                       )}
                    </div>
                  ))}
               </div>
            </div>

          </div>
        </div>
      )}

      <style jsx>{`
        .input-edit {
          background: rgba(255, 140, 0, 0.1);
          border: 1px solid #FF8C00;
          border-radius: 0.75rem;
          padding: 0.5rem;
          font-weight: 900;
          font-size: 1.5rem;
          width: 100%;
          outline: none;
          color: var(--foreground);
        }
      `}</style>
    </main>

    {/* Modal prompt when trying to edit but no vehicle */}
    {showRegisterPrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center">
          <h3 className="text-2xl font-black mb-4">{tr("Aucun véhicule enregistré")}</h3>
          <p className="mb-6">{tr("Vous n'avez pas encore enregistré de véhicule. Enregistrez-en un pour pouvoir le modifier.")}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/driver/onboarding" className="px-6 py-3 bg-orange-btn text-white rounded-xl font-black">{tr("Enregistrer")}</Link>
            <button onClick={() => setShowRegisterPrompt(false)} className="px-6 py-3 bg-foreground rounded-xl font-black">{tr("Retour")}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}