// import { Component, OnInit } from '@angular/core';
// import { FormGroup, FormControl, Validators } from '@angular/forms';
// import { PollingService } from '../services/polling.service';
// import { ApiService } from '../services/api.service';

// @Component({
//   selector: 'app-participants',
//   templateUrl: './participants.component.html',
//   styleUrls: ['./participants.component.scss']
// })
// export class ParticipantsComponent implements OnInit {
//   participants: any[] = [];
//   form = new FormGroup({
//     name: new FormControl('', Validators.required),
//     email: new FormControl(''),
//     role: new FormControl('')
//   });
//   loading = false;

//   constructor(private poll: PollingService, private api: ApiService) {}

//   ngOnInit() {
//     this.poll.participantsStream(3000).subscribe({
//       next: (data: any) => { if (Array.isArray(data)) this.participants = data; },
//       error: err => console.error('poll error', err)
//     });
//   }

//   submit() {
//     if (this.form.invalid) return;
//     this.loading = true;
//     this.api.addParticipant(this.form.value).subscribe({
//       next: () => {
//         this.form.reset();
//         this.loading = false;
//         // Polling will update the list automatically.
//       },
//       error: (err) => {
//         console.error('Add participant failed', err);
//         this.loading = false;
//       }
//     });
//   }
// }


import { Component, OnInit, OnDestroy } from '@angular/core';
import { PollingService } from '../services/polling.service';
import { ApiService } from '../services/api.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.scss']
})
export class ParticipantsComponent implements OnInit, OnDestroy {
  // canonical data from server
  participants: any[] = [];

  // for filtering and paging
  filtered: any[] = [];
  pagedItems: any[] = [];
  loading = true;

  // add form toggle + submit state
  showAddForm = false;
  submitting = false;

  // filters as FormControls (reactive)
  searchControl = new FormControl('');
  filterStatusControl = new FormControl(''); // reactive status filter
  filterRoleControl = new FormControl('');   // reactive role filter

  statusOptions = ['Active', 'On leave', 'Under review'];
  roleOptions = ['Participant', 'Manager', 'Caregiver', 'Dev', 'Tester'];

  // pagination
  page = 1;
  pageSize = 6;
  totalPages = 1;

  private destroy$ = new Subject<void>();

  // keep a normalized snapshot to compare polling results and avoid flicker
  private lastSnapshot = '';

  // reactive add form
  addForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.email]),
    role: new FormControl('Participant'),
    ndis: new FormControl('')
  });

  constructor(private poll: PollingService, private api: ApiService) {}

  ngOnInit() {
    // Start polling once
    this.poll.participantsStream(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.loading = false;
          const serverList = Array.isArray(data) ? data : [];
          this.applyServerUpdate(serverList);
        },
        error: () => { this.loading = false; }
      });

    // Wire up search/filter controls (debounce for search)
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.filterStatusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.filterRoleControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  /**
   * Called when polling returns new server data.
   * Only replace local participants if the normalized snapshot changed.
   */
  private applyServerUpdate(serverList: any[]) {
    const snapshot = this.normalizeAndStringify(serverList);
    if (snapshot === this.lastSnapshot) {
      // no changes — don't reassign, prevents visible flicker
      return;
    }
    this.lastSnapshot = snapshot;

    // set canonical data (server authoritative)
    this.participants = serverList.slice(); // shallow copy
    this.applyFilters();
  }

  /**
   * Normalize data for deterministic comparison.
   */
  private normalizeAndStringify(arr: any[]) {
    const normalized = (arr || []).map(item => ({
      id: item.id,
      name: item.name || '',
      email: item.email || '',
      role: item.role || '',
      status: item.status || '',
      createdAt: item.createdAt || ''
    })).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    return JSON.stringify(normalized);
  }

  applyFilters() {
    const q = (this.searchControl.value || '').toLowerCase().trim();
    const statusFilter = (this.filterStatusControl.value || '').trim();
    const roleFilter = (this.filterRoleControl.value || '').trim();

    this.filtered = this.participants.filter(p => {
      const matchesQ = !q
        || (p.name && p.name.toLowerCase().includes(q))
        || (p.email && p.email.toLowerCase().includes(q))
        || (p.ndis && String(p.ndis).toLowerCase().includes(q));

      const matchesStatus = !statusFilter || (p.status && p.status === statusFilter);
      const matchesRole = !roleFilter || (p.role && p.role === roleFilter);

      return matchesQ && matchesStatus && matchesRole;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    this.setPageItems();
  }

  setPageItems() {
    const start = (this.page - 1) * this.pageSize;
    this.pagedItems = this.filtered.slice(start, start + this.pageSize);
  }

  nextPage() { if (this.page < this.totalPages) { this.page++; this.setPageItems(); } }
  prevPage() { if (this.page > 1) { this.page--; this.setPageItems(); } }

  clearFilters() {
    // Reset reactive controls so their subscriptions trigger applyFilters()
    this.searchControl.setValue('');
    this.filterStatusControl.setValue('');
    this.filterRoleControl.setValue('');
    // reset page
    this.page = 1;
    this.applyFilters();
  }

  initials(name: string) {
    if (!name) return '';
    return name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
  }

  avatarColor(name = '') {
    const colors = ['#7c3aed','#0ea5a4','#f97316','#ef4444','#6b7280'];
    const n = (name || '').length;
    return colors[n % colors.length];
  }

  statusClass(status = '') {
    if (!status) return 'Active';
    return status.replace(/\s+/g,'');
  }

  // toggle add form
  openAdd() { this.showAddForm = true; }
  closeAdd() { this.showAddForm = false; this.addForm.reset({ role: 'Participant' }); }

  submitAdd() {
    if (this.addForm.invalid || this.submitting) return;
    this.submitting = true;

    const payload = {
      name: this.addForm.value.name,
      email: this.addForm.value.email,
      role: this.addForm.value.role,
      ndis: this.addForm.value.ndis
    };

    const tmpId = 'tmp-' + Date.now();
    const optimisticItem = {
      id: tmpId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      ndis: payload.ndis,
      status: 'Active',
      createdAt: new Date().toISOString(),
      _optimistic: true
    };

    this.participants.unshift(optimisticItem);
    this.applyFilters();

    this.api.addParticipant(payload)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (serverItem: any) => {
          const idx = this.participants.findIndex(p => p.id === tmpId);
          if (idx >= 0) {
            this.participants[idx] = { ...serverItem };
          } else {
            this.participants.unshift(serverItem);
          }
          this.lastSnapshot = this.normalizeAndStringify(this.participants);
          this.applyFilters();
          this.closeAdd();
        },
        error: (err) => {
          this.participants = this.participants.filter(p => p.id !== tmpId);
          this.applyFilters();
          console.error('Add failed', err);
          alert('Failed to add participant. Try again.');
        }
      });
  }

  onBulkAction() {}
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
