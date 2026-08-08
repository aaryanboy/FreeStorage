import { cookies } from "next/headers";

const SESSION_COOKIE = "freestorage_session";

export async function createSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSessionUserId() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
}