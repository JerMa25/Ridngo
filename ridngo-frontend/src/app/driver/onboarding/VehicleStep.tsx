/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { api, vehicleApi } from '@/lib/api-client';
import { 
  ShieldCheck, FileText, ClipboardList, 
  Gauge, Cog, ChevronRight, Loader2, 
  Plus, Trash2, Image as ImageIcon, Sparkles, 
} from 'lucide-react';
import toast from 'react-hot-toast';

const FALLBACK_OPTIONS = {
  makes: [{ vehicleMakeId: '1', makeName: 'Toyota' }, { vehicleMakeId: '2', makeName: 'Mercedes' }],
  models: [{ vehicleModelId: '1', modelName: 'Corolla' }, { vehicleModelId: '2', modelName: 'Yaris' }],
  transmissions: [{ transmissionTypeId: '1', typeName: 'Manual' }, { transmissionTypeId: '2', typeName: 'Automatic' }],
  fuels: [{ fuelTypeId: '1', fuelTypeName: 'Petrol' }, { fuelTypeId: '2', fuelTypeName: 'Diesel' }],
  types: [{ vehicleTypeId: '1', typeName: 'Sedan' }, { vehicleTypeId: '2', typeName: 'SUV' }],
  sizes: [{ vehicleSizeId: '1', sizeName: 'Medium' }, { vehicleSizeId: '2', sizeName: 'Large' }],
  manufacturers: [{ manufacturerId: '1', manufacturerName: 'Toyota Plant' }]
};

