export interface User {
  id: string;
  studentId: string;
  name: string;
  email: string;
  password: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  documentUrl?: string;
  profileImage?: string;
  createdAt: Date;
  isAdmin?: boolean;
}

export interface SignUpData {
  studentId: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  photo?: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
