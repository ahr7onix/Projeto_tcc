const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const env = {
  apiUrl,
} as const;
