import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register/register').then((m) => m.Register),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/dashboard/pages/search-results/search-results').then(
            (m) => m.SearchResults,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/dashboard/pages/history-view/history-view').then((m) => m.HistoryView),
      },
      {
        path: 'playlist/:id',
        loadComponent: () =>
          import('./features/playlists/pages/playlist-detail/playlist-detail').then(
            (m) => m.PlaylistDetail,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
