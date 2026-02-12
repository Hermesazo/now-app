# Supabase – Now App

## Cómo aplicar el esquema

1. **Desde el Dashboard de Supabase**
   - Ve a **SQL Editor** en tu proyecto.
   - Copia y pega el contenido de `migrations/001_initial_schema.sql`.
   - Ejecuta el script.

2. **Con Supabase CLI** (si lo usas)
   - `supabase db push` o `supabase migration up`.

## Tablas creadas

| Tabla          | Uso en la app |
|----------------|----------------|
| **profiles**   | Streak count y última actividad por usuario. Se crea una fila al registrarse (trigger). |
| **projects**   | Proyectos (ProjectsModule): título, color, orden. |
| **steps**      | Pasos/tareas dentro de un proyecto (ProjectsModule): título, orden, is_done. |
| **focus_tasks**| Tareas para el FocusModule: título, duración, dificultad, is_core, insight; opcionalmente vinculadas a un proyecto. |

## Seguridad (RLS)

- Todas las tablas tienen **Row Level Security** activado.
- Cada usuario solo puede ver y modificar sus propios datos (`auth.uid()`).

## Qué más puede requerir la app

- **Auth (Supabase Auth)**  
  Login/registro para obtener `user_id`. Sin auth, no hay `auth.uid()` y las políticas RLS bloquearán el acceso. Necesitas:
  - Configurar Auth en el proyecto (Email, OAuth, etc.).
  - En el cliente: `supabase.auth.signInWithPassword()`, `onAuthStateChange()`, y usar la sesión para las llamadas a la API.

- **Cliente Supabase en el frontend**  
  Instalar `@supabase/supabase-js`, crear un cliente con `SUPABASE_URL` y `SUPABASE_ANON_KEY`, y usarlo para:
  - Leer/escribir `projects`, `steps`, `focus_tasks`.
  - Leer/actualizar `profiles` (streak, last_activity_date).

- **Sincronización de streak**  
  Al completar tareas o al abrir la app el día siguiente, actualizar `profiles.streak_count` y `profiles.last_activity_date` (lógica en un edge function o en el cliente con reglas de negocio claras).

- **Sesiones de focus**  
  Opcional: tabla `focus_sessions` (user_id, started_at, completed_at, task_id) para historial y analytics. No incluida en la migración inicial.

- **Trigger `on_auth_user_created`**  
  Si al ejecutar la migración falla el trigger sobre `auth.users`, créalo desde el SQL Editor con el mismo rol que administra Auth, o crea el perfil manualmente al hacer el primer login desde el cliente (insert en `profiles` con `id = auth.uid()`).
