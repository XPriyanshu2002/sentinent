import { Injectable } from '@angular/core';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PollingService {
  constructor(private api: ApiService) {}

  participantsStream(pollMs = 3000) {
    return interval(pollMs).pipe(
      startWith(0),
      switchMap(() => this.api.getParticipants())
    );
  }

  contactsStream(pollMs = 3000) {
    return interval(pollMs).pipe(
      startWith(0),
      switchMap(() => this.api.getContacts())
    );
  }
}
