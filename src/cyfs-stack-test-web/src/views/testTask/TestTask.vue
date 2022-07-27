<template>
  <div class="testTask" style = "height:110%">
    <div>
      <el-form :inline="true" ref="run_data" :model="run_data">
				<el-form-item gutter="5" >
          <div style="float:left;padding-right: 50px">
            <el-col :span="500"><el-input type="textarea" v-model="run_data.taskRunning" :autosize="{ minRows: 5,maxRows:5}" style="width: 500px"  :disabled="true"></el-input></el-col>
          </div> 
          <div style="float:left;padding-right: 50px">
            <el-col :span="500"><el-input type="textarea" v-model="run_data.taskList" :autosize="{ minRows: 5,maxRows:5}" style="width: 500px"  :disabled="true"></el-input></el-col>
          </div>
          <div style="float:left;padding-right: 50px">
            <el-col :span="500"><el-input type="textarea" v-model="run_data.taskListHistory"  :autosize="{ minRows: 5,maxRows:5}" style="width: 500px"  :disabled="true"></el-input></el-col> 
          </div>
          <el-form-item >
            <el-button type="primary" size ="small" icon="el-icon-search" @click='handleSearchTask()'>查询执行队列</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size ="small" icon="el-icon-search" @click='handleSearch()'>添加测试任务</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size ="small" icon="el-icon-search" @click='handleSearch()'>停止当前任务</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size ="small" icon="el-icon-search" @click='handleSearch()'>停止所有任务</el-button>
          </el-form-item>    
          
          
           
        </el-form-item>
      </el-form>
    </div>
    <div class="table_container" >
      <el-table
          v-if="tableData.length > 0"
          :data="tableData"
          min-height="460px"
          border
					:default-sort = "{prop: 'date', order: 'descending'}"
          style="width: 100% hight:100%">
      <el-table-column
          type="index"
          label="序号"
          align='center'
          width="70">
      </el-table-column>
      <el-table-column
        label="ID"
        align="center"
        width="150"
				sortable>
        <template slot-scope="scope">
          
          <span style="padding-left: 10px;">{{ scope.row._id}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="测试任务名称"
        align="center"
        width="150">
        <template slot-scope="scope">
          <span>{{ scope.row.name}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="系统"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span>{{ scope.row.system}}</span>
        </template>
      </el-table-column>
       <el-table-column
        label="任务描述"
        align="center"
        width="200">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.describe}}</span>
        </template>
      </el-table-column>
       <el-table-column
        label="用例列表"
        align="center"
        width="400">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.TestSuiteList}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="执行机器"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.agentName}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="执行机器ID"
        align="center"
        width="300">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.agentId}}</span>
        </template>
      </el-table-column>
     

      <el-table-column
        label="创建时间"
        align="center"
        width="200">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ Number(scope.row.create_time) | moment}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="定时任务配置"
        align="center"
        width="200">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.schedule}}</span>
        </template>
      </el-table-column> 
      <el-table-column 
        align="center"
        label="执行状态"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a"> {{ scope.row.state}}</span>
        </template>
        
      </el-table-column> 
      <el-table-column 
        align="center"
        label="操作"
        width="180">
        <template slot-scope="scope">
          <el-button
            type="primary"
            size="small"
            @click="handleRun(scope.$index, scope.row)">运行</el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleStop(scope.$index, scope.row)">停止</el-button>
        </template>
        
      </el-table-column>
      
    </el-table>
    
		<div v-else class="txt">{{message}}</div>
		<div class="paginations">
			<el-pagination
        align="center"
				@size-change="handleSizeChange"
				@current-change="handleCurrentChange"
				:current-page.sync="paginations.page_index"
				:page-sizes="paginations.page_sizes"
				:page-size="paginations.page_size"
				:layout="paginations.layout"
				:total="paginations.total">
			</el-pagination>
		</div>
    </div>
    <testTaskCreate :dialog="dialog" :formDate="formDate" @update="getProfiles"></testTaskCreate>
  </div>
</template>

<script>
// @ is an alias to /src
import testTaskCreate from '../../components/TestTaskCreate'


const TaskRunList = {
  test: {
    task :[{id : "测试集合ID",suiteName:"测试集合名称",state:"执行状态"}],
    end : true
  } 
  
}

