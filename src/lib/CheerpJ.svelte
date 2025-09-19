<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { autoRun, compileLog, files, isRunning, isSaved, runCode, IO, type File } from './repl/state';

	let cjConsole: HTMLElement;
	let cjOutput: HTMLElement;
	let cjOutputObserver: MutationObserver;

	async function startCheerpj() {
		await cheerpjInit({
			status: 'none',
			preloadResources: [{
				"/lt/8/jre/lib/rt.jar":[0,131072,10223616,10878976,11403264,11665408,11927552,12189696,12320768,12582912,14942208,15073280,15204352,15335424,15466496,15597568,17694720,17956864,18350080,18612224,19005440,19136512,20840448,21102592,21233664,21757952,22020096,22806528,22937600,23592960,23724032,26869760],
				"/lt/etc/users":[0,131072],
				"/lt/etc/localtime":[],
				"/lt/8/jre/lib/cheerpj-awt.jar":[0,131072],
				"/lt/8/lib/ext/meta-index":[0,131072],
				"/lt/8/lib/ext":[],
				"/lt/8/lib/ext/index.list":[],
				"/lt/8/lib/ext/localedata.jar":[0,131072,1048576,1179648],
				"/lt/8/jre/lib/jsse.jar":[0,131072,786432,917504],
				"/lt/8/jre/lib/jce.jar":[0,131072],
				"/lt/8/jre/lib/charsets.jar":[0,131072,1703936,1835008],
				"/lt/8/jre/lib/resources.jar":[0,131072,917504,1179648],
				"/lt/8/jre/lib/javaws.jar":[0,131072,1441792,1703936],
				"/lt/8/lib/ext/sunec.jar":[0,131072],
				"/lt/8/lib/ext/sunjce_provider.jar":[0,262144],
				"/lt/8/lib/ext/zipfs.jar":[0,131072],
				"/lt/8/jre/lib/meta-index":[0,131072],
				"/lt/8/jre/lib":[],
				"/lt/8/lib/ct.sym":[],
				"/lt/8/lib/currency.data":[0,131072],
				"/lt/8/lib/currency.properties":[],
			},
			"/Java-Web-Editor/tools.jar"
		]
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
		cheerpOSAddStringFile('/str/SystemInWrapper.java', encoder.encode(wrapperCode));
		
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


	let unsubSaveFiles: () => void;
	let unsubRunCode: () => void;

	$effect(() => {
		if ($runCode) {
				$runCode = false;
			($autoRun) ?  runCheerpj() : runCheerpj();
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
					cheerpOSAddStringFile('/str/' + file.path, encoder.encode(file.content));
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

		await runCheerpj();
	});

	onDestroy(() => {
		if (unsubSaveFiles) unsubSaveFiles();
		if (cjOutputObserver) cjOutputObserver.disconnect();
	});
</script>
