<template>
  <div>
    <el-row :gutter="0">
      <el-col :span="3">
        <div class="grid-content bg-purple">工作ID</div>
      </el-col>
      <el-col :span="8">
        <div class="grid-content bg-purple">工作描述</div>
      </el-col>
      <el-col :span="3">
        <div class="grid-content bg-purple">软件包名称</div>
      </el-col>
      <el-col :span="3">
        <div class="grid-content bg-purple">工作状态</div>
      </el-col>
      <el-col :span="7">
        <div class="grid-content bg-purple">
          <el-button size="mini" type="success" @click="handleAddNew"
            >新增</el-button
          >
          <el-select v-model="filterJobSelectedServiceid" size="mini">
            <el-option
              v-for="item in totalServices"
              :key="item.serviceid"
              :label="item.servicename"
              :value="item.serviceid"
            ></el-option>
          </el-select>
        </div>
      </el-col>
    </el-row>
    <hr align="center" color="#987cb9" size="1" />
    <jobitem
      v-for="(job, index) in jobs"
      v-bind:key="index"
      v-bind:index="index"
      v-bind:job="job"
      v-bind:jobTasks="expandedJobTasks"
      @stopclick="handleStopJobTask"
      @expand="handleExpand"
      @start="handleJobStart"
      @stop="handleJobStop"
      @delete="handleJobDelete"
    ></jobitem>

    <el-dialog title="新建工作" :visible.sync="dialogVisible" :before-close="handleAddNewJobDialogBeforClose">
      <el-form :model="addNewJobForm" label-width="100px" ref="addForm" :rules="addNewJobRules" label-position="right" align="left">
        <el-form-item label="描述" :label-width="formLabelWidth" prop="desc">
          <el-input
            type="textarea"
            v-model="addJobDesc"
            autocomplete="off"
          ></el-input>
        </el-form-item>
        <el-form-item label="测试软件选择" :label-width="formLabelWidth">
          <el-select
            v-model="addJobSelectedServiceid"
            placeholder="请选择软件"
            size="mini"
          >
            <el-option
              v-for="item in addJobTotalServices"
              :key="item.serviceid"
              :label="item.servicename"
              :value="item.serviceid"
            ></el-option>
          </el-select>
          <el-button size="mini" @click="handleSelectTask">配置任务</el-button>
        </el-form-item>
        <el-form-item label="选择的任务" :label-width="formLabelWidth" prop="tasks">
          <el-table
            :data="addJobSelectedTask"
            border="true"
            :show-header="selectedTaskTableHeaderShow"
            highlight-current-row="true"
            style="width: 100%"
            v-if="calcSelectedTaskVisible"
          >
            <el-table-column
              prop="taskid"
              label="任务ID"
              width="180"
            ></el-table-column>
            <el-table-column
              prop="desc"
              label="任务描述"
              width="180"
            ></el-table-column>
            <el-table-column prop="timeslimit" label="运行次数"></el-table-column>
            <el-table-column label="操作">
              <template slot-scope="scope">
                <el-button type="text" @click="handleDeleteSelectedTask(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="handleAddNewJobDialogBeforClose">取 消</el-button>
        <el-button type="primary" @click="handleNewJobCommit('addForm')">确 定</el-button>
      </div>

      <el-dialog :visible.sync="dialogTaskSelectVisible" append-to-body>
        <newjobtaskselector
          v-model="addJobSelectedTask"
          v-bind:tasks="addJobSelectedServiceTasks"
        ></newjobtaskselector>
        <div slot="footer" class="dialog-footer">
          <el-button type="primary" @click="handleSelectTaskCommit"
            >关 闭</el-button
          >
        </div>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script>
