export type AuthProviderFlags = {
  credentials: boolean;
  magicLink: boolean;
  google: boolean;
  github: boolean;
};

export function getAuthProviderFlags(): AuthProviderFlags {
  return {
    credentials: true,
    magicLink: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  };
}
