import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ParticipantsComponent } from './participants/participants.component';
import { ContactsComponent } from './contacts/contacts.component';

const routes: Routes = [
  { path: '', redirectTo: 'participants', pathMatch: 'full' },
  { path: 'participants', component: ParticipantsComponent },
  { path: 'contacts', component: ContactsComponent },
  { path: '**', redirectTo: 'participants' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
