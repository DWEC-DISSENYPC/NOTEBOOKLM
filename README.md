# 🌟 NotebookLM Desktop Client

<div align="center">

![NotebookLM Desktop](https://img.shields.io/badge/NotebookLM-Desktop%20Client-10b981?style=for-the-badge&logo=google&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-30.x-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Aplicación de escritorio nativa y ligera para Google NotebookLM AI en Windows.**  
Multipestaña · Multiperfil · Diseño premium · Sin dependencias externas en ejecución.

</div>

---

## 📸 Vista Previa

> Interfaz oscura tipo *Glassmorphism* con barra de pestañas personalizada, controles nativos de ventana y gestor de perfiles integrado, estilo Google NotebookLM.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📚 NotebookLM │ Pestaña 1 │ Pestaña 2 │ Pestaña 3 │ +   [👤 Perfil] [─][□][✕]│
├─────────────────────────────────────────────────────────────────────┤
│ ← →  ↻   🔒 https://notebooklm.google.com          [-] [100%] [+]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                📚 NotebookLM (Interfaz Web Real)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Características Principales

| Característica | Descripción |
|---|---|
| 🗂️ **Multi-Pestaña** | Abre hasta 4 pestañas simultáneas de NotebookLM, todas vinculadas a la misma sesión activa |
| 👤 **Gestión de Perfiles** | Múltiples perfiles de cuenta con sesiones completamente aisladas (Trabajo, Personal…) |
| 🔐 **Persistencia de Sesión** | Tus credenciales de Google se recuerdan automáticamente entre sesiones |
| 🚪 **Cierre de Sesión** | Cierra la sesión de cualquier perfil con un solo clic sin afectar a los demás |
| 🎨 **Diseño Premium** | Interfaz oscura *Glassmorphism* con animaciones suaves y tipografía *Outfit* de Google Fonts, adaptada al tema verde esmeralda de NotebookLM |
| 🔲 **Ventana Sin Marco** | Barra de título completamente personalizada con controles nativos de Windows |
| 🔗 **Links Externos Seguros** | Los enlaces ajenos a NotebookLM/Google se abren automáticamente en el navegador por defecto |
| 🔍 **Zoom Dinámico** | Controles de zoom por pestaña con rango del 50% al 200% |
| ⌨️ **Atajos de Teclado** | Navegación completa mediante atajos estándar |
| 💾 **Portátil** | Compilable en un `.exe` independiente, sin necesitar Node.js instalado |

---

## 🚀 Instalación y Uso

### Opción A — Ejecutable Portátil (`.exe`)

> No requiere instalar Node.js ni ninguna dependencia.

1. Descarga o clona este repositorio.
2. Ejecuta la compilación desde la carpeta raíz del proyecto (ver sección [Compilar el Ejecutable](#-compilar-el-ejecutable)).
3. Una vez compilado, haz doble clic en `Iniciar.bat` o ejecuta directamente:
   ```
   dist\NotebookLMDesktop-win32-x64\NotebookLMDesktop.exe
   ```

### Opción B — Modo Desarrollo

> Requiere [Node.js 18+](https://nodejs.org/) instalado en el sistema.

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar la aplicación en modo desarrollo
npm start
```

---

## 📦 Compilar el Ejecutable

Para generar un ejecutable `.exe` portátil de Windows (sin necesidad de Node.js en el equipo destino):

```bash
npm run pack
```

El ejecutable se generará en:
```
dist\NotebookLMDesktop-win32-x64\NotebookLMDesktop.exe
```

> Puedes copiar la carpeta completa `NotebookLMDesktop-win32-x64` a cualquier PC con Windows y la aplicación funcionará de forma autónoma.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|---|---|
| `Ctrl + T` | Nueva pestaña |
| `Ctrl + W` | Cerrar pestaña activa |
| `Ctrl + Tab` | Pestaña siguiente |
| `Ctrl + Shift + Tab` | Pestaña anterior |
| `Ctrl + R` | Recargar pestaña activa |
| `Ctrl + +` | Aumentar zoom |
| `Ctrl + -` | Disminuir zoom |
| `Ctrl + 0` | Restaurar zoom al 100% |

---

## 👤 Gestión de Perfiles y Cuentas

La aplicación incluye un sistema completo de gestión de perfiles para trabajar con **múltiples cuentas de Google** de forma simultánea y aislada:

- **Crear un perfil**: Haz clic en el botón de perfil (esquina superior derecha) → *Gestionar perfiles* → Escribe el nombre y pulsa *Crear Perfil*.
- **Cambiar de perfil**: Haz clic en el botón de perfil y selecciona cualquier perfil de la lista.
- **Cerrar sesión**: Haz clic en el botón de perfil → *Cerrar sesión en este perfil*. Se borrarán las cookies y credenciales del perfil activo.
- **Eliminar un perfil**: Abre *Gestionar perfiles y perfiles* y pulsa *Eliminar* junto al perfil que deseas borrar.

> Cada perfil tiene su propio almacenamiento de cookies y sesión completamente independiente del resto.

---

## 🏗️ Estructura del Proyecto

```
notebooklm-desktop-client/
├── main.js           # Proceso principal Electron (ventana, sesiones, IPC, User-Agent)
├── preload.js        # Puente seguro contextBridge entre main y renderer
├── renderer.js       # Lógica del cliente (pestañas, perfiles, webviews, atajos)
├── index.html        # Estructura HTML de la interfaz de la aplicación
├── styles.css        # Sistema de diseño CSS (Tema forest/verde oscuro, Glassmorphism, animaciones)
├── package.json      # Configuración del proyecto y scripts de NPM
├── Iniciar.bat       # Lanzador para Windows (prioriza el .exe compilado)
└── dist/             # Carpeta generada tras ejecutar `npm run pack`
    └── NotebookLMDesktop-win32-x64/
        └── NotebookLMDesktop.exe
```

---

## 🛠️ Tecnologías Utilizadas

- **[Electron 30](https://www.electronjs.org/)** — Framework para aplicaciones de escritorio con tecnologías web.
- **HTML5 / CSS3 / JavaScript ES2022** — Interfaz del shell construida sin frameworks pesados.
- **[electron-packager](https://github.com/electron/packager)** — Herramienta de compilación a ejecutable `.exe` portátil.
- **[Outfit (Google Fonts)](https://fonts.google.com/specimen/Outfit)** — Tipografía de la interfaz.
- **CSS Variables & Glassmorphism** — Sistema de diseño moderno con tema oscuro nativo de NotebookLM.

---

## 🔧 Decisiones Técnicas

### Compatibilidad con Google Sign-In
Google bloquea los intentos de inicio de sesión desde navegadores embebidos (WebViews). Para resolver esto:
- El **User-Agent** de todas las peticiones se sobrescribe para identificarse como **Firefox en Windows**.
- Se elimina la cabecera **`X-Requested-With`** en cada petición saliente mediante un interceptor de red de Electron.

### Sesiones Persistentes y Aisladas
- Las pestañas de un mismo perfil comparten una **partición persistente** de Chromium (`persist:profile_id`), lo que permite iniciar sesión una sola vez y tenerla activa en todas las pestañas.
- Cada perfil tiene su propia partición completamente aislada, permitiendo múltiples cuentas simultáneas.

### Bajo Consumo de Recursos
- La interfaz del shell (barra de pestañas, controles, menús) está escrita en **HTML, CSS y JS nativos** sin ningún framework adicional (sin React, Vue ni Angular), minimizando el tamaño del bundle y el consumo de RAM.

---

## 📋 Requisitos del Sistema

| Requisito | Mínimo |
|---|---|
| **Sistema Operativo** | Windows 10 / 11 (64-bit) |
| **RAM** | 512 MB libres (se recomiendan 1 GB para 3+ pestañas) |
| **Espacio en Disco** | ~350 MB (ejecutable compilado) |
| **Conexión a Internet** | Requerida para acceder a NotebookLM |
| **Para Desarrollo** | Node.js 18+ y npm 9+ |

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

<div align="center">

Desarrollado con ❤️ utilizando **Electron** y **JavaScript** nativo.

*Este proyecto es una aplicación cliente no oficial y no está afiliado a Google LLC.*

</div>
