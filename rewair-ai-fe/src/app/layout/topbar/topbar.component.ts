import { Component, OnInit, OnDestroy } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Location01Icon, ArrowDown01Icon, CheckmarkBadge01Icon } from '@hugeicons/core-free-icons';
import { MockDataService } from '../../services/mock-data.service';
import { Sede } from '../../models/order.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  LocationIcon = Location01Icon;
  ArrowDownIcon = ArrowDown01Icon;
  CheckIcon = CheckmarkBadge01Icon;

  sedi: Sede[];
  currentSede: Sede;
  dropdownOpen = false;
  dateTime = '';
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private mockData: MockDataService) {
    this.sedi = this.mockData.getSedi();
    this.currentSede = this.sedi[0];
  }

  ngOnInit() {
    this.updateDateTime();
    this.timerInterval = setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }
  selectSede(sede: Sede) { this.currentSede = sede; this.dropdownOpen = false; }
  closeDropdown() { this.dropdownOpen = false; }

  private updateDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.dateTime = `${date}  ·  ${time}`;
  }
}
