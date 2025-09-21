<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { autoRun, compileLog, files, isRunning, isSaved, runCode, IO, type File } from './repl/state';

	let cjConsole: HTMLElement;
	let cjOutput: HTMLElement;
	let cjOutputObserver: MutationObserver;
	
	// Multi-entry compilation cache to avoid recompiling unchanged code
	let compilationCache = new Map<string, boolean>(); // hash -> isCompiled
	const MAX_CACHE_SIZE = 10; // Keep last 10 different programs cached
	
	function getFilesHash(files: File[]): string {
		return files.map(f => f.path + ':' + f.content).join('|');
	}
	
	function addToCache(hash: string) {
		// Add to cache and limit size
		compilationCache.set(hash, true);
		
		// If cache is too big, remove oldest entries
		if (compilationCache.size > MAX_CACHE_SIZE) {
			const keysToDelete = Array.from(compilationCache.keys()).slice(0, compilationCache.size - MAX_CACHE_SIZE);
			keysToDelete.forEach(key => compilationCache.delete(key));
		}
	}

	async function startCheerpj() {
		await cheerpjInit({
			status: 'none',
			preloadResources: [{
				// Keep only essential JRE components - removed AWT, networking, crypto, locale stuff
				"/lt/8/jre/lib/rt.jar":[0,131072,10223616,10878976,11403264,11665408,11927552,12189696,12320768,12582912],
				"/lt/8/jre/lib/charsets.jar":[0,131072],
				"/lt/8/jre/lib/resources.jar":[0,131072],
			},
			"/Java-Web-Editor/tools.jar"
		]
		});
		// Skip GUI display creation - we only need console output, not Swing/AWT rendering
		// const display = document.getElementById("output");
		// cheerpjCreateDisplay(-1, -1, display);
	}

	async function runCheerpj() {
		console.log('runCheerpj');
		if ($isRunning) return;

		console.info('compileAndRun');
		$isRunning = true;
		cjConsole.innerHTML = '';
		if (cjOutput) cjOutput.innerHTML = '';

		// Check if compilation is needed
		const currentHash = getFilesHash($files);
		const needsCompilation = !compilationCache.has(currentHash);

		// Create wrapper class for System.in redirection
		const wrapperCode = `
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.lang.reflect.Method;

public class SystemInWrapper {
	   public static void main(String[] args) throws Exception {
	       String input = "${$IO.replace(/\n/g, '\\n').replace(/"/g, '\\"')}";
	       String mainClassName = "${deriveMainClass($files[0])}";
	       
	       // Set System.in to the provided input
	       InputStream originalIn = System.in;
	       try {
	           ByteArrayInputStream inputStream = new ByteArrayInputStream(input.getBytes());
	           System.setIn(inputStream);
	           
	           // Load and run the main class
	           Class<?> mainClass = Class.forName(mainClassName);
	           Method mainMethod = mainClass.getMethod("main", String[].class);
	           
	           mainMethod.invoke(null, (Object) new String[0]);
	       } catch (Exception e) {
	           e.printStackTrace();
	       } finally {
	           // Restore original System.in
	           System.setIn(originalIn);
	       }
	   }
}`;

		const classPath = '/app/Java-Web-Editor/tools.jar:/files/';
		let compileCode = 0;

		// Only compile if files have changed
		if (needsCompilation) {
			console.log('Files changed, recompiling...');
			
			// Add wrapper to files temporarily
			const wrapperFile = { path: 'SystemInWrapper.java', content: wrapperCode };
			const allFiles = [...$files, wrapperFile];
			const sourceFiles = allFiles.map((file) => '/str/' + file.path);
			
			// Add wrapper file to CheerpJ
			const encoder = new TextEncoder();
			cheerpOSAddStringFile('/str/SystemInWrapper.java', encoder.encode(wrapperCode));
			
			compileCode = await cheerpjRunMain(
				'com.sun.tools.javac.Main',
				classPath,
				...sourceFiles,
				'-d',
				'/files/',
				'-Xlint'
			);
			
			if (compileCode === 0) {
				addToCache(currentHash);
				console.log(`Compilation successful, added to cache (${compilationCache.size}/${MAX_CACHE_SIZE})`);
			}
		} else {
			console.log(`Using cached compilation - skipping javac (cache: ${compilationCache.size}/${MAX_CACHE_SIZE})`);
		}
		
		// Run the wrapper (even if using cached compilation)
		if (compileCode === 0) {
			await cheerpjRunMain('SystemInWrapper', classPath);
		}

		// in case nothing is written on cjConsole and cjOutput
		// manually unflag $isRunning
		if ($isRunning) $isRunning = false;
		$compileLog = cjConsole.innerText;
	}

	function deriveMainClass(file: File) {
		const className = file.path.split('/').pop()!.replace('.java', '');
		const match = file.content.match(/package\s+(.+);/);
		if (match && match.length > 1) {
			const packageName = match[1];
			return `${packageName}.${className}`;
		} else {
			return className;
		}
	}


	let unsubSaveFiles: () => void;
	let unsubRunCode: () => void;
	
	// Debounce file operations to reduce I/O overhead
	let fileWriteTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if ($runCode) {
				$runCode = false;
			($autoRun) ?  runCheerpj() : runCheerpj();
		}
	});
	onMount(async () => {
		await startCheerpj();

		cjConsole = document.getElementById("console")!;
		cjOutput = document.getElementById("cheerpjDisplay");
		// remove useless loading screen (only if display exists)
		if (cjOutput) {
			cjOutput.classList.remove("cheerpjLoading");
		}

		unsubSaveFiles = files.subscribe(() => {
		if ($isRunning) {
			$isSaved = false;
		} else {
			// Debounce file writes to avoid excessive I/O during typing
			if (fileWriteTimeout) clearTimeout(fileWriteTimeout);
			fileWriteTimeout = setTimeout(() => {
				try {
					const encoder = new TextEncoder();
					for (const file of $files) {
						cheerpOSAddStringFile('/str/' + file.path, encoder.encode(file.content));
					}
					$isSaved = true;
					if ($autoRun) $runCode = true;
				} catch (error) {
					console.error('Error writing files to CheerpJ', error);
				}
			}, 150); // 150ms debounce - responsive but not excessive
		}
		});

		// code execution (flagged by isRunning) is considered over
		// when cjConsole or cjOutput are updated
		cjOutputObserver = new MutationObserver(() => {
			if ($isRunning && (cjConsole.innerHTML || (cjOutput && cjOutput.innerHTML))) {
				$isRunning = false;
				if (!$isSaved) files.update((files) => files);
			}
		});
		cjOutputObserver.observe((cjConsole), {
			childList: true,
			subtree: true,
		});
		if (cjOutput) {
			cjOutputObserver.observe((cjOutput), {
				childList: true,
				subtree: true,
			});
		}

		await runCheerpj();
	});

	onDestroy(() => {
		if (unsubSaveFiles) unsubSaveFiles();
		if (cjOutputObserver) cjOutputObserver.disconnect();
	});
</script>
