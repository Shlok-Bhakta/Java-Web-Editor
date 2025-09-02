// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// CheerpJ global types
	function cheerpjInit(options?: CheerpjInitOptions): Promise<CheerpjRuntime>;
	function cheerpjRunJar(jarPath: string, ...args: string[]): Promise<void>;
	function cheerpjRunMain(className: string, classPath?: string): Promise<void>;

	interface CheerpjInitOptions {
		version?: string;
		natives?: string;
		javaProperties?: string[];
		enableNetworking?: boolean;
		enableFileSystemAccess?: boolean;
		preloadProgress?: (current: number, total: number) => void;
	}

	interface CheerpjRuntime {
		// File system operations
		writeFile(path: string, content: string): Promise<void>;
		readFile(path: string): Promise<string>;
		
		// Java execution
		runMain(className: string, classPath?: string): Promise<void>;
		runJar(jarPath: string, ...args: string[]): Promise<void>;
		
		// Console redirection (these may vary based on actual CheerpJ API)
		onStdout?: (text: string) => void;
		onStderr?: (text: string) => void;
		onStdinRequest?: () => Promise<string>;
	}
}

export {};
