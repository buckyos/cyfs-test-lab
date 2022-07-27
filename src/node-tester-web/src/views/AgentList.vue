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
      <el-table-column label="操作" width="200">
        <template slot-scope="scope">
          <el-button size="mini" @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
          <el-button size="mini" @click="handleView(scope.$index, scope.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog :visible.sync="dialogDetailVisible">
      <div v-loading="viewLoading">
        <el-table :data="services" border>
          <el-table-column label="软件信息" align="center">
            <el-table-column prop="serviceid" label="软件ID" width="200"></el-table-column>
            <el-table-column prop="servicename" label="软件名称"></el-table-column>
            <el-table-column label="运行状态" width="150">
              <template slot-scope="scope">{{scope.row.status === 1 ? '正在运行' : '没有运行' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template slot-scope="scope">
                <el-button
                  size="mini"
                  @click="handleStopService(scope.$index, scope.row)"
                  :disabled="scope.row.status === 1 ? false : true"
                >停止运行</el-button>
              </template>
            </el-table-column>
          </el-table-column>
        </el-table>

        <el-row :gutter="0"></el-row>

        <el-table :data="tasks" border>
          <el-table-column label="正在运行任务" align="center">
            <el-table-column property="taskid" label="任务ID" width="200"></el-table-column>
            <el-table-column property="desc" label="任务描述"></el-table-column>
            <el-table-column label="操作" width="200">
              <template slot-scope="scope">
                <el-button size="mini" @click="handleStopTask(scope.$index, scope.row)">停止运行</el-button>
              </template>
            </el-table-column>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog title="信息编辑" :visible.sync="dialogEditVisible">
      <div v-loading="editLoading">
        <el-form :model="editInfo" label-width="100px" label-position="right" align="left" :rules="agentRules">
          <el-form-item label="描述" :label-width="formLabelWidth">
            <el-input type="textarea" v-model="editInfo.desc" autocomplete="off"></el-input>
          </el-form-item>
          <el-form-item label="节点属性" :label-width="formLabelWidth" align="left">
            <el-select v-model="editInfo.accessibleLabel" placeholder="请选择标识">
              <el-option label="自建节点" value="1"></el-option>
              <el-option label="外网节点" value="0"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="节点标签" :label-width="formLabelWidth">
            <!--el-input v-model="editInfo.tags" autocomplete="off"></el-input-->
            <el-tag
              :key="tag"
              v-for="tag in editInfo.tags"
              closable
              :disable-transitions="false"
              @close="handleCloseTag(tag)"
            >{{tag}}</el-tag>
            <el-input
              class="input-new-tag"
              style="width:90px"
              v-if="tagInputVisible"
              v-model="tagInputValue"
              ref="saveTagInput"
              size="small"
              @keyup.enter.native="handleTagInputConfirm"
              @blur="handleTagInputConfirm"
            ></el-input>
            <el-button v-else class="button-new-tag" size="small" @click="showTagInput">+ New Tag</el-button>
          </el-form-item>
          <el-form-item label="网络环境" :label-width="formLabelWidth" prop='env'>
            <el-input type="textarea" v-model="editInfo.env" autocomplete="off"></el-input>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="dialogEditVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleEditSure">确 定</el-button>
        </div>
      </div>
    </el-dialog>
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

    handleEdit: function(index, row) {
      this.currEditIndex = index;
      
      this.editInfo.agentid = this.agentList[index].agentid
      this.editInfo.desc = this.agentList[index].desc
      this.editInfo.env = this.agentList[index].env;
      this.editInfo.tags = JSON.parse(this.agentList[index].tags);
      this.editInfo.accessibleLabel = this.agentList[index].accessible.toString();
      this.dialogEditVisible = true;
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

    handleStopService: function(index) {
      alert("handleStopService");
    },

    handleStopTask: function(index) {
      alert("handleStopTask");
    },

    handleEditSure: function() {
      this.editLoading = true;
      AgentProvider.getInstance()
        .update(
          this.editInfo.agentid,
          this.editInfo.env,
          this.editInfo.desc,
          parseInt(this.editInfo.accessibleLabel),
          JSON.stringify(this.editInfo.tags)
        )
        .then(value => {
          this.editLoading = false;
          this.dialogEditVisible = false;
          if (!value.succ) {
            this.$message({
              message: `更新机器信息失败，msg=${value.msg}`,
              type: "warning"
            });
            return;
          }

          this.agentList[this.currEditIndex] = JSON.parse(JSON.stringify(this.editInfo));
          this.agentList[this.currEditIndex].accessible = parseInt(
            this.editInfo.accessibleLabel
          );
        });
    }
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