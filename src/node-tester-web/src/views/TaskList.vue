<template>
  <div>
    <el-button type="success" @click="handleAddNew">新增</el-button>
    <el-table :data="taskInfos" border style="width: 100%">
      <el-table-column prop="taskid" label="ID" width="200"></el-table-column>
      <el-table-column
        prop="servicename"
        label="所属软件"
        width="200"
      ></el-table-column>
      <el-table-column prop="version" label="版本" width="80"></el-table-column>
      <el-table-column label="文件" width="300">
        <template slot-scope="scope">
          <a target="_blank" download="task.zip" :href="scope.row.url">点击下载</a>
        </template>
      </el-table-column>
      <el-table-column prop="desc" label="描述"></el-table-column>
      <el-table-column label="执行要求" v-if="false">
        <template slot-scope="scope">
          {{ scope.row.runrule === 2 ? "可以并行" : "只能串行" }}
        </template>
      </el-table-column>
      <el-table-column label="部署要求">
        <template slot-scope="scope">
          {{ scope.row.distribute === 2 ? "与软件包同机器" : "任意部署" }}
        </template>
      </el-table-column>
      <el-table-column label="状态">
        <template slot-scope="scope">
        {{ scope.row.status === 1 ? "正在运行" : "没有运行" }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template slot-scope="scope">
          <el-button size="mini" @click="handleEdit(scope.$index, scope.row)"
            >编辑</el-button
          >
          <el-button size="mini" @click="handleDelete(scope.$index, scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="信息编辑" :visible.sync="dialogEditVisible" :before-close="handleDialogBeforClose" >
      <el-form
        :model="editTaskInfo"
        label-width="100px"
        ref="editForm"
        :rules="taskInfoRules"
        label-position="right" align="left"
      >
        <el-form-item
          label="ID"
          :label-width="formLabelWidth"
          v-if="editTaskInfo.idShow"
        >
          <el-input
            v-model="editTaskInfo.taskid"
            autocomplete="off"
            :disabled="true"
            size="100"
          ></el-input>
        </el-form-item>
        <el-form-item
          label="所属软件ID"
          :label-width="formLabelWidth"
          prop="serviceid"
        >
          <el-select
            v-model="editTaskInfo.serviceid"
            placeholder="请选择软件"
            v-bind:disable="editTaskInfo.serviceIdDisable"
          >
            <el-option
              v-for="item in editTaskInfo.services"
              :key="item.serviceid"
              :label="item.servicename"
              :value="item.serviceid"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="版本" :label-width="formLabelWidth" prop="version">
          <el-input
            v-model="editTaskInfo.version"
            autocomplete="off"
            size="100"
          ></el-input>
        </el-form-item>
        <el-form-item label="描述" :label-width="formLabelWidth" prop="desc">
          <el-input
            type="textarea"
            v-model="editTaskInfo.desc"
            autocomplete="off"
            size="100"
          ></el-input>
        </el-form-item>
        <el-form-item
          label="执行要求"
          :label-width="formLabelWidth"
          prop="runrule"
          v-if="false"
        >
          <el-radio-group v-model="editTaskInfo.runrule">
            <el-radio label="2" name="type" disabled >可以并行</el-radio>
            <el-radio label="1" name="type" disabled >只能串行</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="执行部署"
          :label-width="formLabelWidth"
          prop="distribute"
        >
          <el-radio-group v-model="editTaskInfo.distribute">
            <el-radio label="1" name="type">任意部署</el-radio>
            <el-radio label="2" name="type">与软件包同机器</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          label="文件"
          :label-width="formLabelWidth"
          prop="uploadfile"
        >
          <el-upload
            class="upload"
            :action="uploadServer"
            :before-upload="handleBeforeUpload"
            :on-error="handleOnUploadError"
            :on-success="handleOnUploadSucc"
            :on-exceed="handleUploadExceed"
            :file-list="uploadFileList"
            accept="zip"
          >
            <el-button size="small" type="primary">点击上传</el-button>
            <div slot="tip" class="el-upload__tip">只能上传zip文件</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="handleCancel('editForm')">取消</el-button>
        <el-button type="primary" @click="handleCommit('editForm')" :disabled="editSureDisable">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { TaskProvider, RunRule, DistributeRule } from "../data/TaskProvider";
import { ValidatorHelper } from "../data/validtor";
import { ConfigInfo } from '../data/config';
import { ServiceProvider } from '../data/ServiceProvider';
export default {
  data() {
    let validVersion = (rule, value, callback) => {
      let ret = ValidatorHelper.validVersion(this.editTaskInfo.version);
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };

    let notEmpty = (rule, value, callback) => {
      let ret = ValidatorHelper.notEmpty(value);
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };

    let descNotEmpty = (rule, value, callback) => {
      notEmpty(rule, this.editTaskInfo.desc, callback);
    };

    let serviceNotEmpty = (rule, value, callback) => {
      notEmpty(rule, this.editTaskInfo.serviceid.toString(), callback);
    };

    let runRuleNotEmpty = (rule, value, callback) => {
      notEmpty(rule, this.editTaskInfo.runrule, callback);
    };

    let destributeNotEmpty = (rule, value, callback) => {
      notEmpty(rule, this.editTaskInfo.distribute, callback);
    };

    let validUploadfile = (rule, value, callback) => {
      if (!this.editTaskInfo.url || !this.editTaskInfo.url.length) {
        callback(new Error("请上传文件"));
      } else {
        callback();
      }
    };

    return {
      uploadHeaders: {
        'Content-Type': 'application/octet-stream'
      },
      uploadServer: ConfigInfo.uploadServer + 'taskspackage/',
      editSureDisable: false,
      dialogEditVisible: false,
      uploadFileList: [],
      editTaskInfo: {
        services: [],
        taskid: '',
        serviceid: '',
        servicename: '',
        version: '',
        desc :'',
        runrule: '',
        distribute: '',
        md5: '',
        url: '',
      },
      taskInfos: [],
      serviceid: "",
      taskInfoRules: {
        serviceid: [{ validator: serviceNotEmpty, trigger: "blur" }],
        version: [{ validator: validVersion, trigger: "blur" }],
        desc: [{ validator: descNotEmpty, trigger: "blur" }],
        runrule: [{ validator: runRuleNotEmpty, trigger: "change" }],
        distribute: [{ validator: destributeNotEmpty, trigger: "change" }],
        uploadfile: [{ validator: validUploadfile, trigger: "change" }]
      }
    };
  },

  methods: {
    handleAddNew: function() {
      this.handleDialogBeforOpen();
      this.editTaskInfo.currEditIndex = -1;

      this.editTaskInfo.taskid = "";
      this.editTaskInfo.serviceid = "";
      this.editTaskInfo.version = "";
      this.editTaskInfo.desc = "";
      this.editTaskInfo.runrule = RunRule.atTheSameTime.toString();
      this.editTaskInfo.distribute = DistributeRule.anyWhere.toString();
      this.uploadFileList = [];

      this.editTaskInfo.idShow = false;
      this.editTaskInfo.serviceIdDisable = false;
      this.dialogEditVisible = true;
    },

    handleEdit: function(index, row) {
      this.handleDialogBeforOpen();
      this.editTaskInfo.currEditIndex = index;

      this.editTaskInfo.taskid = this.taskInfos[index].taskid;
      this.editTaskInfo.serviceid = this.taskInfos[index].serviceid;
      this.editTaskInfo.servicename = this.taskInfos[index].servicename;
      this.editTaskInfo.version = this.taskInfos[index].version;
      this.editTaskInfo.desc = this.taskInfos[index].desc;
      this.editTaskInfo.distribute = this.taskInfos[index].distribute.toString();
      this.editTaskInfo.runrule = this.taskInfos[index].runrule.toString();
      this.editTaskInfo.url = this.taskInfos[index].url;
      this.uploadFileList = [
        {
          url: this.editTaskInfo.url,
          name: this.editTaskInfo.url.substring(
            this.editTaskInfo.url.lastIndexOf("/") + 1
          )
        }
      ];

      this.editTaskInfo.idShow = true;
      this.editTaskInfo.serviceIdDisable = true;
      this.dialogEditVisible = true;
    },

    handleDelete: function(index, row) {
      TaskProvider.getInstance().remove(row.taskid);
    },

    handleDialogBeforOpen: function() {
      this.onServiceListUpdateCB = (p) => {
        this.editTaskInfo.services = p.getServices();
      };
      ServiceProvider.getInstance().on("listupdate", this.onServiceListUpdateCB);
      ServiceProvider.getInstance().list();
    },

    handleDialogBeforClose: function() {
      if (this.onServiceListUpdateCB) {
        ServiceProvider.getInstance().removeListener("listupdate", this.onServiceListUpdateCB);
        this.onServiceListUpdateCB = undefined;
      }
      this.dialogEditVisible = false;
      this.$refs['editForm'].resetFields();
    },

    handleCancel: function(formName) {
      this.handleDialogBeforClose();
    },

    handleCommit: function(formName) {
      let getServiceName = () => {
        for(let item of this.editTaskInfo.services) {
          if (item.serviceid === this.editTaskInfo.serviceid) {
            return item.servicename;
          }
        }

        return '';
      };
      let doCommit = () => {
        if (this.editTaskInfo.currEditIndex === -1) {
          TaskProvider.getInstance().add({
            serviceid: this.editTaskInfo.serviceid,
            servicename: getServiceName(),
            version: this.editTaskInfo.version,
            desc: this.editTaskInfo.desc,
            url: this.editTaskInfo.url,
            md5: this.editTaskInfo.md5,
            runrule: parseInt(this.editTaskInfo.runrule),
            distribute: parseInt(this.editTaskInfo.distribute),
          });
        } else {
          TaskProvider.getInstance().update({
            taskid: this.editTaskInfo.taskid,
            serviceid: this.editTaskInfo.serviceid,
            version: this.editTaskInfo.version,
            desc: this.editTaskInfo.desc,
            url: this.editTaskInfo.url,
            md5: this.editTaskInfo.md5,
            runrule: parseInt(this.editTaskInfo.runrule),
            distribute: parseInt(this.editTaskInfo.distribute),
          });
        }
      };
      this.$refs[formName].validate(valid => {
        if (valid) {
          doCommit();
          this.handleDialogBeforClose();
        } else {
          return false;
        }
      });
    },

    handleBeforeUpload: function(upfile, s2) {
      if (upfile.type !== "application/x-zip-compressed") {
        alert(`只能上传zip,type=${upfile.type}`);
        return false;
      }
      this.editSureDisable = true;

      return true;
    },

    handleUploadExceed: function(files, filelist) {
      if (!files.length) {
        return;
      }

      if (files.length + filelist.length > 1) {
        alert("选择文件太多，只能上传一个文件");
        return;
      }
    },

    handleOnUploadSucc: function(response, file, fileList) {
      this.editSureDisable = false;
      this.uploadFileList = this.uploadFileList;
      if (!response || !response.url || !response.md5) {
        return;
      }

      this.uploadFileList = [
        {
          name: response.url.substring(response.url.lastIndexOf("/") + 1),
          url: response.url
        }
      ];

      this.editTaskInfo.url = response.url;
      this.editTaskInfo.md5 = response.md5;
    },

    handleOnUploadError: function(index, row) {
      alert("上传文件失败");
      this.editSureDisable = false;
    }
  },

  created: function() {
    this.onListUpdateCB = p => {
      this.taskInfos = p.getTasks();
    };
    TaskProvider.getInstance().on("listupdate", this.onListUpdateCB);

    this.onErrorCB = (p, opt, msg) => {
      this.$message({
        message: `任务列表,操作'${opt}'失败,信息:'${msg}'`,
        type: "warning"
      });
    };
    TaskProvider.getInstance().on("opterror", this.onErrorCB);

    TaskProvider.getInstance().list();
  },

  destroyed: function() {
    TaskProvider.getInstance().removeListener(
      "listupdate",
      this.onListUpdateCB
    );

    TaskProvider.getInstance().removeListener("opterror", this.onErrorCB);
  }
};
</script>

<style>
</style>