export default {
  name: 'testTask',
    data () {
        return {
					visible: false,
					message:"数据不存在",
					search_data:{

          },
          run_data:{
            taskList:"无数据",
            taskRunning:"无数据",
            taskListHistory:"无数据",
          },
					filterTabDate:[], //查询数据
					paginations:{
						page_index:1, //当前位于哪页
						total:0, //总数
						page_size:3, //一页显示多少条
						page_sizes:[3,6,9,12], //每页显示多少条
						layout:'total, sizes, prev, pager, next, jumper'
					},
          tableData:[],  //数据
					allTableData:[], //分页数据
          dialog:{  //弹出框
            title:'',
            show:false,
            option:'edit'
          },
          formDate: {  //添加编辑删除需要传的字段
            type: "",
            describe: "",
            income: "",
            expend: "",
            cash: "",
            remark: ""
          },
        }
    },
    created () {
      this.getProfiles() 
      this.handleSearchTask() 
    },
    methods:{
      getProfiles() {
        this.$axios.get('/api/testTask',{params:{page_index:this.paginations.page_index,page_size:this.paginations.page_size}}).then(res => {
          this.allTableData = res.data;
					this.filterTabDate = res.data; //过滤数据
					this.setPaginations();
        }).catch(err => console.log(err))
      },
      handleSearchTask(){
        this.$axios.post('/api/testTask/taskList',{}).then(res => {
          this.run_data.taskList =  res.data.taskList ;
          this.run_data.taskRunning = res.data.taskRunning //过滤数据 taskListHistory
          this.run_data.taskListHistory = res.data.taskListHistory
          this.$message({
              message: "查询当前执行队列成功",
              type: "success"
            });
        }).catch(err => console.log(err))
      },
      handleRun(index,row) { //编辑信息
          if(TaskRunList[row.name]){
             this.$message({
                message: `正在运行成功中`,
                type: 'error'
              })
          }else{
              this.$axios.post('/api/testTask/runTask',{name:row.name}).then(res => {
              TaskRunList[row.name] =  res.data 
              this.$message({
                message: `运行成功： ${JSON.stringify(res.data)}`,
                type: 'success'
              })
            }).catch(err => console.log(err))  
          }
        
      },
      handleEdit(index,row) { //编辑信息
        this.dialog={
          title:'编辑脚本信息',
          show:true,
          option:'edit'
        }
        this.formDate = {
          _id: row._id,
          name: row.name,
          system:  row.system,
          module: row.module,
          describe : row.describe,
          create_time:  row.create_time,
          evn:  row.evn,
          author:  row.author,
          configList:  row.configList,
          testcaseRunner:  row.testcaseRunner,
          testcaseIds:  row.testcaseIds,
          dirId:  row.dirId,
        }
      },
     handleDelete(index,row){  //删除数据
        
				this.$confirm("此操作将永久删除该文件, 是否继续?", "提示", {
					confirmButtonText: "确定",
					cancelButtonText: "取消",
					type: "warning"
				})
					.then(() => {
						this.$axios.delete(`/api/testTask/delete/${row._id}`).then(res => {
							this.$message({
								message: '删除成功',
								type: 'success'
							})
						})
						this.getProfiles()  
					})
					.catch(() => {
						this.$message({
							type: "info",
							message: "已取消删除"
						});
					});
      },
		/* 	handleDelete(row){
				console.log(row)	
				this.visible = true
				if(this.row){
					console.log(1)
				}
			}, */
			getDeleteVisible(index,row){
				// console.log(row)
				this.$axios.delete(`/api/testTask/delete/${row._id}`).then(res => {
					this.$message({
						message: '删除成功',
						type: 'success'
					})
				})
				this.getProfiles(); 
        this.visible = false;//隐藏弹出框
			},
      onAddMoney(){  //添加信息
        this.dialog={
          title:'添加用例',
          show:true,
          option:'add'
        }
        this.formDate = {
          type: "",
          describe: "",
          income: "",
          expend: "",
          cash: "",
          remark: ""
        }
      },
      sendToOOD(){  //添加信息
        this.$axios.delete(`/api/testTask/uploadOOD`).then(res => {
				this.$message({
						message: '上传成功',
						type: 'success'
					})
				})
				this.getProfiles(); 
				this.visible = false;//隐藏弹出框
      },
			setPaginations(){
				//分页属性设置
				this.paginations.total = this.allTableData.length; //数据的数量
				this.paginations.page_index = 1; //默认显示第一页
				this.paginations.page_size = 3; //每页显示的数据
				//数据显示
				this.tableData = this.allTableData.filter((item,index) => {
					return index < this.paginations.page_size;
				})
				
			},
			handleSizeChange(page_size){
				this.paginations.page_index = 1;
				this.paginations.page_size = page_size;
				this.tableData = this.allTableData.filter((item,index) => {
					return index < page_size;
				})
			},
			handleCurrentChange(page){
				//获取当前页
				let index = this.paginations.page_size * (page -1);
				
				//数据的总数
				let nums = this.paginations.page_size * page;
				//容器
				let tables = [];
				for(let i = index; i < nums; i++) {
					if(this.allTableData[i]) {
						tables.push(this.allTableData[i])
					}
					this.tableData = tables;
				}
			},
			handleSearch() { //查询

				this.$axios.post(`/api/testTask/search`, this.search_data).then(res => {
            this.allTableData = res.data;
            this.filterTabDate = res.data; //过滤数据
            this.setPaginations();
            this.$message({
              message: "添加信息成功",
              type: "success"
            });
        })

			}
    },
    components:{
      testTaskCreate
    }
}
</script>
<style scoped>
.fundlist {
  padding: 10px;
}
.btnRight{
  float: right;
}
.paginations{
	text-align: right;
	margin-top: 10px;
}
.txt {
	padding: 20px 0;
	background: #eee;
	font-size: 16px;
	text-align: center;
	color: #606266;
}
</style>
