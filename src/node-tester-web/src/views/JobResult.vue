<template>
<div>
            <el-select v-model="filterServiceid" size="mini">
            <el-option
              v-for="item in totalService"
              :key="item.serviceid"
              :label="item.servicename"
              :value="item.serviceid"
            ></el-option>
          </el-select>
&nbsp;&nbsp;
                <el-select v-model="filterJobId" :disabled="totalJobs.length===0 ? true : false" size="mini">
            <el-option
              v-for="item in totalJobs"
              :key="item.jobid"
              :label="item.desc"
              :value="item.jobid"
            ></el-option>
          </el-select>
    <el-row :gutter="0"></el-row>
          <el-row :gutter="0"></el-row>
          

  <el-table :data="jobResults" border :show-header="showHeader">
    <el-table-column>
      <template slot-scope="scope">
        <el-table :data="scope.row.tasks" border>
          <el-table-column label="任务基本信息" width="500px">
            <template
              slot-scope="scope1"
            >{{`任务：${scope1.row.desc}`}}<br/>{{`结果：总共运行${scope1.row.successtimes+scope1.row.failedtimes}次, 成功${scope1.row.successtimes}次`}}</template>
          </el-table-column>
          <el-table-column label="失败信息">
            <template slot-scope="scope1">
              <el-table :data="scope1.row.records" border :show-header="scope1.row.failedtimes === 0 ? false : true">
                <el-table-column label="机器" prop="agentid"></el-table-column>
                <el-table-column label="ID(logid-runningid)">
                  <template slot-scope="scope">
                    {{`${scope.row.logid}-${scope.row.runningid}`}}
                  </template>
                </el-table-column>
                <el-table-column label="时间">
                  <template slot-scope="scope">
                    {{`开始时间：${(new Date(scope.row.starttime)).toLocaleString()}`}}<br/>{{`结束时间：${(new Date(scope.row.finishtime)).toLocaleString()}`}}
                  </template>
                </el-table-column>
                <el-table-column label="失败原因" prop="msg"></el-table-column>
                <el-table-column label="日志信息">
                  <template slot-scope="scope2">
                    <a v-for="(url, index) in scope2.row.urls" target="_blank" v-bind:key="index" :href="url">下载日志<br/></a>
                  </template>
                </el-table-column>
              </el-table>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-table-column>
  </el-table>
</div>
</template>

<script>
import { JobProvider } from '../data/JobProvider';
import { ServiceProvider } from '../data/ServiceProvider';
export default {
  data() {
    return {
        showHeader: false,
        filterServiceid: '',
        totalService:'',
        filterJobId: '',
        totalJobs: [],
      jobResults: [],
    };
  },

  methods: {
    whenRecodeChange: function(taskResult) {
      if (taskResult.failedtimes === 0) {
        return [];
      }

      let recodes = [];
      for (let i = 0; i < taskResult.records.length; i++) {
        if (taskResult.records[i].result !== 0) {
          recodes.push(taskResult.records[i]);
        }
      }

      return recodes;
    }
  },

  watch: {
      filterJobId: function() {
         this.jobResults = [];
         if (this.filterJobId && this.filterJobId != '') {
            JobProvider.getInstance().jobresult(this.filterJobId).then((info) => {
                if (this.filterJobId !== info.jobid) {
                    return;
                }

                if (!info.succ) {
                    alert(info.msg);
                    return;
                }

                this.jobResults.push(info.result);
            });
         }
      },

      filterServiceid: function() {
        this.filterJobId = '';
         this.jobResults = [];
        this.totalJobs = [];
          JobProvider.getInstance().list();
      }
  },

  beforeCreate: function() {
      this.onJobListUpdate = p => {
          this.totalJobs = [];
          let total = p.getJobs();
        for (let e of total) {
            if (e.serviceid === this.filterServiceid) {
                this.totalJobs.push(e);
            }
        }
      }
      JobProvider.getInstance().on("listupdate", this.onJobListUpdate);

      this.onServiceListUpdate = p => {
          this.totalService = p.getServices();
        
      }
      ServiceProvider.getInstance().on("listupdate", this.onServiceListUpdate);
      ServiceProvider.getInstance().list();
  },

  destroyed: function() {
      JobProvider.getInstance().removeListener("listupdate",this.onJobListUpdate);
      ServiceProvider.getInstance().removeListener("listupdate", this.onServiceListUpdate);
  },
};
</script>

<style>
</style>