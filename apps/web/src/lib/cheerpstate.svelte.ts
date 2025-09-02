export type CheerpjStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

export type JavaFile = {
	name: string;
	content: string;
	path: string;
};

export type CompilationResult = {
	success: boolean;
	output: string;
	errors?: string[];
};

export type ExecutionResult = {
	success: boolean;
	output: string;
	error?: string;
};

class CheerpjState {
	runtime = $state<CheerpjRuntime | null>(null);
	status = $state<CheerpjStatus>('uninitialized');
	initError = $state<string | null>(null);
	
	// Java project state
	files = $state<JavaFile[]>([]);
	activeFile = $state<JavaFile | null>(null);
	mainClass = $state<string | null>(null);
	
	// Compilation and execution state
	isCompiling = $state<boolean>(false);
	isExecuting = $state<boolean>(false);
	lastCompilation = $state<CompilationResult | null>(null);
	lastExecution = $state<ExecutionResult | null>(null);
	
	// Terminal/console state
	consoleOutput = $state<string[]>([]);
	pendingInput = $state<string>('');
	waitingForInput = $state<boolean>(false);
	
	// Methods for file management
	addFile(file: JavaFile) {
		this.files.push(file);
		if (!this.activeFile) {
			this.activeFile = file;
		}
	}
	
	removeFile(fileName: string) {
		this.files = this.files.filter(f => f.name !== fileName);
		if (this.activeFile?.name === fileName) {
			this.activeFile = this.files.length > 0 ? this.files[0] : null;
		}
	}
	
	updateFile(fileName: string, content: string) {
		const file = this.files.find(f => f.name === fileName);
		if (file) {
			file.content = content;
		}
	}
	
	setActiveFile(fileName: string) {
		const file = this.files.find(f => f.name === fileName);
		if (file) {
			this.activeFile = file;
		}
	}
	
	// Console methods
	addConsoleOutput(text: string) {
		this.consoleOutput.push(text);
	}
	
	clearConsole() {
		this.consoleOutput = [];
	}
	
	// Reset state
	reset() {
		this.files = [];
		this.activeFile = null;
		this.mainClass = null;
		this.isCompiling = false;
		this.isExecuting = false;
		this.lastCompilation = null;
		this.lastExecution = null;
		this.consoleOutput = [];
		this.pendingInput = '';
		this.waitingForInput = false;
	}
}

// Export singleton instance
export const cheerpjState = new CheerpjState();