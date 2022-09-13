<template>
  <div v-loading="loading">

    <el-table :data="agentList" border style="width: 100%">
      <el-table-column prop="agentid" label="机器ID" width="500"></el-table-column>
      <el-table-column prop="env" label="网络环境"></el-table-column>
      <el-table-column label="节点标签">
        <template slot-scope="scope">
          <el-tag
            v-for="tag in handleParseJson(scope.row.tags)"
            :key="tag"
            :disable-transitions="true"
          >{{tag}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="desc" label="描述" width="200"></el-table-column>
      <el-table-column label="系统版本" width="80" prop="version">
      </el-table-column>
      <el-table-column label="平台" width="80" prop="platform">
      </el-table-column>
      <el-table-column label="节点属性" width="80">
        <template slot-scope="scope">{{scope.row.accessible===1 ? "自建节点" : "外网节点"}}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template slot-scope="scope">
          <el-tag
          v-if="scope.row.status===1"
          type="success"
          disable-transitions>在线</el-tag>
          <el-tag
          v-else
          type="info"
          disable-transitions>离线</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { AgentProvider } from "../data/AgentProvider";
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
      editInfo: {
        desc: '',
        accessibleLabel: '0',
        tags:[],
        env:'[]',
        agentid: '',
      },
      currEditIndex: -1,
      currViewAgentid: "",
      currViewIndex: -1,
      loading: true,
      editLoading: false,
      viewLoading: false,
      dialogDetailVisible: false,
      dialogEditVisible: false,
      agentList: [],
      services: [],
      tasks: [],
      agentRules: {
        env: [{ validator: validJson, trigger: "change" }]
      },
    };
  },
  methods: {
    handleCloseTag: function(tag) {
      this.editInfo.tags.splice(this.editInfo.tags.indexOf(tag), 1);
    },

    showTagInput: function() {
      this.tagInputVisible = true;
      this.$nextTick(_ => {
        this.$refs.saveTagInput.$refs.input.focus();
      });
    },

    handleTagInputConfirm: function() {
      let tagInputValue = this.tagInputValue;
      if (tagInputValue) {
        this.editInfo.tags.push(tagInputValue);
      }
      this.tagInputVisible = false;
      this.tagInputValue = "";
    },

    handleParseJson: function(str) {
      return JSON.parse(str);
    },

    handleView: function(index, row) {
      this.viewLoading = true;
      this.dialogDetailVisible = true;
      this.currViewIndex = index;
      this.currViewAgentid = this.agentList[index].agentid;
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
    AgentProvider.getInstance()
      .list()
      .then(value => {
        this.loading = false;
        if (!value.succ) {
          this.$message({
            message: `更新机器列表失败！！msg=${value.msg}`,
            type: "warning"
          });
          return;
        }

        this.agentList = [];
        this.agentList = value.entrys;
      });
  },

  destroyed: function() {}
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