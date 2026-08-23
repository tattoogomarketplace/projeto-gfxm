import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão Supabase a cada request (SSR cookie refresh).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Proteção de Rotas Públicas
  if (!user && !path.startsWith("/login") && !path.startsWith("/register") && path !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Proteção de Role (RBAC)
  if (user) {
    const role = user.user_metadata.role;

    // Redireciona para o dashboard correto caso tente acessar o dashboard genérico
    if (path === "/dashboard") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }

    // Impede role tampering
    if (path.startsWith("/dashboard/") && !path.startsWith(`/dashboard/${role}`)) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

