<script lang="ts">
  import Editor from './lib/Editor.svelte';
  import CheerpJ from './lib/CheerpJ.svelte';
  import { onMount } from 'svelte';

  let template_path = '';

  onMount(() => {
    const url = new URL(window.location.href);
    const file = url.searchParams.get('file') || 'scanner';
    const base = import.meta.env.BASE_URL;
    template_path = `${base}templates/${file}`;
    console.log(template_path);
  });
</script>

<div class="bg-black h-screen w-full">
  {#if template_path !== ''}
  <Editor {template_path}/>
  {/if}
</div>


<CheerpJ />
