# Kamux Frontend - Cliente Web Multimedia 🎨🎵

Interfaz de usuario moderna y responsiva desarrollada sobre Angular, diseñada específicamente para la reproducción fluida de contenido multimedia en tiempo real, gestión de listas de reproducción personalizadas y sincronización interactiva de letras de canciones.

## 🚀 Arquitectura del Cliente

El frontend opera como un cliente de una arquitectura distribuida basada en microservicios, consumiendo de forma segura las pasarelas empresariales de datos y streaming de audio:

Flujo: Angular App (Cliente) ➔ Kamux Backend (NestJS / Puerto 4000) ➔ Microservicio Multimedia (Express / Puerto 5000)

## 🎤 Características Principales

- Módulo de Audio Avanzado: Implementación nativa sobre la API de HTML5 con soporte completo para la lectura de rangos binarios dinámicos (HTTP 206), permitiendo un rebobinado e inicio de pista instantáneo.
- Sincronización de Letras: Interfaz optimizada con desplazamiento automático interactivo emparejada con el pipeline de normalización de metadata del sistema core.
- Persistencia Dinámica: Gestión en caliente de historial de pistas reproducidas y catálogos vinculados a la base de datos relacional.

## ⚙️ Configuración del Entorno (Variables de Entorno)

Para producción, el cliente se conecta de forma directa a los endpoints seguros desplegados a través de tu DNS dinámico. Asegúrate de configurar tu archivo de variables en src/environments/environment.prod.ts apuntando a tu dominio oficial del backend en la nube: https://kamux-api.duckdns.org

## 🛠️ Comandos de Desarrollo y Mantenimiento

### Instalar Dependencias Locales

Para descargar todos los paquetes necesarios del proyecto ejecuta:

- npm install

### Levantar Servidor de Desarrollo Local

Para compilar la aplicación en tu computadora local y escuchar cambios en tiempo real en el puerto predeterminado (http://localhost:4200) ejecuta:

- ng serve

### Compilar el Proyecto para Producción

Genera el empaquetado optimizado, comprimido y minimizado en la carpeta dist/ listo para ser desplegado de forma permanente en servidores de producción ejecutando:

- ng build --configuration production
