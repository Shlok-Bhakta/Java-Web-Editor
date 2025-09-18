<script lang="ts">
  import Editor from './lib/Editor.svelte';
  import CheerpJ from './lib/CheerpJ.svelte';
  import { onMount } from 'svelte';

  const path = window.location.pathname;
  console.log(path);
</script>

<div class="bg-black h-screen w-full">
  <Editor template_path={path}/>
</div>


<CheerpJ />
