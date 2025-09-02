import { cheerpjState } from './cheerpstate.svelte.js';

export class CheerpjService {
	private static instance: CheerpjService;
	
	static getInstance(): CheerpjService {
		if (!CheerpjService.instance) {
			CheerpjService.instance = new CheerpjService();
		}
		return CheerpjService.instance;
	}
	
	async initialize(): Promise<void> {
		if (cheerpjState.status !== 'uninitialized') {
			return;
		}
		
		try {
			cheerpjState.status = 'initializing';
			cheerpjState.initError = null;
			
			// Wait for CheerpJ to be available
			await this.waitForCheerpj();
			
			// Initialize CheerpJ runtime like javafiddle
			await cheerpjInit({
				status: 'none'
			});
			
			// Set up file system mounts to make tools.jar available at /app/tools.jar
			const win = window as any;
			win.cheerpjFSMounts = win.cheerpjFSMounts || [];
			win.cheerpjFSMounts.push(['/app', 'web']);
			
			cheerpjState.runtime = true; // Just mark as initialized
			cheerpjState.status = 'ready';
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
			cheerpjState.initError = errorMessage;
			cheerpjState.status = 'error';
			console.error('CheerpJ initialization failed:', error);
			throw error;
		}
	}
	
	private waitForCheerpj(): Promise<void> {
		return new Promise((resolve, reject) => {
			// Check if CheerpJ is already loaded
			if (typeof window !== 'undefined' && (window as any).cheerpjInit) {
				resolve();
				return;
			}
			
			// Wait for CheerpJ to load
			let attempts = 0;
			const maxAttempts = 100; // 10 seconds max
			
			const checkCheerpj = () => {
				attempts++;
				
				if (typeof window !== 'undefined' && (window as any).cheerpjInit) {
					resolve();
				} else if (attempts >= maxAttempts) {
					reject(new Error('CheerpJ failed to load from CDN'));
				} else {
					setTimeout(checkCheerpj, 100);
				}
			};
			
			checkCheerpj();
		});
	}
	
	
	async compileFiles(): Promise<void> {
		if (cheerpjState.status !== 'ready' || cheerpjState.files.length === 0) {
			throw new Error('Runtime not ready or no files to compile');
		}
		
		cheerpjState.isCompiling = true;
		
		try {
			// CheerpJ compiles and executes Java on-the-fly
			// We just need to prepare the files for execution
			cheerpjState.lastCompilation = {
				success: true,
				output: 'Files ready for execution',
				errors: []
			};
			
			cheerpjState.addConsoleOutput('Files ready for execution');
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Compilation error';
			cheerpjState.lastCompilation = {
				success: false,
				output: '',
				errors: [errorMessage]
			};
			cheerpjState.addConsoleOutput(`Error preparing files: ${errorMessage}`);
		} finally {
			cheerpjState.isCompiling = false;
		}
	}
	
	async executeMain(className: string): Promise<void> {
		if (cheerpjState.status !== 'ready') {
			throw new Error('Runtime not ready');
		}
		
		cheerpjState.isExecuting = true;
		cheerpjState.mainClass = className;
		
		try {
			const activeFile = cheerpjState.files.find(f => f.name.startsWith(className));
			if (!activeFile) {
				throw new Error(`No file found for class ${className}`);
			}
			
			const win = window as any;
			
			// Add source file to virtual filesystem like javafiddle
			const encoder = new TextEncoder();
			win.cheerpOSAddStringFile('/str/' + activeFile.path, encoder.encode(activeFile.content));
			
			// First compile with javac (like javafiddle)
			const classPath = '/app/tools.jar:/files/';
			const sourceFiles = ['/str/' + activeFile.path];
			const compileCode = await win.cheerpjRunMain(
				'com.sun.tools.javac.Main',
				classPath,
				...sourceFiles,
				'-d',
				'/files/'
			);
			
			// If compilation successful, run the main class
			if (compileCode === 0) {
				await win.cheerpjRunMain(className, classPath);
				cheerpjState.lastExecution = {
					success: true,
					output: 'Execution completed'
				};
			} else {
				cheerpjState.lastExecution = {
					success: false,
					output: '',
					error: 'Compilation failed'
				};
			}
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Execution error';
			cheerpjState.lastExecution = {
				success: false,
				output: '',
				error: errorMessage
			};
		} finally {
			cheerpjState.isExecuting = false;
		}
	}
	
	provideInput(input: string): void {
		cheerpjState.pendingInput = input + '\n';
	}
	
	reset(): void {
		cheerpjState.reset();
	}
}

// Export singleton instance
export const cheerpjService = CheerpjService.getInstance();