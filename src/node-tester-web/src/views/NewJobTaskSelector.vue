<template>
  <div>
    <el-checkbox v-model="calcSelectAllChecked" @change="handleChangeAll"
      >全部任务</el-checkbox
    >
    <newjobtaskselectitem
      v-for="(item, index) in tasks"
      v-bind:key="item.taskid"
      v-bind:index="index"
      v-bind:taskid="item.taskid"
      v-bind:checked="item.checked"
      v-bind:desc="item.desc"
      v-bind:timeslimit="item.timeslimit"
      @change="handleItemChange"
    ></newjobtaskselectitem>
  </div>
</template>

<script>
export default {
  data() {
    return {
    };
  },

  model: {
    prop: "outSelected",
    event: "change"
  },

  props: {
    outSelected: {
      type: Array,
      default() {
        return [];
      }
    },
    tasks: {
      type: Array,
      default() {
        return [];
      }
    }
  },

  methods: {
    handleChangeAll: function(bSelect) {
      this.outSelected = [];
      for (let item of this.tasks) {
        item.checked = bSelect;
        if (bSelect) {
          this.outSelected.push({ taskid: item.taskid, desc: item.desc, timeslimit: item.timeslimit });
        }
      }
      this.$emit("change", this.outSelected);
    },

    handleItemChange: function(itemObj, item) {
      this.tasks[item.index].checked = item.checked;
      this.tasks[item.index].timeslimit = item.timeslimit;

      let selectedIndex = this.outSelected.length;
      for (let i = 0; i < this.outSelected.length; i++) {
        if (this.outSelected[i].taskid === item.taskid) {
          selectedIndex = i;
          break;
        }
      }

      if (item.checked) {
        if (selectedIndex === this.outSelected.length) {
          this.outSelected.push({ taskid: item.taskid, desc: item.desc, timeslimit: item.timeslimit });
        } else {
          this.outSelected[selectedIndex].timeslimit = item.timeslimit;
        }
      } else {
        if (selectedIndex !== this.outSelected.length) {
          this.outSelected.splice(selectedIndex, 1);
        }
      }

      this.$emit("change", this.outSelected);
    }
  },

  watch: {
    outSelected: {
      handler(newValue, oldValue) {
        let temp = new Map();

        for (let i = 0; i < this.outSelected.length; i++) {
          temp.set(this.outSelected[i].taskid, this.outSelected[i].timeslimit);
        }

        for (let i = 0; i < this.tasks.length; i++) {
          if (temp.has(this.tasks[i].taskid)) {
            this.tasks[i].checked = true;
            this.tasks[i].timeslimit = temp.get(this.tasks[i].taskid);
          } else {
            this.tasks[i].checked = false;
            this.tasks[i].timeslimit = 1;
          }
        }
      },
      deep: true
    },
  },

  computed: {
    calcSelectAllChecked: function() {
      if (this.outSelected.length === this.tasks.length && this.tasks.length > 0) {
        return true;
      } else {
        return false;
      }
    }
  },

  created: function() {
    let temp = new Map();

    for (let i = 0; i < this.outSelected.length; i++) {
      temp.set(this.outSelected[i].taskid, this.outSelected[i].timeslimit);
    }

    for (let i = 0; i < this.tasks.length; i++) {
      let item = {};

      if (temp.has(this.tasks[i].taskid)) {
        this.tasks[i].checked = true;
        this.tasks[i].timeslimit = temp.get(this.tasks[i].taskid);
      } else {
        this.tasks[i].checked = false;
        this.tasks[i].timeslimit = 1;
      }
    }
  }
};
</script>

<style>
</style>