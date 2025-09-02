<script lang="ts">
	import { onMount } from 'svelte';
	import { cheerpjState } from '../cheerpstate.svelte.js';
	import { cheerpjService } from '../cheerpj-service.js';

	let code = $state(`public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`);

	onMount(async () => {
		try {
			await cheerpjService.initialize();
		} catch (error) {
			console.error('Failed to initialize CheerpJ:', error);
		}
	});

	async function runCode() {
		try {
			// Clear previous state
			cheerpjService.reset();
			
			// Add the code as a file
			cheerpjState.addFile({
				name: 'HelloWorld.java',
				content: code,
				path: 'HelloWorld.java'
			});
			
			// Compile and run
			await cheerpjService.compileFiles();
			if (cheerpjState.lastCompilation?.success) {
				await cheerpjService.executeMain('HelloWorld');
			}
		} catch (error) {
			console.error('Error running code:', error);
		}
	}
</script>

<div class="p-4">
	<h1 class="text-xl mb-4">Java Editor</h1>
	
	<div class="mb-4">
		<textarea 
			bind:value={code}
			class="w-full h-64 p-2 border font-mono text-sm"
			placeholder="Write your Java code here..."
		></textarea>
	</div>
	
	<div class="mb-4">
		<button 
			onclick={runCode}
			disabled={cheerpjState.status !== 'ready'}
			class="px-4 py-2 bg-blue-500 text-white disabled:bg-gray-400"
		>
			{cheerpjState.isExecuting ? 'Running...' : 'Run'}
		</button>
	</div>

	<!-- CheerpJ automatically writes to this console element -->
	<pre id="console" class="border p-2 h-32 overflow-y-auto bg-black text-green-400 font-mono text-sm"></pre>
</div>