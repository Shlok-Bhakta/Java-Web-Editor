<script lang="ts">
	import { onMount } from 'svelte';
	import { cheerpjState } from '../cheerpstate.svelte.js';
	import { cheerpjService } from '../cheerpj-service.js';

	let inputValue = $state('');

	onMount(async () => {
		try {
			await cheerpjService.initialize();
		} catch (error) {
			console.error('Failed to initialize CheerpJ:', error);
		}
	});

	function addSampleFile() {
		const sampleJavaCode = `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println("CheerpJ is working!");
        
        // Test Scanner functionality
        java.util.Scanner scanner = new java.util.Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
        scanner.close();
    }
}`;
		
		cheerpjService.reset();
		cheerpjState.addFile({
			name: 'HelloWorld.java',
			content: sampleJavaCode,
			path: 'HelloWorld.java'
		});
	}

	async function compileAndRun() {
		try {
			await cheerpjService.compileFiles();
			if (cheerpjState.lastCompilation?.success) {
				await cheerpjService.executeMain('HelloWorld');
			}
		} catch (error) {
			console.error('Error during compile/run:', error);
		}
	}

	function provideInput() {
		if (inputValue.trim()) {
			cheerpjService.provideInput(inputValue);
			cheerpjState.addConsoleOutput(`> ${inputValue}`);
			inputValue = '';
		}
	}

	function clearConsole() {
		cheerpjState.clearConsole();
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<h1 class="text-2xl font-bold mb-4">CheerpJ Java Editor Demo</h1>
	
	<!-- Status Display -->
	<div class="mb-4 p-3 rounded-lg {cheerpjState.status === 'ready' ? 'bg-green-100 text-green-800' : 
		cheerpjState.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
		<strong>Status:</strong> {cheerpjState.status.toUpperCase()}
		{#if cheerpjState.initError}
			<br><strong>Error:</strong> {cheerpjState.initError}
		{/if}
	</div>

	<!-- Controls -->
	<div class="mb-4 space-x-2">
		<button 
			onclick={addSampleFile}
			class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
			Load Sample File
		</button>
		
		<button 
			onclick={compileAndRun}
			disabled={cheerpjState.status !== 'ready' || cheerpjState.files.length === 0 || cheerpjState.isCompiling || cheerpjState.isExecuting}
			class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
		>
			{#if cheerpjState.isCompiling}
				Compiling...
			{:else if cheerpjState.isExecuting}
				Running...
			{:else}
				Compile & Run
			{/if}
		</button>
		
		<button 
			onclick={clearConsole}
			class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
		>
			Clear Console
		</button>
	</div>

	<!-- File Display -->
	{#if cheerpjState.activeFile}
		<div class="mb-4">
			<h3 class="text-lg font-semibold mb-2">Current File: {cheerpjState.activeFile.name}</h3>
			<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">{cheerpjState.activeFile.content}</pre>
		</div>
	{/if}

	<!-- Console Output -->
	<div class="mb-4">
		<h3 class="text-lg font-semibold mb-2">Console Output</h3>
		<div class="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
			{#each cheerpjState.consoleOutput as line}
				<div>{line}</div>
			{/each}
			{#if cheerpjState.waitingForInput}
				<div class="text-yellow-400">Waiting for input...</div>
			{/if}
		</div>
		
		<!-- Input for Scanner -->
		{#if cheerpjState.waitingForInput}
			<div class="mt-2 flex gap-2">
				<input 
					bind:value={inputValue}
					onkeydown={(e) => e.key === 'Enter' && provideInput()}
					placeholder="Enter input for Java program..."
					class="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button 
					onclick={provideInput}
					class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Send
				</button>
			</div>
		{/if}
	</div>

	<!-- File List -->
	{#if cheerpjState.files.length > 0}
		<div class="mb-4">
			<h3 class="text-lg font-semibold mb-2">Project Files</h3>
			<ul class="list-disc list-inside">
				{#each cheerpjState.files as file}
					<li class="py-1">
						<button 
							onclick={() => cheerpjState.setActiveFile(file.name)}
							class="text-blue-600 hover:underline {file === cheerpjState.activeFile ? 'font-bold' : ''}"
						>
							{file.name}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>