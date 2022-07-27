<template>
	<div class="base-charts">
		<img src="../../assets/baner.png" alt="">
	</div>
</template>

<script>
	import Stacked from './echarts/Stacked'
	import Dotted from './echarts/Dotted'
	export default {
	  name: 'Nofind',
		data(){
			return {
				
			}
		},
		components:{
			Stacked,
			Dotted
		}
	}
</script>
<style scoped>
.base-charts {
	width: 100%;
	overflow: hidden;
}
.list-item {
	padding-left: 20px;
	padding-right: 20px;
	overflow: hidden;
}
</style>
