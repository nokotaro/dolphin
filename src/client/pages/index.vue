<template>
<component :is="$store.getters.isSignedIn ? 'home' : 'welcome'"></component>
</template>

<script lang="ts">
import Vue from 'vue';
import Home from './index.home.vue';
import Global from './index.global.vue';

export default Vue.extend({
	components: {
		Home,
		Global,
		Welcome: () => import('./index.welcome.vue').then(m => m.default),
	}
});
</script>
