<template>
  <div>
      <el-row :gutter="0">
      <el-col :span="15">
           <el-checkbox  v-model="checked" :label="taskid" @change="handleChangeCheckBox">{{desc}}</el-checkbox>
      </el-col>
      <el-col :span="3"><div class="grid-content bg-purple">运行次数：</div></el-col>
      <el-col :span="6">
          <el-input-number size="mini" :disabled="!checked" v-model.number="timeslimit" autocomplete="off" min="1" max="10000" @change="handleChangeInput"></el-input-number>
      </el-col>
      </el-row>
  </div>
</template>

<script>
export default {
    data() {
        return {
        //     item: {
        //       id: '1',
        //       desc: '这个是任务1',
        //       count: 1,
        //       checked: false,
        //   },
        } 
    },

    props: ['taskid', 'index', 'checked', 'desc', 'timeslimit'],

    methods: {
        handleChangeCheckBox: function(bSelect) {
            //alert(`select=${bSelect}, this.checked=${this.checked}`);
            let item = {
                index: this.index,
                taskid: this.taskid,
                desc: this.desc,
                checked: this.checked,
                timeslimit: this.timeslimit,
            }
            this.$emit('change', this, item);
        },

        handleChangeInput: function(value) {
            let item = {
                index: this.index,
                taskid: this.taskid,
                desc: this.desc,
                checked: this.checked,
                timeslimit: this.timeslimit,
            }
            this.$emit('change', this, item);
        }
    },

    computed: {
        countEnable: function() {
            if (item.checked) {
                return '';
            } else {
                return 'disabled';
            }
        }
    },
}
</script>

<style>
</style>