import { JobProvider } from '../data/JobProvider';
import { ServiceProvider } from '../data/ServiceProvider';
import { ValidatorHelper } from '../data/validtor';
import { TaskProvider } from '../data/TaskProvider';
export default {
  data() {
    let descNotEmpty = (rule, value, callback) => {
      let ret = ValidatorHelper.notEmpty(this.addJobDesc);
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };

    let mustSelectTask = (rule, value, callback) => {
      if (this.addJobSelectedTask.length === 0) {
        callback(new Error("请配置任务信息"));
      } else {
        callback();
      }
    };

    return {
      selectedTaskTableHeaderShow: false,
      dialogVisible: false,
      dialogTaskSelectVisible: false,

      addNewJobForm: [],
      
      //添加Job时候的描述信息
      addJobDesc: '',
      //添加Job时候选中的任务列表
      addJobSelectedTask: [
        // {
        //   taskid: "1",
        //   desc: '这个是任务1',
        //   timeslimit: 2,
        // }
      ],
      //添加job的时候选中的软件的任务列表
      addJobSelectedServiceTasks: [
        // {
        //   taskid: "1",
        //   desc: "这个是任务1"
        // },
        // {
        //   taskid: "2",
        //   desc: "这个是任务2"
        // }
      ],
      //添加job的时候选中的软件
      addJobSelectedServiceid: '',
      //添加job的时候的软件列表
      addJobTotalServices: [],
      
      //过滤job的软件列表
      totalServices: [],
      //当前选中的过滤的软件
      filterJobSelectedServiceid: "0",

      //当前展开的item
      lastExpandItem: -1,
      //当前展开的jobid
      currExpandJobid: '',
      //当前展开的job的task信息列表
      expandedJobTasks: [],

      //job列表
      jobs: [],

      //添加任务的form表单检查规则
      addNewJobRules: {
        desc: [{ validator: descNotEmpty, trigger: "blur" }],
        tasks: [{ validator: mustSelectTask, trigger: "change" }],
      },
    };
  },

  methods: {
    handleSelectTask: function() {
      TaskProvider.getInstance().list();
      this.dialogTaskSelectVisible = true;
    },

    handleDeleteSelectedTask: function(index) {
      this.addJobSelectedTask.splice(index, 1);
    },

    handleAddNew: function() {
      this.addJobSelectedTask = [];
      this.addJobDesc = '';
      this.dialogVisible = true;
    },

    handleAddNewJobDialogBeforClose: function() {
      this.dialogVisible = false;
      this.$refs['addForm'].resetFields();
    },

    handleNewJobCommit: function(formName) {
      let doCommit = () => {
        let servicename = '';
        for(let item of this.addJobTotalServices) {
          if (item.serviceid === this.addJobSelectedServiceid) {
            servicename = item.servicename;
            break;
          }
        }
        JobProvider.getInstance().add({
          serviceid: this.addJobSelectedServiceid,
          servicename,
          desc: this.addJobDesc,
          tasks: this.addJobSelectedTask,
        });
      };
      this.$refs[formName].validate(valid => {
        if (valid) {
          doCommit();
          this.handleAddNewJobDialogBeforClose();
        } else {
          return false;
        }
      });
    },

    handleSelectTaskCommit: function() {
      this.dialogTaskSelectVisible = false;
    },

    handleStopJobTask: function(jobIndex, taskIndex) {
      alert(111);
      TaskProvider.stopTask(this.jobs[jobIndex].jobid, this.expandedJobTasks[taskIndex].taskid).then((value) => {
        if (!value.succ) {
           this.$message({
            message: `停止任务失败！！msg=${value.msg}`,
            type: "warning"
          });
          return;
        }

        if (this.lastExpandItem !== -1) {
          this.lastExpandItem.handleExpand();
        }
      });
    },

    handleJobStart: function(jobItem, index) {
      JobProvider.getInstance().start(this.jobs[index].jobid);
    },

    handleJobStop: function(jobItem, index) {
      JobProvider.getInstance().stop(this.jobs[index].jobid);
    },

    handleJobDelete: function(jobItem, index) {
      JobProvider.getInstance().remove(this.jobs[index].jobid);
    },

    handleExpand: function(jobItem, bExpand, jobIndex) {
      if (!bExpand) {
        this.lastExpandItem = -1;
        this.currExpandJobid = '';
      } else {
        if (this.lastExpandItem !== -1) {
          this.lastExpandItem.handleExpand();
        }

        this.lastExpandItem = jobItem;
        this.currExpandJobid = this.jobs[jobIndex].jobid;
        this.expandedJobTasks = [];

        JobProvider.getInstance().listtask(this.currExpandJobid);
      }
    },

    handleFilterJobs: function(jobs, serviceid) {
      if (serviceid === '0') {
        return jobs;
      }

      let out = [];
      for(let job of jobs) {
        if (job.serviceid === serviceid) {
          out.push(job);
        }
      }

      return out;
    },
  },

  computed: {
    calcSelectedTaskVisible: function() {
      return this.addJobSelectedTask.length > 0 ? true: false;
    }
  },

  watch: {
   filterJobSelectedServiceid: function() {
     if (this.lastExpandItem !== -1) {
          this.lastExpandItem.handleExpand();
        }
     this.jobs = this.handleFilterJobs(JobProvider.getInstance().getJobs(), this.filterJobSelectedServiceid);
   },

   addJobSelectedServiceid: function() {
     this.addJobSelectedServiceTasks = [];
     this.addJobSelectedTask = [];
   }
  },

  beforeCreate: function() {
    this.onErrorCB = (p, opt, msg) => {
      this.$message({
        message: `工作计划,操作'${opt}'失败,信息:'${msg}'`,
        type: "warning"
      });
    };
    JobProvider.getInstance().on("opterror", this.onErrorCB);

    this.onListUpdateCB = p => {
      this.jobs = this.handleFilterJobs(JobProvider.getInstance().getJobs(), this.filterJobSelectedServiceid);
    };
    JobProvider.getInstance().on("listupdate", this.onListUpdateCB);
    JobProvider.getInstance().list();

    this.onItemUpdateCB = (p, jobid) => {
      if (this.currExpandJobid === jobid) {
        this.expandedJobTasks = p.getJobTasks(jobid);
      }
    };
    JobProvider.getInstance().on('itemupdate', this.onItemUpdateCB);

    this.onServiceListUpdateCB = p => {
      this.totalServices = [];
      this.totalServices.push({serviceid: '0', servicename: '所有任务'});
      this.totalServices = this.totalServices.concat(p.getServices());
      let i = 0;
      for (;i < this.totalServices.length; i++) {
        if (this.filterJobSelectedServiceid === this.totalServices[i].serviceid) {
          break;
        }
      }
      if (i === this.totalServices.length) {
        this.filterJobSelectedServiceid = '0';
      }

      this.addJobTotalServices =  p.getServices();
      if (!this.addJobSelectedServiceid || this.addJobSelectedServiceid.length === 0) {
        if (this.addJobTotalServices.length > 0) {
          this.addJobSelectedServiceid = this.addJobTotalServices[this.addJobTotalServices.length - 1].serviceid;
        } else {
          this.addJobSelectedServiceid = '';
        }
      }
    }
    ServiceProvider.getInstance().on("listupdate", this.onServiceListUpdateCB);
    ServiceProvider.getInstance().list();

    this.onTaskListUpdate = p => {
      this.addJobSelectedServiceTasks = [];
      let tasks = p.getTasks();
      for (let entry of tasks) {
        if (entry.serviceid === this.addJobSelectedServiceid) {
          this.addJobSelectedServiceTasks.push({
            taskid: entry.taskid,
            desc: entry.desc,
            checked: false,
            timeslimit: 1, 
          });
        }
      }
    }
    TaskProvider.getInstance().on("listupdate", this.onTaskListUpdate)
  },

  destroyed: function() {
    JobProvider.getInstance().removeListener("listupdate",this.onListUpdateCB);
    JobProvider.getInstance().removeListener("opterror", this.onErrorCB);
    JobProvider.getInstance().removeListener("itemupdate", this.onItemUpdateCB);
    ServiceProvider.getInstance().removeListener("listupdate", this.onServiceListUpdateCB);
  }
};
</script>

<style>
</style>