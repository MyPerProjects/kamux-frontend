# Kamux Frontend - Cliente Web Multimedia 🎨🎵

Interfaz de usuario moderna y responsiva desarrollada sobre Angular, diseñada específicamente para la reproducción fluida de contenido multimedia en tiempo real, gestión de listas de reproducción personalizadas y sincronización interactiva de letras de canciones.

---

## 🚀 Arquitectura del Cliente

El frontend opera como un cliente de una arquitectura distribuida basada en microservicios, consumiendo de forma segura las pasarelas empresariales de datos y streaming de audio. Tras la migración al motor híbrido de catálogo de estudio, el flujo de interconexión se consolida de la siguiente manera:

**Flujo:** Angular App (Cliente) ➔ Kamux Backend (NestJS / Puerto 4000) ➔ Motor Híbrido Multiproyecto (Express / Puerto 5001)

### 🔄 Mecanismo de Sincronización Inversa
La aplicación ya no delega la búsqueda inicial a cadenas de texto crudas provenientes de canales de video de terceros. El cliente solicita y procesa metadatos comerciales limpios de estudio (artistas y canciones reales). Al reproducir o registrar interacciones, la información se envía depurada hacia las tablas de PostgreSQL, garantizando la consistencia del historial y las listas sin duplicar registros por metadata corrupta.

---

## 🎤 Características Principales

- **Módulo de Audio Avanzado:** Implementación nativa sobre la API de HTML5 con soporte completo para la lectura de rangos binarios dinámicos (HTTP 206), permitiendo un rebobinado e inicio de pista instantáneo a través del identificador de reproducción resuelto de forma síncrona.
- **Sincronización de Letras:** Interfaz optimizada con desplazamiento automático interactivo emparejada con el pipeline de normalización de metadata del sistema core.
- **Gestión de Cola Inteligente (Lazy Loading):** El componente de reproducción asimila listas de recomendaciones contextuales e infinitas con metadatos de catálogo oficiales. Las carátulas e identificadores de YouTube se resuelven bajo demanda en background, protegiendo el consumo de red y optimizando la tasa de refresco visual.
- **Persistencia Dinámica:** Gestión en caliente de historial de pistas reproducidas y catálogos vinculados a la base de datos relacional.

---

## ⚙️ Configuración del Entorno (Variables de Entorno)

Para producción, el cliente se conecta de forma directa a los endpoints seguros desplegados a través de tu DNS dinámico. Asegúrate de configurar tu archivo de variables en `src/environments/environment.prod.ts` apuntando a tu dominio oficial del backend en la nube:

- **URL Base del Backend Core:** `https://kamux-api.duckdns.org`
- **Puerto del Motor de Medios Híbrido:** `http://localhost:5001` *(O el puerto configurado para tu servicio en el VPS)*

---

## 🛠️ Comandos de Desarrollo y Mantenimiento

### Instalar Dependencias Locales

Para descargar todos los paquetes necesarios del proyecto y asegurar la correcta carga del core de Angular y dependencias de estilos como Tailwind CSS, ejecuta:

- `npm install`

### Levantar Servidor de Desarrollo Local

Para compilar la aplicación en tu computadora local y escuchar cambios en tiempo real en el puerto predeterminado (`http://localhost:4200`) ejecuta:

- `ng serve`

### Compilar el Proyecto para Producción

Genera el empaquetado optimizado, comprimido y minimizado en la carpeta `dist/` listo para ser desplegado de forma permanente en servidores de producción o servidores web como Nginx, ejecutando:

- `ng build --configuration production`

---
*Desarrollado como parte del proyecto de arquitectura de sistemas para Kamux Music Platform.*