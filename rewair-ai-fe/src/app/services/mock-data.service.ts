import { Injectable } from '@angular/core';
import { Sede } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class MockDataService {

  readonly sedi: Sede[] = [
    { name: 'Taranto', country: 'Italia', label: 'Stabilimento principale' },
    { name: 'Aalborg', country: 'Danimarca', label: 'Headquarters' },
    { name: 'Valencia', country: 'Spagna', label: 'Produzione' },
    { name: 'Poznań', country: 'Polonia', label: 'Produzione' },
    { name: 'Chennai', country: 'India', label: 'Produzione' },
  ];

  getSedi(): Sede[] {
    return this.sedi;
  }
}
