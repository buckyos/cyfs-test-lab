<template>
  <div v-loading="loading">
    <el-table :data="StackReportList" border style="width: 100%">
      <el-table-column prop="id" label="id" width="300" align="center">
      </el-table-column>
      <el-table-column prop="version" label="测试版本" width="300" align="center"></el-table-column>
      <el-table-column prop="zip_url" label="测试报告压缩包" width="300" align="center">
        <template slot-scope="scope">
          <a :href="scope.row.zip_url" target="_blank" class="buttonText">点击下载测试报告</a>
        </template>
      </el-table-column>
      <el-table-column prop="testcase_url" label="测试报告链接" width="400" align="center">
        <template slot-scope="scope">
          <a :href="scope.row.testcase_url" target="_blank" class="buttonText">点击查看测试报告</a>
        </template>
      </el-table-column>
       <el-table-column prop="coverage_url" label="测试覆盖率" width="300" align="center">
        <template slot-scope="scope">
          <a :href="scope.row.coverage_url" target="_blank" class="buttonText">点击查看覆盖率</a>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="统计日期" width="300" align="center"></el-table-column>
    </el-table>
  </div>
</template>

<script>
import { StackReportProvider } from "../data/StackReportProvider";
export default {
  data() {
    let validJson = (rule, value, callback) => {
      try {
        let ret = JSON.parse(this.editInfo.env);
        callback();
      } catch (err) {
        callback(new Error('需要为JSON格式'));
      }
    };
    return {
      tagInputVisible: false,
      tagInputValue: '',
      currEditIndex: -1,
      currViewAgentid: "",
      currViewIndex: -1,
      loading: true,
      editLoading: false,
      viewLoading: false,
      dialogDetailVisible: false,
      dialogEditVisible: false,
      StackReportList: [],
      services: [],
      tasks: [],
      agentRules: {
        env: [{ validator: validJson, trigger: "change" }]
      },
    };
  },
  methods: {
    handleView: function(index, row) {
      this.viewLoading = true;
      this.dialogDetailVisible = true;
      this.currViewIndex = index;
      this.currViewAgentid = this.StackReportList[index].id;
      AgentProvider.getInstance()
        .worklist(this.currViewAgentid)
        .then(value => {
          if (value.agentid !== this.currViewAgentid) {
            return;
          }

          if (!value.succ) {
            this.dialogDetailVisible = false;
            this.$message({
              message: `获取消息失败，msg=${value.msg}`,
              type: "warning"
            });
            return;
          }

          this.viewLoading = false;
          this.services = value.worklist.services;
          this.tasks = value.worklist.tasks;
        });
    },
  },
  created: function() {
    StackReportProvider.getInstance()
      .list()
      .then(value => {
        this.loading = false;
        if (!value.succ) {
          this.$message({
            message: `更新失败！！msg=${value.msg}`,
            type: "warning"
          });
          return;
        }
        this.StackReportList = [];
        this.StackReportList = value.entrys;
      });
  },
};
</script>

<style>
.el-tag + .el-tag {
  margin-left: 10px;
}
.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
.input-new-tag {
  width: 90px;
  margin-left: 10px;
  vertical-align: bottom;
}
</style>