import { Injectable, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly loading = signal(false);
  private count = 0;

  show() { this.count++; this.loading.set(true); }
  hide() { this.count = Math.max(0, this.count - 1); if (this.count === 0) this.loading.set(false); }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoadingService);
  loader.show();
  return next(req).pipe(finalize(() => loader.hide()));
};
