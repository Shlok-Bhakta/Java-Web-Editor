<script lang="ts">
  import { on } from 'svelte/events';
    import { files, runCode } from './repl/state';
  import { onMount } from 'svelte';
    type EditorProps = {
        template_path: string;
    }
    const props: EditorProps = $props();

    // fetch all the stuff in the location
    async function fetchFiles() {
        let filedata: string[] = [];
        await fetch(props.template_path + '/pathlist.json')
            .then(response => response.json())
            .then(data => {
                console.log(data);
                filedata = data;
            }).catch(err => { 
                console.log(err)
                $files = [{ path: 'Main.java', content: "public class Main { public static void main(String[] args) { System.out.println(\"Something failed in the fetch. Contact a TA.\"); }}" }];
                return;
            });
        for (let i = 0; i < filedata.length; i++) {
            await fetch(props.template_path + '/' + filedata[i])
                .then(response => response.text())
                .then(data => {
                    console.log(data);
                    $files.push({ path: filedata[i], content: data });
                })
        }
    }
</script>

{#await fetchFiles()}
    <p>Loading...</p>
{:then _} 
    <textarea
    bind:value={$files[0].content}
    placeholder="Write some code here"
    class="bg-amber-300 w-2xl h-64"
    >
    </textarea>
    
    <button onclick={() => {console.log('run'); $runCode = true;}} class="w-30 bg-amber-300 h-20">Run</button>
{/await}


<pre id="console" class="bg-white text-black border-2 border-amber-50"></pre>