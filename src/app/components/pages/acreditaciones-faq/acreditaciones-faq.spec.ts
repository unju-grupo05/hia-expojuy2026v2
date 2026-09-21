import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcreditacionesFaq } from './acreditaciones-faq';

describe('AcreditacionesFaq', () => {
  let component: AcreditacionesFaq;
  let fixture: ComponentFixture<AcreditacionesFaq>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcreditacionesFaq],
    }).compileComponents();

    fixture = TestBed.createComponent(AcreditacionesFaq);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
