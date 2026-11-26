"use client"
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPopup from '@/components/auth/AuthPopup';

function Register() {
  const driver = useSearchParams().get('role') === 'driver';
  return <AuthPopup mode="register" initialRole={driver ? 'RIDE_AND_GO_DRIVER' : 'RIDE_AND_GO_PASSENGER'} />;
}

export default function RegisterPage() {
  return <Suspense><Register /></Suspense>;
}
