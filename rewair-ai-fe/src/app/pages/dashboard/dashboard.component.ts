import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  kpis = [
    { icon: 'fas fa-clipboard-list', value: '24', label: 'Ordini Attivi', trend: '+12%', up: true },
    { icon: 'fas fa-box', value: '156', label: 'Kit Prodotti Oggi', trend: '+8%', up: true },
    { icon: 'fas fa-chart-line', value: '94.2%', label: 'Efficienza Linea', trend: '+2.1%', up: true },
    { icon: 'fas fa-star', value: '99.1%', label: 'Quality Score', trend: '-0.3%', up: false },
  ];
}
