<script>
  import Header from "../components/UI/Header.svelte";
  export let segment;
</script>

<style>
  main {
    margin-top: 5rem;
  }
</style>

<Header />

<main>
  <slot />
</main>
