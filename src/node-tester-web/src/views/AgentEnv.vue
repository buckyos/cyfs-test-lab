<template>
  <div class="el-tag">
    <el-input
    style="width:300px"
              size="mini"
             v-if="editModel"
              v-model="env"
              ref="saveInput"
              @keyup.enter.native="handleInputConfirm"
              @blur="handleInputConfirm"
            ></el-input>
             <span v-else>{{env}}</span>
    <i class="el-icon-close"></i>
    <i class="el-icon-edit" @click="showInput"></i>
&nbsp;&nbsp;
  </div>
</template>

<script>
export default {
    data() {
        return {
            editModel: false,
            env: 123,
        }
    },
    methods: {
        handleCloseTag: function(tag) {
      this.editInfo.tags.splice(this.editInfo.tags.indexOf(tag), 1);
    },

    showInput: function() {
      this.editModel = true;
      this.$nextTick(_ => {
        this.$refs.saveInput.$refs.input.focus();
      });
    },

    handleInputConfirm: function() {
      this.editModel = false;
    },
    }
};
</script>

<style>
.el-icon-edit {
  border-radius: 50%;
  text-align: center;
  position: relative;
  cursor: pointer;
  font-size: 12px;
  height: 16px;
  width: 16px;
  line-height: 16px;
  top: 0px;
  right: -5px;
  color: #409eff;
  vertical-align: middle;
}

i:hover {
  background-color: #409eff;
}
.env {
    background-color: rgba(64,158,255,.1);
    padding: 0 10px;
    height: 32px;
    width: fit-content;
    line-height: 30px;
    font-size: 12px;
    color: #409EFF;
    border-radius: 4px;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    border: 1px solid rgba(64,158,255,.2);
    white-space: nowrap;
}
.env-edit-input {
    height: 28px;
  top: 2px;
  right: -5px;
}
</style>