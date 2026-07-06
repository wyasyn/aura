export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
  skinTypeId?: string;
  createdAt: Date;
  updatedAt: Date;
}
