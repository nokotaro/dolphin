<template>
<div class="dp-global">
	<x-global-timeline @before="before()" @after="after()"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import Progress from '../scripts/loading';
import XGlobalTimeline from './index.global.timeline.vue';

export default Vue.extend({
	metaInfo() {
		return {
			title: this.$t('globalTimeline')
		};
	},
	components: {
		XGlobalTimeline
	},
	methods: {
		before() {
			Progress.start();
		},
		after() {
			Progress.done();
		}
	}
});
</script>
