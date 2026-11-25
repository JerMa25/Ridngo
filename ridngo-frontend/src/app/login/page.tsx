"use client"
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPopup from '@/components/auth/AuthPopup';

function Login() {
  const verify = useSearchParams().get('verify') === '1';
  return <AuthPopup mode="login" notice={verify ? "Compte créé ! Confirmez votre adresse via le lien reçu par email, puis connectez-vous." : ''} />;
}

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}
