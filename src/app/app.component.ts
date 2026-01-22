import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UtilsService } from './services/utils.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'asset-management-system';

  constructor(public utilsService: UtilsService) {  }

  ngOnInit() {
    const env = this.utilsService.getEnvironment();
    console.log('Environment:', env);
  }

}
