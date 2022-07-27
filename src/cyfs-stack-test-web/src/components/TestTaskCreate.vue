<template>
  <div class="TestTaskCreate">
	<el-dialog
		:title="dialog.title"
		type="primary"
		size="small"
		:close-on-press-escape = "false"
		:modal-append-to-body = "false"
		:close-on-click-modal = "false"
		:visible.sync="dialog.show">
		<el-form :model="formDate" ref="formdoalog" :rules="formdialog" label-width="100px">

			<!-- <el-form-item label="测试用例ID" prop="_id">
				<el-input type="text" v-model="formDate._id"></el-input>
			</el-form-item> -->
      <el-form-item label="用例集合名称" prop="name">
				<el-input type="text" v-model="formDate.name"></el-input>
			</el-form-item>
      <el-form-item label="系统" prop="system">
				<el-input type="text" v-model="formDate.system"></el-input>
			</el-form-item>
      <el-form-item label="模块" prop="module">
				<el-input type="text" v-model="formDate.module"></el-input>
			</el-form-item>
      
      <el-form-item label="设计人" prop="author">
				<el-input type="text" v-model="formDate.author"></el-input>
			</el-form-item>
      <el-form-item label="执行环境要求" prop="evn" >
				<el-input type="textarea" v-model="formDate.evn" :rows="3"></el-input>
			</el-form-item>
      <el-form-item label="配置文件" prop="configList" >
				<el-input type="textarea" v-model="formDate.configList" :rows="3"></el-input>
			</el-form-item>
      <el-form-item label="用例执行器" prop="testcaseRunner" >
				<el-input type="textarea" v-model="formDate.testcaseRunner" :rows="3"></el-input>
			</el-form-item>
      <el-form-item label="用例ID列表" prop="testcaseIds" >
				<el-input type="textarea" v-model="formDate.testcaseIds" :rows="3"></el-input>
			</el-form-item>

      <el-form-item label="用例脚本文件夹ID" prop="dirId" >
				<el-input type="textarea" v-model="formDate.dirId" :rows="3"></el-input>
			</el-form-item>

			<el-form-item>
				<el-button  @click="dialog.show = false">取消</el-button>
				<el-button type="primary"  @click="dialongAdd('formdoalog')">提交</el-button>
			</el-form-item>
		</el-form>
	</el-dialog>
  </div>
</template>

<script>
// @ is an alias to /src
export default {
  name: "TestTaskCreate",
  props: {
    dialog: Object,
    formDate: Object
  },
  data() {
    return {
      format_type_list: [
      ],
      formdialog: {
        id: [{ required: true, message: "测试用例ID不能为空", trigger: "blur" }],
        TestTaskId: [{ required: true, message: "自动化测试用例编号不能为空", trigger: "blur" }],
        TestTask_name: [{ required: true, message: "测试检查要点不能为空", trigger: "blur" }]
      }
    };
  },
  methods: {
    dialongAdd(formdoalog) {
      this.$refs[formdoalog].validate(valid => {
        if (valid) {
          // console.log(this.formDate)
          const url =
            this.dialog.option == "add" ? "add" : `edit/${this.formDate._id}`;
          this.$axios.post(`/api/TestTask/${url}`, this.formDate).then(res => {
            this.$message({
              message: "添加信息成功",
              type: "success"
            });
            this.dialog.show = false;
            // 更新数据
            this.$emit("update"); //传递父组件,进行视图更新
            //情况内容
            this.formDate = "";
          });
        }
      });
    }
  }
};
</script>
<style scoped>
</style>
