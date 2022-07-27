<template>
  <div class="TestcaseCreate">
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
      <el-form-item label="自动化编号" prop="testcaseId">
				<el-input type="text" v-model="formDate.testcaseId"></el-input>
			</el-form-item>
      <el-form-item label="系统" prop="system">
				<el-input type="text" v-model="formDate.system"></el-input>
			</el-form-item>
      <el-form-item label="模块" prop="module">
				<el-input type="text" v-model="formDate.module"></el-input>
			</el-form-item>
      <el-form-item label="类型" prop="type">
				<el-input type="text" v-model="formDate.type"></el-input>
			</el-form-item>
      <el-form-item label="优先级" prop="priority">
				<el-input type="text" v-model="formDate.priority"></el-input>
			</el-form-item>
      <el-form-item label="等级" prop="level">
				<el-input type="text" v-model="formDate.level"></el-input>
			</el-form-item>
      <el-form-item label="设计人" prop="author">
				<el-input type="text" v-model="formDate.author"></el-input>
			</el-form-item>
      <el-form-item label="用例名称" prop="testcase_name">
				<el-input type="text" v-model="formDate.testcase_name"></el-input>
			</el-form-item>
      <el-form-item label="前置条件" prop="precondition">
				<el-input type="text" v-model="formDate.precondition"></el-input>
			</el-form-item>
      <el-form-item label="后置条件" prop="postcondition">
				<el-input type="text" v-model="formDate.postcondition" ></el-input>
			</el-form-item>
      <el-form-item label="预期结果" prop="expect_result" >
				<el-input type="textarea" v-model="formDate.expect_result" :rows="3"></el-input>
			</el-form-item>
      <el-form-item label="输入数据" prop="input_data">
				<el-input type="textarea" v-model="formDate.input_data" :rows="10"></el-input>
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
  name: "TestcaseCreate",
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
        testcaseId: [{ required: true, message: "自动化测试用例编号不能为空", trigger: "blur" }],
        testcase_name: [{ required: true, message: "测试检查要点不能为空", trigger: "blur" }]
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
          this.$axios.post(`/api/testcase/${url}`, this.formDate).then(res => {
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
