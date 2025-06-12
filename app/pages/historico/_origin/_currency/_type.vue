<script lang="ts">
// This component re-exports the _currency/index.vue component
// This way, any updates to _currency/index.vue will automatically apply to this route
// Route: /historico/:origin/:currency/:type
import CurrencyComponent from './index.vue'

export default CurrencyComponent
</script>
