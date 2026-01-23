import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReusableBreadcrumComponent } from './reusable-breadcrum.component';

describe('ReusableBreadcrumComponent', () => {
  let component: ReusableBreadcrumComponent;
  let fixture: ComponentFixture<ReusableBreadcrumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReusableBreadcrumComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReusableBreadcrumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
