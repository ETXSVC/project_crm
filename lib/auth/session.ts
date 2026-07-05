export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

export const sessionOptions = {
  strategy: "jwt" as const,
  maxAge: SESSION_MAX_AGE_SECONDS,
  updateAge: SESSION_UPDATE_AGE_SECONDS,
};
