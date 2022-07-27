<template>
  <div class="home-top">
    <div class="home-wrapper">
	</div>
  </div>
</template>

<script>
// @ is an alias to /src
export default {
  name: 'Nofind',
}
</script>
<style scoped>
  .home-top {
	width: 100%;
	height: 100%;
	overflow: hidden;
  }
  .home-wrapper {
	padding:15px;
  }
  .grid-content {
    min-height: 36px;
	text-align: center;
    font-size: 14px;
    border-radius: 6px;
    padding: 15px 0;
    color: #fff;
  }
  .list_number{
	font-size: 16px;
	font-weight: 700;
	padding-bottom: 5px;
  }
  .pay {
	background: #18a689;
  }
  .income{
	background-color: #9c0;
  }
  .hidden_investors{
	background-color: #3c9;
  }
  .intention_investors  {
	background-color: #3b5999;
  }
  .waitpending_investors {
	background-color: #6c9;
  }
  .pending_investors{
	background-color: #099;
  }
  .pass_investors {
	background-color: #f90;
  }
  .newadd_investors {
	background-color: #09c;
  }
</style>
