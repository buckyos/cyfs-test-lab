<template>
  <div v-loading="loading">
    <el-form
      :model="preSysInfo"
      :rules="sysRules"
      label-width="100px"
      ref="editForm"
      label-position="right"
      align="left"
    >
      <el-form-item label="全网版本" :label-width="formLabelWidth">
        <el-input
          v-model="formalVersion"
          autocomplete="off"
          size="100"
          disabled
        ></el-input>
      </el-form-item>
      <el-form-item label="全网发布时间" :label-width="formLabelWidth">
        <el-input
          v-model="formalPublishTime"
          autocomplete="off"
          size="100"
          disabled
        ></el-input>
      </el-form-item>
      <el-form-item
        label="预发布版本"
        :label-width="formLabelWidth"
        prop="version"
      >
        <el-input
          v-model="preSysInfo.version"
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
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="handleCommitPrePublish('editForm')" :disabled="buttonDisable"
        >预发布</el-button
      >
      <el-button @click="handleCommitPublish('editForm')" :disabled="buttonDisable">全网发布</el-button>
    </div>
  </div>
</template>

<script>
import { ConfigInfo } from "../data/config";
import { ValidatorHelper } from "../data/validtor";
import { SystemUpdateProvider } from "../data/SystemUpdateProvider";
export default {
  data() {
    let validVersion = (rule, value, callback) => {
      let ret = ValidatorHelper.validVersion(this.preSysInfo.version);
      if (!ret.succ) {
        callback(new Error(ret.msg));
      } else {
        callback();
      }
    };
    let validUploadfile = (rule, value, callback) => {
      if (!this.preSysInfo.url || !this.preSysInfo.url.length) {
        callback(new Error("请上传文件"));
      } else {
        callback();
      }
    };
    return {
      loading: false,
      buttonDisable: false,
      uploadFileList: [],
      uploadServer: ConfigInfo.uploadServer + "syspackage/",
      preSysInfo: {
        version: "",
        url: "",
        md5: ""
      },
      formalVersion: "",
      formalPublishTime: "",
      sysRules: {
        version: [{ validator: validVersion, trigger: "blur" }],
        uploadfile: [{ validator: validUploadfile, trigger: "change" }]
      }
    };
  },

  methods: {
    handleBeforeUpload: function(upfile, s2) {
      if (upfile.type !== "application/x-zip-compressed") {
        alert(`只能上传zip,type=${upfile.type}`);
        return false;
      }

      this.buttonDisable = true;
      return true;
    },

    handleOnUploadSucc: function(response, file, fileList) {
      this.buttonDisable = false;
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

      this.preSysInfo.url = response.url;
      this.preSysInfo.md5 = response.md5;
    },

    handleOnUploadError: function(index, row) {
      this.buttonDisable = false;
      alert("上传文件失败");
    },

    handleCommitPrePublish: function(formName) {
      let doCommit = () => {
        this.loading = true;
        SystemUpdateProvider.prepublish({
          url: this.preSysInfo.url,
          md5: this.preSysInfo.md5,
          version: this.preSysInfo.version
        }).then(value => {
          this.loading = false;
          if (value.succ && value.value.err.code === 0) {
            this.$message({
              message: `预发布成功`,
              type: "success"
            });
          } else {
            this.$message({
              message: `预发布失败！！msg=${value.msg}`,
              type: "warning"
            });
          }
          this.preSysInfo.url = '';
          this.preSysInfo.md5 = '';
          this.uploadFileList = [];
          this.handleShow();
        });
      };
      this.$refs[formName].validate(valid => {
        if (valid) {
          doCommit();
          this.$refs[formName].resetFields();
        } else {
          return false;
        }
      });
    },

    handleCommitPublish: function(formName) {
      let doCommit = () => {
        this.loading = true;
        SystemUpdateProvider.publish(this.preSysInfo.version).then(value => {
          this.loading = false;
          if (value.succ && value.value.err.code === 0) {
            this.$message({
              message: `全网发布成功`,
              type: "success"
            });
          } else {
            this.$message({
              message: `全网发布失败！！msg=${value.msg}`,
              type: "warning"
            });
          }

          this.handleShow();
        });
      };
      if (!this.preSysInfo.version || !this.preSysInfo.version.length) {
        alert('请先预发布版本');
        return;
      }
      doCommit();
    },

    handleShow: function() {
      SystemUpdateProvider.latest().then(value => {
        if (!value.succ) {
          this.$message({
            message: `获取最新版本信息失败！！msg=${value.msg}`,
            type: "warning"
          });
          return;
        }

        if (value.value.pre) {
          this.preSysInfo.version = value.value.pre.version;
        }

        if (value.value.formal) {
          this.formalVersion = value.value.formal.version;
          this.formalPublishTime = (new Date(value.value.formal.publishtime)).toLocaleString();
        }
      });
    }
  },

  created: function() {
    this.handleShow();
  }
};
</script>

<style>
</style>