<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { autoRun, compileLog, files, isRunning, isSaved, runCode, IO, type File } from './repl/state';
	import { debounceFunction } from './utilities';

	let cjConsole: HTMLElement;
	let cjOutput: HTMLElement;
	let cjOutputObserver: MutationObserver;

	async function startCheerpj() {
		await cheerpjInit({
			status: 'none',
		});
		const display = document.getElementById("output");
		cheerpjCreateDisplay(-1, -1, display);
	}

	async function runCheerpj() {
		console.log('runCheerpj');
		if ($isRunning) return;

		console.info('compileAndRun');
		$isRunning = true;
		cjConsole.innerHTML = '';
		cjOutput.innerHTML = '';

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

		// Add wrapper to files temporarily
		const wrapperFile = { path: 'SystemInWrapper.java', content: wrapperCode };
		const allFiles = [...$files, wrapperFile];
		
		const classPath = '/app/Java-Web-Editor/tools.jar:/files/';
		const sourceFiles = allFiles.map((file) => '/str/' + file.path);
		
		// Add wrapper file to CheerpJ
		const encoder = new TextEncoder();
		cheerpjAddStringFile('/str/SystemInWrapper.java', encoder.encode(wrapperCode));
		
		const code = await cheerpjRunMain(
			'com.sun.tools.javac.Main',
			classPath,
			...sourceFiles,
			'-d',
			'/files/',
			'-Xlint'
		);
		
		// Run the wrapper instead of the main class directly
		if (code === 0) await cheerpjRunMain('SystemInWrapper', classPath);

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

	const debounceRunCheerpj = debounceFunction(runCheerpj, 500);

	let unsubSaveFiles: () => void;
	let unsubRunCode: () => void;

	$effect(() => {
		if ($runCode) {
				$runCode = false;
			($autoRun) ? debounceRunCheerpj() : runCheerpj();
		}
	});
	onMount(async () => {
		await startCheerpj();

		cjConsole = document.getElementById("console")!;
		cjOutput = document.getElementById("cheerpjDisplay")!;
		// remove useless loading screen
		cjOutput.classList.remove("cheerpjLoading");

		unsubSaveFiles = files.subscribe(() => {
		if ($isRunning) {
			$isSaved = false;
		} else {
			try {
				const encoder = new TextEncoder();
				for (const file of $files) {
					cheerpjAddStringFile('/str/' + file.path, encoder.encode(file.content));
				}
				$isSaved = true;
				if ($autoRun) $runCode = true;
			} catch (error) {
				console.error('Error writing files to CheerpJ', error);
			}
		}
		});

		// code execution (flagged by isRunning) is considered over
		// when cjConsole or cjOutput are updated
		cjOutputObserver = new MutationObserver(() => {
			if ($isRunning && (cjConsole.innerHTML || cjOutput.innerHTML)) {
				$isRunning = false;
				if (!$isSaved) files.update((files) => files);
			}
		});
		cjOutputObserver.observe((cjConsole), {
			childList: true,
			subtree: true,
		});
		cjOutputObserver.observe((cjOutput), {
			childList: true,
			subtree: true,
		});

		// await runCheerpj();
	});

	onDestroy(() => {
		if (unsubSaveFiles) unsubSaveFiles();
		if (cjOutputObserver) cjOutputObserver.disconnect();
	});
</script>
