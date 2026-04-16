import { Routes } from '@angular/router';
import { BoardComponent } from './features/task/board/board.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { VerifyOtpComponent } from './features/auth/verify/verify.component';
import { authGuard, guestGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/board', pathMatch: 'full' },
  { path: 'board', component: BoardComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'verify-otp', component: VerifyOtpComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '/login' },
];
