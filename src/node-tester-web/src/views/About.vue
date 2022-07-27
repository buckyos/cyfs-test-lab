<template>
  <div class="about">
    <h1>This is an about page</h1>

    <el-radio-group v-model="radio3" size="small">
      <el-radio label="0" >备选项1</el-radio>
      <el-radio label="1" >备选项2</el-radio>
    </el-radio-group>
  </div>
</template>

<script>
export default {
  data() {
    return {
      radio3: '1'
    }
  }
}
</script>

<style>

</style>
