import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardkpiComponent } from './dashboardkpi.component';

describe('DashboardkpiComponent', () => {
  let component: DashboardkpiComponent;
  let fixture: ComponentFixture<DashboardkpiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardkpiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardkpiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
