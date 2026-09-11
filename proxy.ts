import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

async function rateLimit(id: string, bucket: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const client = getRedis();
    if (!client) return true;
    const key = `rl:${bucket}:${id}`;
    const n = await client.incr(key);
    if (n === 1) await client.expire(key, windowSec);
    return n <= limit;
  } catch {
    return true;
  }
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "anon";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Atualiza a sessão Supabase a cada request (SSR cookie refresh).
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register") || path === "/";
  const isPublicAsset = path.startsWith("/api") || path.startsWith("/auth");
  const ip = clientIp(request);

  const isAuthAttempt = path.startsWith("/login") || path.startsWith("/register");
  const ipAllowed = isAuthAttempt
    ? await rateLimit(ip, "auth", 10, 60)
    : await rateLimit(ip, "global", 120, 60);
  if (!ipAllowed) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  if (isAuthPage || isPublicAsset) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const authResult = await withTimeout(supabase.auth.getUser(), 2000);
    user = authResult.data.user;
  } catch {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userAllowed = await rateLimit(user.id, "user", 180, 60);
  if (!userAllowed) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // 2. Acesso Autenticado
  if (user) {
    let perfil: { has_seen_welcome_notice?: boolean } | null = null;
    try {
      const perfilResult = await withTimeout(
        supabase
          .from('perfis')
          .select('has_seen_welcome_notice')
          .eq('id', user.id)
          .maybeSingle(),
        2000
      );
      perfil = perfilResult.data;
    } catch {
      perfil = null;
    }

    const aceitouTermos = perfil?.has_seen_welcome_notice;

    if (perfil && !aceitouTermos && path !== "/termos") {
      return NextResponse.redirect(new URL("/termos", request.url));
    }

    const allowedRoles = ["cliente", "tatuador", "estudio"];
    const role = user.user_metadata?.role;
    if (
      role &&
      allowedRoles.includes(role) &&
      path.startsWith("/dashboard/") &&
      !path.startsWith(`/dashboard/${role}`)
    ) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

