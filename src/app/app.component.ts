import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UtilsService } from './services/utils.service';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [HeaderComponent, RouterOutlet],
})
export class AppComponent implements OnInit {
  title = 'asset-management-system';

  constructor(public utilsService: UtilsService) {}

  ngOnInit() {
    const env = this.utilsService.getEnvironment();
    console.log('Environment:', env);
  }
}
