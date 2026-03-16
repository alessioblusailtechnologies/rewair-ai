import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { WorkforceComponent } from './pages/workforce/workforce.component';
import { IntegrationsComponent } from './pages/integrations/integrations.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'workforce', component: WorkforceComponent },
  { path: 'integrations', component: IntegrationsComponent },
  { path: '**', redirectTo: 'dashboard' },
];
