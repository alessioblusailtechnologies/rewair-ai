import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  DashboardBrowsingIcon, Task01Icon,
  UserGroupIcon, SecurityCheckIcon, ConnectIcon,
  CogIcon, AiBrain02Icon
} from '@hugeicons/core-free-icons';
import { OrderPollingService } from '../../services/order-polling.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, HugeiconsIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  navItems = [
    { route: '/dashboard', icon: DashboardBrowsingIcon, label: 'Home' },
    { route: '/orders', icon: Task01Icon, label: 'Ordini' },
    { route: '/workforce', icon: UserGroupIcon, label: 'Workforce' },
    { route: '/quality', icon: SecurityCheckIcon, label: 'Quality' },
  ];

  secondaryItems = [
    { route: '/agenti', icon: AiBrain02Icon, label: 'Agenti AI' },
    { route: '/integrations', icon: ConnectIcon, label: 'Integrazioni' },
    { route: '/settings', icon: CogIcon, label: 'Settings' },
  ];

  constructor(public polling: OrderPollingService) {}
}
