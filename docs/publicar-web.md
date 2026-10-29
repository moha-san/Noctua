# Publicar Athenaeum en internet

## 1. Activar la web gratis (GitHub Pages)

1. Abre https://github.com/moha-san/Noctua/settings/pages
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Ve a la pestaña **Actions** del repositorio. Verás «Publicar web» trabajando (tarda unos 2 minutos).
4. La web queda en **https://moha-san.github.io/Noctua/**

Cada vez que se sube un cambio a `main`, la web se actualiza sola.

## 2. Decirle a Supabase dónde está la web

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://moha-san.github.io/Noctua/` (o tu dominio cuando lo tengas)
- **Redirect URLs**: añade la misma dirección.

## 3. Dominio propio (opcional, unos 10 € al año)

1. Compra el dominio en Cloudflare, Namecheap o similar (por ejemplo `somosnoctua.com`).
2. En el panel DNS del dominio crea estos registros:
   - `A` → `185.199.108.153`
   - `A` → `185.199.109.153`
   - `A` → `185.199.110.153`
   - `A` → `185.199.111.153`
   - `CNAME` `www` → `moha-san.github.io`
3. En GitHub → Settings → Pages → **Custom domain**, escribe el dominio y guarda. Marca **Enforce HTTPS** cuando aparezca.
4. Crea un archivo `CNAME` en la raíz del repositorio con el dominio dentro (una sola línea), para que no se pierda al volver a publicar.
5. Cambia la **Site URL** de Supabase al dominio nuevo.

Los cambios de DNS pueden tardar desde unos minutos hasta 24 horas.
