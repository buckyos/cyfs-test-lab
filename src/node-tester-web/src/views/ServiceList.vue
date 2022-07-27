<template>
  <div>
    <el-button type="success" @click="handleAddNew">新增</el-button>
    <el-table :data="serviceInfos" border style="width: 100%">
      <el-table-column
        prop="serviceid"
        label="ID"
        width="200"
      ></el-table-column>
      <el-table-column
        prop="servicename"
        label="英文名称"
        width="80"
      ></el-table-column>
      <el-table-column prop="version" label="版本" width="80"></el-table-column>
      <el-table-column label="文件" width="300">
        <template slot-scope="scope">
          <a target="_blank" :href="scope.row.url">点击下载</a>
        </template>
      </el-table-column>
      <el-table-column label="部署节点">
        <template slot-scope="scope">
          {{ handleAgentScope(scope.row.agentscope) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template slot-scope="scope">
          <el-button size="mini" @click="handleEdit(scope.$index, scope.row)"
            >编辑</el-button
          >
          <el-button
            size="mini"
            @click="handleRemoveService(scope.$index, scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="信息编辑" :visible.sync="dialogEditVisible">
      <el-form
        :model="editServiceInfo"
        :rules="serviceInfoRules"
        label-width="80px"
        ref="editForm"
        label-position="right"
        align="left"
      >
        <el-form-item
          label="ID"
          :label-width="formLabelWidth"
          v-if="editServiceInfo.idShow"
        >
          <el-input
            v-model="editServiceInfo.serviceid"
            autocomplete="off"
            :disabled="true"
            size="100"
          ></el-input>
        </el-form-item>
        <el-form-item
          label="英文名称"
          :label-width="formLabelWidth"
          prop="servicename"
        >
          <el-input
            v-model="editServiceInfo.servicename"
            autocomplete="off"
            size="100"
          ></el-input>
        </el-form-item>
        <el-form-item label="版本" :label-width="formLabelWidth" prop="version">
          <el-input
            v-model="editServiceInfo.version"
            autocomplete="off"
            size="100"
          ></el-input>
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
        <el-form-item
          label="部署节点"
          :label-width="formLabelWidth"
          prop="agentscope"
        >
          <el-radio-group v-model="editServiceInfo.agentscope">
            <el-radio label="1" name="type">全部节点</el-radio>
            <el-radio label="2" name="type">自建节点</el-radio>
            <el-radio label="3" name="type">外网节点</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="win选项"
          :label-width="formLabelWidth"
          v-if="calcShowWinSelect"
        >
          <el-checkbox-group v-model="editServiceInfo.nowin">
            <el-checkbox label="1">排除外网window系统机器</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="handleCancel('editForm')">取 消</el-button>
        <el-button
          type="primary"
          @click="handleCommit('editForm')"
          :disabled="btnDisabled"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ServiceProvider, ServiceAgentScope } from "../data/ServiceProvider";
import { ValidatorHelper } from "../data/validtor";
import { ConfigInfo } from "../data/config";
export default {
  data() {
    let validServicename = (rule, value, callback) => {
      let ret = ServiceProvider.validServiceName(
        this.editServiceInfo.servicename
      );
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };

    let validVersion = (rule, value, callback) => {
      let ret = ValidatorHelper.validVersion(this.editServiceInfo.version);
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };
    let validUploadfile = (rule, value, callback) => {
      if (!this.editServiceInfo.url || !this.editServiceInfo.url.length) {
        callback(new Error("请上传文件"));
      } else {
        callback();
      }
    };

    return {
      showWinSelect: false,
      btnDisabled: false,
      uploadHeaders: {
        "Content-Type": "application/octet-stream"
      },
      uploadFileList: [],
      uploadServer: ConfigInfo.uploadServer + "servicespackage/",
      onListUpdateCB: null,
      onErrorCB: null,
      editServiceInfo: {
        currEditIndex: -1,
        serviceid: "",
        name: "",
        version: "",
        agentscope: "0",
        idShow: true,
        nowinSelect: [],
        nowin: 0,
      },
      dialogEditVisible: false,
      serviceInfos: [],

      serviceInfoRules: {
        servicename: [{ validator: validServicename, trigger: "blur" }],
        version: [{ validator: validVersion, trigger: "blur" }],
        uploadfile: [{ validator: validUploadfile, trigger: "change" }],
        agentscope: [
          { required: true, message: "请至少选择一个", trigger: "change" }
        ]
      }
    };
  },

  methods: {
    handleAgentScope(agentscope) {
      if (agentscope === ServiceAgentScope.all) {
        return "全部节点";
      }
      if (agentscope === ServiceAgentScope.lan) {
        return "自建节点";
      }

      if (agentscope === ServiceAgentScope.wan) {
        return "外网节点";
      }

      return "参数错误";
    },

    handleAddNew: function() {
      this.dialogEditVisible = true;
      this.editServiceInfo.currEditIndex = -1;
      this.editServiceInfo.idShow = false;
      this.editServiceInfo.serviceid = "";
      this.editServiceInfo.servicename = "";
      this.editServiceInfo.version = "";
      this.editServiceInfo.agentscope = ServiceAgentScope.lan.toString();
      this.uploadFileList = [];
    },

    handleRemoveService: function(index, row) {
      ServiceProvider.getInstance().remove(row.serviceid);
    },

    handleEdit: function(index, row) {
      this.editServiceInfo.currEditIndex = index;
      this.editServiceInfo.idShow = true;
      this.editServiceInfo.serviceid = this.serviceInfos[index].serviceid;
      this.editServiceInfo.servicename = this.serviceInfos[index].servicename;
      this.editServiceInfo.version = this.serviceInfos[index].version;
      this.editServiceInfo.url = this.serviceInfos[index].url;
      this.editServiceInfo.agentscope = this.serviceInfos[
        index
      ].agentscope.toString();
      this.editServiceInfo.nowin = this.serviceInfos[index].nowin;
      if (this.editServiceInfo.nowin && this.editServiceInfo.nowin.toString() === '1') {
        this.editServiceInfo.nowinSelect.push('1');
      }
      this.uploadFileList = [
        {
          url: this.editServiceInfo.url,
          name: this.editServiceInfo.url.substring(
            this.editServiceInfo.url.lastIndexOf("/") + 1
          )
        }
      ];

      this.dialogEditVisible = true;
    },

    handleBeforeUpload: function(upfile) {
      //this.xxx.toString();
      if (upfile.type !== "application/x-zip-compressed") {
        alert(`只能上传zip,type=${upfile.type}`);
        return false;
      }

      this.btnDisabled = true;
      return true;
    },

    handleOnUploadSucc: function(response, file, fileList) {
      this.btnDisabled = false;
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

      this.editServiceInfo.url = response.url;
      this.editServiceInfo.md5 = response.md5;
    },

    handleOnUploadError: function(index, row) {
      this.btnDisabled = false;
      alert("上传文件失败");
    },

    handleCancel: function(formName) {
      this.$refs[formName].resetFields();
      this.dialogEditVisible = false;
    },

    handleCommit: function(formName) {
      let doCommit = () => {
        if (this.editServiceInfo.nowinSelect.length) {
          this.editServiceInfo.nowin = 1;
        } else {
          this.editServiceInfo.nowin = 0;
        }
        if (this.editServiceInfo.currEditIndex === -1) {
          ServiceProvider.getInstance().add({
            servicename: this.editServiceInfo.servicename,
            version: this.editServiceInfo.version,
            url: this.editServiceInfo.url,
            md5: this.editServiceInfo.md5,
            agentscope: parseInt(this.editServiceInfo.agentscope),
            nowin:  this.editServiceInfo.nowin,
          });
        } else {
          let index = this.editServiceInfo.currEditIndex;
          ServiceProvider.getInstance().update({
            serviceid: this.editServiceInfo.serviceid,
            servicename: this.editServiceInfo.servicename,
            version: this.editServiceInfo.version,
            url: this.editServiceInfo.url,
            md5: this.editServiceInfo.md5,
            agentscope: parseInt(this.editServiceInfo.agentscope),
            nowin:  this.editServiceInfo.nowin,
          });
        }
      };
      this.$refs[formName].validate(valid => {
        if (valid) {
          this.dialogEditVisible = false;
          doCommit();
        } else {
          return false;
        }
      });
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

    
  },

  computed: {
    calcShowWinSelect: function() {
      if (this.editServiceInfo.agentscope !== ServiceAgentScope.lan.toString()) {
        return true;
      } else {
        return false;
      }
    },
  },

  created: function() {
    this.onListUpdateCB = p => {
      this.serviceInfos = p.getServices();
    };
    ServiceProvider.getInstance().on("listupdate", this.onListUpdateCB);

    this.onErrorCB = (p, opt, msg) => {
      this.$message({
        message: `软件列表,操作'${opt}'失败,信息:'${msg}'`,
        type: "warning"
      });
    };
    ServiceProvider.getInstance().on("opterror", this.onErrorCB);

    ServiceProvider.getInstance().list();
  },

  destroyed: function() {
    ServiceProvider.getInstance().removeListener(
      "listupdate",
      this.onListUpdateCB
    );

    ServiceProvider.getInstance().removeListener("opterror", this.onErrorCB);
  }
};
</script>