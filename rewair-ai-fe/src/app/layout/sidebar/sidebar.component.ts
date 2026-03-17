import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  FastWindIcon, DashboardBrowsingIcon, Task01Icon,
  UserGroupIcon, SecurityCheckIcon, ConnectIcon,
  CogIcon
} from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, HugeiconsIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  logoIcon = FastWindIcon;

  navItems = [
    { route: '/dashboard', icon: DashboardBrowsingIcon, label: 'Home' },
    { route: '/orders', icon: Task01Icon, label: 'Ordini' },
    { route: '/workforce', icon: UserGroupIcon, label: 'Workforce' },
    { route: '/quality', icon: SecurityCheckIcon, label: 'Quality' },
  ];

  secondaryItems = [
    { route: '/integrations', icon: ConnectIcon, label: 'Integrazioni' },
    { route: '/settings', icon: CogIcon, label: 'Settings' },
  ];
}
