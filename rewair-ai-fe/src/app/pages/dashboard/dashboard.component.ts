import { Component } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Task01Icon, Package01Icon, Chart01Icon, FallingStarIcon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  ArrowUpIcon = ArrowUp01Icon;
  ArrowDownIcon = ArrowDown01Icon;

  kpis = [
    { icon: Task01Icon, value: '24', label: 'Ordini Attivi', trend: '+12%', up: true },
    { icon: Package01Icon, value: '156', label: 'Kit Prodotti Oggi', trend: '+8%', up: true },
    { icon: Chart01Icon, value: '94.2%', label: 'Efficienza Linea', trend: '+2.1%', up: true },
    { icon: FallingStarIcon, value: '99.1%', label: 'Quality Score', trend: '-0.3%', up: false },
  ];
}
