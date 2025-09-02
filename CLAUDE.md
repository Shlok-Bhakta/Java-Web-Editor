# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fully client-side Java editor designed for college students to take programming exams. The application must be completely sandboxed with no server communication to prevent cheating.

### Key Requirements
- **Client-side only**: No server components, everything runs in browser
- **Sandboxed execution**: No network access to prevent cheating (e.g., calling OpenAI APIs)
- **Multi-file support**: Students need to work with multiple Java files
- **Scanner support**: Must support Java's Scanner class for input/output
- **Performance**: Fast execution despite browser limitations
- **Exam environment**: Secure, isolated environment for academic testing

### Core Components
- **CheerpJ**: Java-to-WebAssembly runtime for client-side Java execution
- **Monaco Editor**: VS Code-style code editor for Java development
- **Terminal Interface**: Fake terminal window for program output/input
- **File Management**: Multi-file project support

## Commands

### Development
- `bun dev` - Start all applications in development mode
- `bun dev:web` - Start only the web application (SvelteKit)
- `bun dev:server` - Start only the server application
- `bun dev:native` - Start only the native application

### Build and Type Checking
- `bun build` - Build all applications
- `bun check-types` - Check TypeScript types across all apps

### Web Application Specific (in apps/web/)
- `bun dev` - Start development server (Vite)
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun check` - Run svelte-check for type checking
- `bun check:watch` - Run svelte-check in watch mode

## Architecture

This is a Turborepo monorepo built with Better-T-Stack containing:

- **Monorepo Structure**: Uses Turborepo for build orchestration and caching
- **Package Manager**: Bun is the primary package manager
- **Web App (apps/web/)**: SvelteKit application with:
  - Svelte 5 with TypeScript
  - TailwindCSS v4 for styling
  - Vite as build tool
  - Form handling with @tanstack/svelte-form and Zod validation
  - Auto adapter for deployment

### Key Technologies
- **SvelteKit**: Modern web framework with file-based routing
- **TailwindCSS v4**: Utility-first CSS framework with Vite plugin
- **TypeScript**: Type safety across all applications
- **Turborepo**: Handles task orchestration and caching for the monorepo
- **CheerpJ**: Primary Java runtime (WebAssembly-based)
- **Monaco Editor**: Code editor component

### Performance Considerations
- CheerpJ can be slow, optimize for fast startup and execution
- Consider CheerpJ alternatives if they support required features (multi-file, Scanner)
- Minimize initial bundle size and lazy load components when possible

### Security Requirements
- Block all network requests to prevent cheating
- Sandbox Java execution environment
- Ensure no access to browser APIs that could bypass restrictions

### Project Structure
The monorepo follows a standard apps/packages structure where additional applications can be added to the `apps/` directory and shared packages to `packages/`.