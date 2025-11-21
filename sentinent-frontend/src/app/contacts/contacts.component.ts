// import { Component, OnInit } from '@angular/core';
// import { FormGroup, FormControl, Validators } from '@angular/forms';
// import { PollingService } from '../services/polling.service';
// import { ApiService } from '../services/api.service';

// @Component({
//   selector: 'app-contacts',
//   templateUrl: './contacts.component.html',
//   styleUrls: ['./contacts.component.scss']
// })
// export class ContactsComponent implements OnInit {
//   contacts: any[] = [];
//   form = new FormGroup({
//     name: new FormControl('', Validators.required),
//     phone: new FormControl(''),
//     company: new FormControl('')
//   });
//   loading = false;

//   constructor(private poll: PollingService, private api: ApiService) {}

//   ngOnInit() {
//     this.poll.contactsStream(3000).subscribe({
//       next: (data: any) => { if (Array.isArray(data)) this.contacts = data; },
//       error: err => console.error('poll error', err)
//     });
//   }

//   submit() {
//     if (this.form.invalid) return;
//     this.loading = true;
//     this.api.addContact(this.form.value).subscribe({
//       next: () => {
//         this.form.reset();
//         this.loading = false;
//       },
//       error: (err) => { console.error('Add contact failed', err); this.loading = false; }
//     });
//   }
// }

import { Component, OnInit, OnDestroy } from '@angular/core';
import { PollingService } from '../services/polling.service';
import { ApiService } from '../services/api.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit, OnDestroy {
  // canonical server data
  contacts: any[] = [];

  // UI states
  filtered: any[] = [];
  pagedItems: any[] = [];
  loading = true;

  // add form UI
  showAddForm = false;
  submitting = false;

  // filters (reactive)
  searchControl = new FormControl('');
  filterStatusControl = new FormControl('');
  filterTypeControl = new FormControl('');

  statusOptions = ['Active', 'Prospect', 'Archived'];
  typeOptions = ['Customer', 'Vendor', 'Partner'];

  // pagination
  page = 1;
  pageSize = 6;
  totalPages = 1;

  // snapshot to avoid flicker
  private lastSnapshot = '';

  // reactive add form
  addForm = new FormGroup({
    name: new FormControl('', Validators.required),
    phone: new FormControl(''),
    company: new FormControl(''),
    type: new FormControl('Customer')
  });

  private destroy$ = new Subject<void>();

  constructor(private poll: PollingService, private api: ApiService) {}

  ngOnInit() {
    // subscribe to polling stream
    this.poll.contactsStream(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.loading = false;
          const serverList = Array.isArray(data) ? data : [];
          this.applyServerUpdate(serverList);
        },
        error: () => { this.loading = false; }
      });

    // wire reactive filters
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.filterStatusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.filterTypeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  private applyServerUpdate(serverList: any[]) {
    const snapshot = this.normalizeAndStringify(serverList);
    if (snapshot === this.lastSnapshot) return; // no change, avoid reassign
    this.lastSnapshot = snapshot;
    // normalize defaults (so older records without type/status are not blank)
    this.contacts = serverList.map(s => ({
      type: s.type || 'Customer',
      status: s.status || 'Active',
      phone: s.phone || '',
      company: s.company || '',
      ...s
    }));
    this.applyFilters();
  }

  private normalizeAndStringify(arr: any[]) {
    const normalized = (arr || []).map(item => ({
      id: item.id,
      name: item.name || '',
      phone: item.phone || '',
      company: item.company || '',
      type: item.type || '',
      status: item.status || '',
      createdAt: item.createdAt || ''
    })).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    return JSON.stringify(normalized);
  }

  applyFilters() {
    const q = (this.searchControl.value || '').toLowerCase().trim();
    const statusFilter = (this.filterStatusControl.value || '').trim();
    const typeFilter = (this.filterTypeControl.value || '').trim();

    this.filtered = this.contacts.filter(c => {
      const matchesQ = !q
        || (c.name && c.name.toLowerCase().includes(q))
        || (c.phone && String(c.phone).toLowerCase().includes(q))
        || (c.company && c.company.toLowerCase().includes(q));

      const matchesStatus = !statusFilter || (c.status && c.status === statusFilter);
      const matchesType = !typeFilter || (c.type && c.type === typeFilter);

      return matchesQ && matchesStatus && matchesType;
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
    this.searchControl.setValue('');
    this.filterStatusControl.setValue('');
    this.filterTypeControl.setValue('');
    this.page = 1;
    this.applyFilters();
  }

  // Add contact (optimistic)
  openAdd() { this.showAddForm = true; }
  closeAdd() {
    this.showAddForm = false;
    this.addForm.reset({ type: 'Customer' });
  }

  submitAdd() {
    if (this.addForm.invalid || this.submitting) return;
    this.submitting = true;

    const payload = {
      name: this.addForm.value.name,
      phone: this.addForm.value.phone,
      company: this.addForm.value.company,
      type: this.addForm.value.type
    };

    const tmpId = 'tmp-' + Date.now();
    const optimistic = {
      id: tmpId,
      name: payload.name,
      phone: payload.phone,
      company: payload.company,
      type: payload.type,
      status: 'Active',
      createdAt: new Date().toISOString(),
      _optimistic: true
    };

    this.contacts.unshift(optimistic);
    this.applyFilters();

    this.api.addContact(payload)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (serverItem: any) => {
  // Create a merged item: server is authoritative but fill missing fields from optimistic item
  const merged = {
    type: optimistic.type || 'Customer',
    status: optimistic.status || 'Active',
    phone: optimistic.phone || '',
    company: optimistic.company || '',
    ...serverItem
  };

  const idx = this.contacts.findIndex(c => c.id === tmpId);
  if (idx >= 0) this.contacts[idx] = { ...merged };
  else this.contacts.unshift(merged);

  this.lastSnapshot = this.normalizeAndStringify(this.contacts);
  this.applyFilters();
  this.closeAdd();
},

        error: (err) => {
          this.contacts = this.contacts.filter(c => c.id !== tmpId);
          this.applyFilters();
          console.error('Add contact failed', err);
          alert('Failed to add contact.');
        }
      });
  }

  // small utilities for UI
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

