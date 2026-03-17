import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { WorkforceComponent } from './pages/workforce/workforce.component';
import { IntegrationsComponent } from './pages/integrations/integrations.component';
import { AgentiComponent } from './pages/agenti/agenti.component';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'workforce', component: WorkforceComponent },
  { path: 'quality', component: ComingSoonComponent },
  { path: 'agenti', component: AgentiComponent },
  { path: 'integrations', component: IntegrationsComponent },
  { path: 'settings', component: ComingSoonComponent },
  { path: '**', redirectTo: 'dashboard' },
];
