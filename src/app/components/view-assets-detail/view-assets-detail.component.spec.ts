import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewAssetsDetailComponent } from './view-assets-detail.component';

describe('ViewAssetsDetailComponent', () => {
  let component: ViewAssetsDetailComponent;
  let fixture: ComponentFixture<ViewAssetsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewAssetsDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewAssetsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