export default function VehicleStep({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [serialFile, setSerialFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const [options, setOptions] = useState<any>({ 
    makes: [], models: [], transmissions: [], manufacturers: [], sizes: [], types: [], fuels: [] 
  });

  const [form, setForm] = useState({
    licenseNumber: '',
    vehicle: {
      registrationNumber: '',
      tankCapacity: 50,
      typeName: '',
      mileageAtStart: 0,
      mileageSinceCommissioning: 0,
      luggageMaxCapacity: 400,
      vehicleSerialNumber: '',
      sizeName: '',
      totalSeatNumber: 4,
      modelName: '',
      averageFuelConsumptionPerKm: 0.08,
      makeName: '',
      fuelTypeName: '',
      manufacturerName: '',
      vehicleAgeAtStart: 0,
      transmissionType: '',
      // Nouveaux attributs de confort et services
      airConditioned: false,
      comfortable: true,
      soft: false,
      screen: false,
      wifi: false,
      tollCharge: false,
      carParking: false,
      alarm: false,
      stateTax: false,
      driverAllowance: false,
      pickupAndDrop: false,
      internet: false,
      petsAllow: false
    }
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [mks, mds, trans, man, siz, typ, fls] = await Promise.all([
          vehicleApi.get('/vehicles/lookup/vehicle-makes'),
          vehicleApi.get('/vehicles/lookup/vehicle-models'),
          vehicleApi.get('/vehicles/lookup/transmission-types'),
          vehicleApi.get('/vehicles/lookup/manufacturers'),
          vehicleApi.get('/vehicles/lookup/vehicle-sizes'),
          vehicleApi.get('/vehicles/lookup/vehicle-types'),
          vehicleApi.get('/vehicles/lookup/fuel-types'),
        ]);
        setOptions({
          makes: mks.data, models: mds.data, transmissions: trans.data,
          manufacturers: man.data, sizes: siz.data, types: typ.data, fuels: fls.data
        });
      } catch { 
        setOptions(FALLBACK_OPTIONS);
      } finally { setFetching(false); }
    };
    load();
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    
    // Gestion spécifique des types pour éviter les erreurs de validation backend
    let val: any;
    if (type === 'checkbox') {
        val = checked;
    } else if (type === 'number') {
        val = value === "" ? 0 : parseFloat(value);
    } else {
        val = value;
    }

    if (name === 'licenseNumber') {
      setForm(prev => ({ ...prev, licenseNumber: value }));
    } else {
      setForm(prev => ({ ...prev, vehicle: { ...prev.vehicle, [name]: val } }));
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setGalleryFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeGalleryFile = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationFile || !serialFile) return alert("Photos justificatives manquantes.");
    
    setLoading(true);
    try {
      const fd = new FormData();
      const payload = {
        licenseNumber: form.licenseNumber,
        vehicle: {
          ...form.vehicle,
          tankCapacity: Number(form.vehicle.tankCapacity),
          totalSeatNumber: Number(form.vehicle.totalSeatNumber),
          luggageMaxCapacity: Number(form.vehicle.luggageMaxCapacity),
          averageFuelConsumptionPerKm: Number(form.vehicle.averageFuelConsumptionPerKm),
          vehicleAgeAtStart: Number(form.vehicle.vehicleAgeAtStart),
          mileageAtStart: Number(form.vehicle.mileageAtStart),
          mileageSinceCommissioning: Number(form.vehicle.mileageSinceCommissioning),
        }
      };

      fd.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      fd.append('registrationPhoto', registrationFile);
      fd.append('serialPhoto', serialFile);

      // 1. Appel principal vers /api/v1/users/driver
      const res = await api.post('/api/v1/users/driver', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const vehicleId = res.data.vehicle?.id;

      // 2. Upload de la galerie photos
      if (galleryFiles.length > 0 && vehicleId) {
        for (const file of galleryFiles) {
          const imgFd = new FormData();
          imgFd.append('file', file);
          await api.post(`/api/v1/vehicles/${vehicleId}/images`, imgFd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      onComplete();
    } catch (err: any) {
    {/*}    console.error("Erreur détaillée:", err.response?.data);
        alert("Erreur: " + (err.response?.data?.message || "Vérifiez les données du véhicule"));
        setErrorStatus(err.response?.status || 500);
    } finally {
        setLoading(false);
    }*/}
    console.error("ERREUR COMPLÈTE :", err);

    console.log("status :", err.response?.status);
    console.log("data :", err.response?.data);

    toast.error(JSON.stringify(err.response?.data, null, 2));

    setErrorStatus(err.response?.status || 500);
}
  };

  if (fetching) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-btn" size={40} /></div>;

  return (
     <div className="space-y-6">
      <form onSubmit={onSubmit} className="glass p-8 md:p-12 border-none shadow-2xl bg-background space-y-12">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter">Étape 1 : Le Véhicule</h1>
            <p className="opacity-50 font-medium italic">Enregistrez vos documents et personnalisez vos services.</p>
        </div>

        {/* SECTION 1: IDENTITÉ */}
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-btn border-b border-orange-btn/10 pb-2">
              <ClipboardList size={18}/><h2 className="font-black uppercase text-xs tracking-widest">Identité du véhicule</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="label-v">Numéro de Permis</label>
                <input required name="licenseNumber" className="input-v" placeholder="N° Permis" onChange={handleInputChange} />
              </div>
              <div className="space-y-1">
                <label className="label-v">Immatriculation</label>
                <input required name="registrationNumber" className="input-v" placeholder="Ex: LT-000-AA" onChange={handleInputChange} />
              </div>
              <div className="space-y-1">
                <label className="label-v">Numéro de Série (VIN)</label>
                <input required name="vehicleSerialNumber" className="input-v" placeholder="N° Série (VIN)" onChange={handleInputChange} />
              </div>
            </div>
        </section>

        {/* SECTION 2: RÉFÉRENTIEL */}
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-btn border-b border-orange-btn/10 pb-2">
              <Cog size={18}/><h2 className="font-black uppercase text-xs tracking-widest">Spécifications techniques</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="label-v">Marque</label>
                <select required name="makeName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.makes.map((o: any) => <option key={o.vehicleMakeId || o.id} value={o.makeName} className="opt-v">{o.makeName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Modèle</label>
                <select required name="modelName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.models.map((o: any) => <option key={o.vehicleModelId || o.id} value={o.modelName} className="opt-v">{o.modelName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Constructeur</label>
                <select required name="manufacturerName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.manufacturers.map((o: any) => <option key={o.manufacturerId || o.id} value={o.manufacturerName} className="opt-v">{o.manufacturerName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Transmission</label>
                <select required name="transmissionType" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.transmissions.map((o: any) => <option key={o.transmissionTypeId || o.id} value={o.typeName} className="opt-v">{o.typeName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Carburant</label>
                <select required name="fuelTypeName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.fuels.map((o: any) => <option key={o.fuelTypeId || o.id} value={o.fuelTypeName} className="opt-v">{o.fuelTypeName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Usage véhicule</label>
                <select required name="typeName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.types.map((o: any) => <option key={o.vehicleTypeId || o.id} value={o.typeName} className="opt-v">{o.typeName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-v">Gabarit</label>
                <select required name="sizeName" className="input-v" onChange={handleInputChange}>
                    <option value="" className="opt-v">Sélectionner</option>
                    {options.sizes.map((o: any) => <option key={o.vehicleSizeId || o.id} value={o.sizeName} className="opt-v">{o.sizeName}</option>)}
                </select>
              </div>
            </div>
        </section>

        {/* NOUVELLE SECTION: CONFORT & SERVICES */}
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-btn border-b border-orange-btn/10 pb-2">
              <Sparkles size={18}/><h2 className="font-black uppercase text-xs tracking-widest">Options de confort & Services</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { id: 'airConditioned', label: 'Climatisation' },
                    { id: 'wifi', label: 'Wi-Fi gratuit' },
                    { id: 'screen', label: 'Écran Vidéo' },
                    { id: 'soft', label: 'Sièges souples' },
                    { id: 'comfortable', label: 'Confort Premium' },
                    { id: 'internet', label: 'Internet' },
                    { id: 'petsAllow', label: 'Animaux admis' },
                    { id: 'pickupAndDrop', label: 'Porte à porte' },
                    { id: 'tollCharge', label: 'Péages inclus' },
                    { id: 'carParking', label: 'Parking inclus' },
                    { id: 'alarm', label: 'Système Alarme' },
                    { id: 'stateTax', label: 'Taxes incluses' },
                    { id: 'driverAllowance', label: 'Frais chauffeur' },
                ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-3 p-4 bg-foreground/5 rounded-2xl cursor-pointer hover:bg-orange-btn/5 transition-colors border border-transparent hover:border-orange-btn/20">
                        <input 
                            type="checkbox" 
                            name={opt.id} 
                            checked={(form.vehicle as any)[opt.id]} 
                            onChange={handleInputChange}
                            className="w-5 h-5 accent-orange-btn"
                        />
                        <span className="text-[11px] font-bold uppercase tracking-tight opacity-70">{opt.label}</span>
                    </label>
                ))}
            </div>
        </section>

        {/* SECTION 3: TECH */}
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-btn border-b border-orange-btn/10 pb-2">
              <Gauge size={18}/><h2 className="font-black uppercase text-xs tracking-widest">Performances</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="label-v">Capacité Réservoir (L)</label>
                <input type="number" name="tankCapacity" placeholder="Ex: 50" className="input-v" onChange={handleInputChange} value={form.vehicle.tankCapacity} />
              </div>
              <div className="space-y-1">
                <label className="label-v">Kilométrage Actuel</label>
                <input type="number" name="mileageSinceCommissioning" placeholder="Ex: 12000" className="input-v" onChange={handleInputChange} value={form.vehicle.mileageSinceCommissioning} />
              </div>
              <div className="space-y-1">
                <label className="label-v">Nombre de Places</label>
                <input type="number" name="totalSeatNumber" placeholder="Ex: 4" className="input-v" onChange={handleInputChange} value={form.vehicle.totalSeatNumber} />
              </div>
              <div className="space-y-1">
                <label className="label-v">Consommation (L/km)</label>
                <input type="number" step="0.01" name="averageFuelConsumptionPerKm" placeholder="Ex: 0.08" className="input-v" onChange={handleInputChange} value={form.vehicle.averageFuelConsumptionPerKm} />
              </div>
            </div>
        </section>

        {/* SECTION 4: MÉDIAS OBLIGATOIRES */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-8 cursor-pointer transition-all ${registrationFile ? 'border-green-500 bg-green-500/5' : 'border-foreground/10 hover:border-orange-btn'}`}>
              <FileText className={registrationFile ? 'text-green-500' : 'opacity-20'} />
              <span className="text-[10px] font-black mt-2 uppercase text-center">{registrationFile ? registrationFile.name : "Scanner Carte Grise"}</span>
              <input type="file" hidden accept="image/*" onChange={e => setRegistrationFile(e.target.files?.[0] || null)} />
            </label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-8 cursor-pointer transition-all ${serialFile ? 'border-green-500 bg-green-500/5' : 'border-foreground/10 hover:border-orange-btn'}`}>
              <ShieldCheck className={serialFile ? 'text-green-500' : 'opacity-20'} />
              <span className="text-[10px] font-black mt-2 uppercase text-center">{serialFile ? serialFile.name : "Photo N° Série (VIN)"}</span>
              <input type="file" hidden accept="image/*" onChange={e => setSerialFile(e.target.files?.[0] || null)} />
            </label>
        </section>

        {/* SECTION 5: GALERIE PHOTOS */}
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-btn border-b border-orange-btn/10 pb-2">
              <ImageIcon size={18}/><h2 className="font-black uppercase text-xs tracking-widest">Galerie d&apos;illustrations</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {galleryFiles.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group shadow-md border border-foreground/5">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removeGalleryFile(index)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Trash2 size={24}/>
                  </button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed border-foreground/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-orange-btn/5 transition-colors group">
                <Plus className="text-foreground/20 group-hover:text-orange-btn transition-colors" />
                <span className="text-[8px] font-black uppercase mt-1 opacity-20 group-hover:opacity-100">Ajouter</span>
                <input type="file" hidden multiple accept="image/*" onChange={handleGalleryChange} />
              </label>
            </div>
        </section>

        <button disabled={loading} type="submit" className="w-full bg-orange-btn text-white py-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <>Confirmer l&apos;inscription véhicule <ChevronRight /></>}
        </button>

        <style jsx>{`
          .input-v { 
            width: 100%; 
            /* Utilisation d'une couleur solide en fond pour éviter la transparence des items */
            background-color: rgba(128, 128, 128, 0.1); 
            color: var(--foreground); 
            border: 1px solid var(--glass-border); 
            padding: 1rem 2.5rem 1rem 1rem; 
            border-radius: 1rem; 
            outline: none; 
            font-weight: 700; 
            transition: all 0.2s; 
            
            /* Correction visibilité Flèche et Items */
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FF8C00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            background-size: 1.25rem;
          }

          .input-v:focus { 
            border-color: #FF8C00; 
            background-color: var(--background); 
          }

          /* Force la visibilité des options dans la liste déroulante (Dark Mode) */
          .input-v option {
            background-color: var(--background); /* Utilise la variable définie dans globals.css */
            color: var(--foreground);
            font-weight: 600;
          }

          /* Fallback spécifique pour Chrome/Safari si les variables ne passent pas dans l'UI native */
          :global(.dark) .input-v option {
            background-color: #1B263B; /* Bleu nuit direct */
            color: #FAF3DD;
          }

          .label-v { 
            font-size: 10px; 
            font-weight: 900; 
            text-transform: uppercase; 
            opacity: 0.4; 
            margin-left: 0.5rem; 
            display: block; 
            margin-bottom: 0.25rem; 
          }
        `}</style>
      </form>
    </div>
  );
}