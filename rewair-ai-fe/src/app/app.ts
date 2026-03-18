import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { AiChatComponent } from './layout/ai-chat/ai-chat.component';
import { ToastComponent } from './layout/toast/toast.component';
import { OrderPollingService } from './services/order-polling.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, AiChatComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private orderPolling: OrderPollingService) {}

  ngOnInit() {
    this.orderPolling.start();
  }
}
