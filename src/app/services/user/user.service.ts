import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';

import environment from '../../../environments/environment';
import { apiResponse } from '../../shared/models/request.model';
import { UserRole, User } from '../../shared/models/task.model';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, UserRole.MANAGER>;
  managerId: string;
}

interface ApiUser {
  _id?: string;
  id?: string;
  name: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly usersApiUrl = `${environment.API_URL}/api/v1/users`;

  private readonly _users = signal<Record<string, User>>({});

  readonly users = computed(() => Object.values(this._users()));

  constructor(private http: HttpClient) {}

  createUser(payload: CreateUserPayload): Observable<apiResponse<unknown>> {
    return this.http.post<apiResponse<unknown>>(this.usersApiUrl, payload);
  }

  loadUsers(): void {
    this.http
      .get<apiResponse<ApiUser[]>>(this.usersApiUrl)
      .pipe(
        catchError(() =>
          of({
            status: true,
            message: 'fallback',
            data: [] as ApiUser[],
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          if (!res.data) return;
          const mappedUsers = this.mapApiUserToUiUser(res.data);
          this._users.set(mappedUsers);
        },
      });
  }

  getUserById(id: string): User | undefined {
    return this._users()[id];
  }

  addUser(user: User): void {
    this._users.update((prev) => ({
      ...prev,
      [user.id]: user,
    }));
  }

  private mapApiUserToUiUser(users: ApiUser[]): Record<string, User> {
    const res: Record<string, User> = {};

    const palettes = [
      { avatarColor: '#c17b3a', avatarBg: '#f5ead8' },
      { avatarColor: '#2d6fa3', avatarBg: '#e8f1f8' },
      { avatarColor: '#6b4ea0', avatarBg: '#f0ebf8' },
      { avatarColor: '#3a7d5a', avatarBg: '#e6f3ec' },
    ];

    users.forEach((user, index) => {
      const palette = palettes[index % palettes.length];

      const nameParts = user.name.split(' ').filter(Boolean);
      const initials = nameParts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

      const id = user._id ?? user.id;
      if (!id) return;

      res[id] = {
        id,
        name: user.name,
        role: user.role,
        initials,
        avatarBg: palette.avatarBg,
        avatarColor: palette.avatarColor,
      };
    });

    return res;
  }
}
