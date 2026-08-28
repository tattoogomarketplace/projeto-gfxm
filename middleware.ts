import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão Supabase a cada request (SSR cookie refresh).
 */
export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 1. Acesso Público
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register") || path === "/";
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Acesso Autenticado
  if (user) {
    // Busca perfil para validar termos (usando select otimizado)
    const { data: perfil } = await supabase
      .from('perfis')
      .select('has_seen_welcome_notice')
      .eq('id', user.id)
      .maybeSingle();

    const aceitouTermos = perfil?.has_seen_welcome_notice;

    // Bloqueio se não aceitou termos (exceto na página de termos)
    if (!aceitouTermos && path !== "/termos" && !isAuthPage) {
      return NextResponse.redirect(new URL("/termos", request.url));
    }

    // RBAC: Impede acesso cruzado entre perfis
    const role = user.user_metadata.role;
    if (path.startsWith("/dashboard/") && !path.startsWith(`/dashboard/${role}`)) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

