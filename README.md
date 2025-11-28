# Coffee Shop POS - Sistema de Punto de Venta

Sistema de punto de venta completo y funcional para cafeterías, desarrollado con Next.js 15, Supabase, y soporte offline mediante PWA.

## 🚀 Características Principales

✅ **Autenticación con roles** (Admin / Cajero)  
✅ **Catálogo de productos** con categorías y búsqueda  
✅ **Carrito de compra** con gestión de cantidades  
✅ **Sistema de pago** (Efectivo / Tarjeta)  
✅ **Dashboard de administrador** con estadísticas de ventas  
✅ **Gestión de inventario** con descuento automático de stock  
✅ **Modo offline** (PWA) con sincronización automática  
✅ **Responsive y táctil**  

## 📦 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Estado**: Zustand (carrito, sincronización offline)
- **PWA**: next-pwa + Service Workers
- **Iconos**: Lucide React

## 🛠️ Instalación en 5 Minutos

### 1. Clonar e instalar dependencias

\`\`\`bash
cd coffee-shop-pos
npm install
\`\`\`

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo:
   \`supabase/migrations/0001_initial_schema.sql\`
3. Crea dos usuarios de prueba desde **Authentication > Users**:
   - \`admin@pos.com\` / \`admin123\` (rol: admin)
   - \`cajero@pos.com\` / \`cajero123\` (rol: cashier)
4. En la tabla \`profiles\`, asigna \`role = 'admin'\` al primer usuario

### 3. Variables de entorno

Copia \`.env.example\` a \`.env.local\`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edita \`.env.local\` con tus credenciales de Supabase:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_TAX_RATE=0.10
\`\`\`

### 4. Iniciar en desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abre [http://localhost:3000](http://localhost:3000)

## 📱 Uso

### Inicio de Sesión
- **Admin**: \`admin@pos.com\` / \`admin123\` → Redirige a \`/admin\`
- **Cajero**: \`cajero@pos.com\` / \`cajero123\` → Redirige a \`/pos\`

### Pantalla POS (Cajero)
1. Busca o selecciona productos por categoría
2. Haz clic en un producto para agregarlo al carrito
3. Ajusta cantidades con +/-
4. Presiona **"Cobrar"**
5. Selecciona método de pago (Efectivo/Tarjeta)
6. Confirma el pago

### Dashboard Admin
- Ver ventas del día
- Productos más vendidos
- Stock actual de ingredientes
- Órdenes recientes

## 🔐 Estructura de Base de Datos

El sistema incluye las siguientes tablas principales:

- **profiles**: Usuarios del sistema (admin/cajero)
- **categories**: Categorías de productos
- **products**: Catálogo de productos
- **variants**: Tamaños (Pequeño/Mediano/Grande)
- **modifiers**: Add-ons (Leche vegetal, extra shot, etc.)
- **ingredients**: Inventario de materias primas
- **product_ingredients**: Recetas (descuento automático de stock)
- **orders**: Órdenes de venta
- **order_items**: Líneas de orden
- **loyalty_cards**: Programa de fidelidad (por teléfono)

## 🌐 Deploy en Vercel

1. Sube el código a GitHub
2. Ve a [vercel.com](https://vercel.com) e importa tu repositorio
3. Agrega las variables de entorno:
   - \`NEXT_PUBLIC_SUPABASE_URL\`
   - \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - \`NEXT_PUBLIC_TAX_RATE\`
4. Deploy

## 📄 Licencia

MIT

## 🤝 Contribuciones

Pull requests son bienvenidas. Para cambios mayores, abre un issue primero.
