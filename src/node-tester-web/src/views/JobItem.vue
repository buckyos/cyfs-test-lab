<template>
  <div>
      <el-row :gutter="0">
      <el-col :span="3">
        <div class="grid-content bg-purple">{{job.jobid}}</div>
      </el-col>
      <el-col :span="8">
        <div class="grid-content bg-purple">{{job.desc}}</div>
      </el-col>
      <el-col :span="3">
        <div class="grid-content bg-purple">{{job.servicename}}</div>
      </el-col>
       <el-col :span="3">
        <div class="grid-content bg-purple">{{job.status === 1 ? "正在运行" : "已经结束"}}</div>
      </el-col>
      <el-col :span="7">
        <div class="grid-content bg-purple">
            <el-button size="mini" @click="handleExpand">{{btnTaskDetailText}}</el-button>
          <el-button size="mini" :type='calcJobItemOptBtnType' @click="handleStopOrStart">{{jobItemOptBtnText}}</el-button>
          <el-button size="mini" @click="handleDelete">删除</el-button>
        </div>
      </el-col>
      </el-row>
      <hr align="center" color="#987cb9" size="1" v-if="!taskshow"/>
    <el-table :data="jobTasks" show-header="false" highlight-current-row="true" border="true" style="width: 100%" v-if="taskshow">
      <el-table-column label="任务信息" align="center">
      <el-table-column prop="taskid" label="任务ID" width="180"></el-table-column>
      <el-table-column prop="desc" label="描述" width="180"></el-table-column>
      <el-table-column prop="timeslimit" label="计划运行次数"></el-table-column>
      <el-table-column label="运行状态" v-if="job.status === 1?true:false">
        <template slot-scope="scope">
          {{scope.row.status === 1 ? "正在运行" : "已经结束"}}
        </template>
      </el-table-column>
      <el-table-column label="已经运行次数" v-if="job.status === 1?true:false">
        <template slot-scope="scope">
          {{scope.row.status === 1 ? (scope.row.successtimes + scope.row.failedtimes) : 0}}
        </template>
      </el-table-column>
      <el-table-column label="操作" v-if="job.status === 1?true:false">
        <template slot-scope="scope">
          <el-button size="mini"  type="danger" :disabled="scope.row.status === 1 ? false : true" @click="$emit('stopclick', index, scope.$index)">停止</el-button>
        </template>
      </el-table-column>
      </el-table-column>
    </el-table>
    <hr align="center" color="#987cb9" size="1" v-if="taskshow"/>
  </div>
</template>

<script>
export default {
  data() {
    return {
        btnTaskDetailText: '展开任务详情',
        jobItemOptBtnText: '',
        taskshow: false,
    };
  },
  props: ['index', 'job', 'jobTasks'],
  methods: {
    handleExpand: function() {
        if (this.taskshow) {
            this.$emit('expand', this, false, this.index);
            this.taskshow = !this.taskshow;
            this.btnTaskDetailText = '展开任务详情';
        } else {
            this.$emit('expand', this, true, this.index);
            this.taskshow = !this.taskshow;
            this.btnTaskDetailText = '收起任务详情';
        }
    },

    handleStopOrStart: function() {
      if (this.job.status === 1) {
        this.$emit('stop', this, this.index);
      } else {
        this.$emit('start', this, this.index);
      }
    },

    handleDelete: function() {
        this.$emit('delete', this, this.index);
    }
  },

  computed: {
      calcJobItemOptBtnType: function() {
          if (this.job.status === 1) {
              this.jobItemOptBtnText = '停止工作';
              return 'danger';
          } else {
              this.jobItemOptBtnText = '开始工作';
              return 'success';
          }
      }
  }
};
</script>


<style>
.el-row {
  margin-bottom: 5px;
}
.el-col {
  border-radius: 4px;
}
.bg-purple-dark {
  background: #99a9bf;
}
.bg-purple-light {
  background: #e5e9f2;
}
.grid-content {
  border-radius: 4px;
  min-height: 20px;
}
.row-bg {
  padding: 10px 0;
  background-color: #f9fafc;
}
</style>