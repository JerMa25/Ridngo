"use client"
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Role = 'ADMIN' | 'DRIVER' | 'PASSENGER';

/** Accueil de chaque profil. */
export const homeFor = (role?: Role) =>
  role === 'ADMIN' ? '/admin/dashboard' : role === 'DRIVER' ? '/driver/dashboard' : role === 'PASSENGER' ? '/ride' : '/';

const PUBLIC = ['/', '/login', '/register'];

/** Rôles autorisés par préfixe de route ; null = tout utilisateur connecté. */
export function allowedRoles(path: string): Role[] | null | 'public' {
  if (PUBLIC.includes(path)) return 'public';
  if (path.startsWith('/admin')) return ['ADMIN'];
  // un passager peut compléter son inscription chauffeur
  if (path.startsWith('/driver/onboarding')) return ['DRIVER', 'PASSENGER'];
  if (path.startsWith('/driver')) return ['DRIVER'];
  if (path.startsWith('/ride') || path.startsWith('/passenger') || path.startsWith('/offers')) return ['PASSENGER'];
  return null;
}

/** Garde unique : déconnecté → landing, chacun reste dans son espace, connecté → pas de page de connexion. */
export function RouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      let role: Role | undefined;
      try { role = JSON.parse(localStorage.getItem('user') || 'null')?.role; } catch { /* session illisible */ }
      const loggedIn = !!role && !!localStorage.getItem('accessToken');
      const rule = allowedRoles(pathname);

      if (rule === 'public') {
        if (loggedIn && (pathname === '/login' || pathname === '/register')) router.replace(homeFor(role));
        return;
      }
      if (!loggedIn) { router.replace('/'); return; }
      if (rule && !rule.includes(role!)) router.replace(homeFor(role));
    };
    check();
    // déconnexion dans un autre onglet, ou session expirée
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, [pathname, router]);

  return null;
}
