import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  menuOpen = false;
  activeLink: string = 'dashboard'; // default active

  setActive(link: string) {
    this.activeLink = link;
  }
}
