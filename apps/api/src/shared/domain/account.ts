export type Role = 'STUDENT' | 'INSTRUCTOR' | 'COORDINATOR';
export type AccountStatus = 'ACTIVE' | 'DEACTIVATED';

export interface Account {
  id: string;
  clerkUserId: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  programId: string | null;
}
