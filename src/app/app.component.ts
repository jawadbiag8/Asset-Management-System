import { Component, OnInit } from '@angular/core';
// import { UtilsService } from './services/utils.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false,
})
export class AppComponent implements OnInit {
  title = 'asset-management-system';

  // constructor(public utilsService: UtilsService) {  }

  ngOnInit() {
    // const env = this.utilsService.getEnvironment();
    // console.log('Environment:', env);
  }

}
