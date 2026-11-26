# GreenDataCore · Publicación de la web en greendatacore.com

Web estática de una página. Alojamiento: GitHub Pages (gratuito, HTTPS incluido). Dominio y DNS: Squarespace.

## Contenido de la carpeta

| Archivo | Función |
| --- | --- |
| `index.html` | La página completa (estilos y script incluidos). |
| `assets/logo/gdc-logo-horizontal.svg` · `-negativo.svg` | Logotipo v2 (árbol frondoso) en cabecera y pie. |
| `assets/logo/gdc-logo-vertical.svg` · `-negativo.svg` | Logotipo vertical v2, de reserva para portadas o redes. |
| `assets/logo/gdc-simbolo-reducido.svg` | Símbolo reducido: icono de la pestaña del navegador. |
| `assets/logo/udoo-rama-gdc.svg` · `-negativo.svg` | UDOO como rama 1 de GreenDataCore (sección UDOO). |
| `assets/fonts/*.woff2` | Instrument Sans y JetBrains Mono alojadas en la propia web (licencia OFL). |
| `CNAME` | Indica a GitHub Pages el dominio `greendatacore.com`. |
| `robots.txt`, `sitemap.xml` | Indexación en buscadores. |
| `.nojekyll` | Evita que GitHub procese los archivos. |

## Logotipos

Se usan los logotipos v2 del manual de identidad (árbol frondoso, validado para empresa y web), copiados de la carpeta «GreenDataCore - Logotipos e identidad» de Drive. Si se actualizan, basta con sustituir los archivos de `assets/logo/` manteniendo los mismos nombres.

## Paso 1 · Subir la web a GitHub (sin terminal)

1. En github.com, crear un repositorio público llamado `greendatacore-web`.
2. «Add file › Upload files» y arrastrar **todo el contenido** de esta carpeta (incluidas las carpetas `assets`, el archivo `CNAME` y `.nojekyll`). Confirmar con «Commit changes».
3. En el repositorio: «Settings › Pages». En «Build and deployment», origen «Deploy from a branch», rama `main`, carpeta `/ (root)`. Guardar.
4. En el mismo apartado, «Custom domain»: escribir `greendatacore.com` y guardar.

## Paso 2 · Registros DNS en Squarespace

En Squarespace: Dominios › `greendatacore.com` › DNS › Registros personalizados.

1. Si existe el bloque de registros predeterminados de Squarespace («Squarespace Defaults»), eliminarlo: apunta el dominio a Squarespace y entra en conflicto.
2. Crear estos registros:

| Host | Tipo | Valor |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153` |
| `@` | AAAA | `2606:50c0:8001::153` |
| `@` | AAAA | `2606:50c0:8002::153` |
| `@` | AAAA | `2606:50c0:8003::153` |
| `www` | CNAME | `<usuario-de-github>.github.io` |

Los registros AAAA son opcionales (IPv6). La propagación puede tardar hasta 24 horas.

## Paso 3 · HTTPS y verificación

1. Cuando GitHub muestre «DNS check successful» en «Settings › Pages», marcar «Enforce HTTPS».
2. Recomendado: verificar el dominio en la cuenta de GitHub («Settings» del perfil › «Pages» › «Add a domain»). GitHub dará un registro TXT para añadir en Squarespace; impide que otra cuenta use el dominio.

## Antes de anunciar la web

- **Aviso legal y privacidad.** La LSSI exige identificar al titular de la web (denominación social, NIF, domicilio, datos registrales y correo). Se añadirá cuando la sociedad esté constituida.
- **Correo `contacto@greendatacore.com`.** La web enlaza esta dirección; hay que crearla (Google Workspace o reenvío de correo del dominio).
- **Cookies.** La web no usa cookies, analítica ni recursos de terceros (las fuentes se sirven desde el propio dominio), por lo que no requiere banner de cookies. Si se añade analítica, habrá que revisarlo.
