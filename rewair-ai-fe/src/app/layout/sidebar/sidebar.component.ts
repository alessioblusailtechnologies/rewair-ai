import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  navItems = [
    { route: '/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { route: '/orders', icon: 'fas fa-clipboard-list', label: 'Ordini' },
    { route: '/workforce', icon: 'fas fa-users', label: 'Workforce' },
    { route: '/quality', icon: 'fas fa-shield-alt', label: 'Quality' },
  ];

  secondaryItems = [
    { route: '/reports', icon: 'fas fa-chart-bar', label: 'Report' },
    { route: '/settings', icon: 'fas fa-cog', label: 'Settings' },
  ];
}
