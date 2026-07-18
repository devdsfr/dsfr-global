export interface User {
  id: string;
  name: string;
  email: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  tokens: TokenPair;
  user: User;
}
