<template>
  <div class="testcase" style = "height:110%">
    <div>
      <el-form :inline="true" ref="search_data" :model="search_data">
				<el-form-item gutter="5" > 
          <el-col :span="8"><el-input v-model="search_data.system" placeholder="测试系统" style="width:100%" ></el-input></el-col>
          <el-col :span="8"><el-input v-model="search_data.module" placeholder="测试模块" style="width:100%" ></el-input></el-col>
          <el-col :span="8"><el-input v-model="search_data.testcaseId" placeholder="用例ID" style="width:100%" ></el-input></el-col>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" size ="small" icon="el-icon-search" @click='handleSearch()'>查询</el-button>
				</el-form-item>
        <el-form-item class="btnRight">
            <el-button type="primary" size ="small" icon="el-icon-edit-outline" @click='onAddMoney()'>添加</el-button>
        </el-form-item>
        <el-form-item class="btnRight">
            <el-button type="primary" size ="small" icon="el-icon-edit-outline" @click='sendToOOD()'>同步到OOD</el-button>
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
        label="用例ID"
        align="center"
        width="150">
        <template slot-scope="scope">
          <span>{{ scope.row.testcaseId}}</span>
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
        label="模块"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.module}}</span>
        </template>
      </el-table-column>
       <el-table-column
        label="用例名称"
        align="center"
        width="400">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.testcase_name}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.type}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="优先级"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.priority}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="等级"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.level}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="作者"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.author}}</span>
        </template>
      </el-table-column>
     
      <el-table-column
        label="前置条件"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.precondition}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="后置条件"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.postcondition}}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="预期结果"
        align="center"
        width="100">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.expect_result}}</span>
        </template>
      </el-table-column>
      <!-- <el-table-column
        label="input_data"
        align="center"
        width="700">
        <template slot-scope="scope">
          <span  style="color:#67c23a">{{ scope.row.input_data}}</span>
        </template>
      </el-table-column> -->
      <el-table-column
        label="创建时间"
        align="center"
				sortable
        width="180">
        <template slot-scope="scope">
          <i class="el-icon-time"></i>
          <span  style="color:#409eff">{{ scope.row.create_time | moment }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        align="center"
				sortable
        width="180">
        <template slot-scope="scope">
          <i class="el-icon-time"></i>
          <span  style="color:#409eff">{{ scope.row.update_time | moment}}</span>
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
            @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(scope.$index, scope.row)">删除</el-button>
						<!-- <el-popover
							placement="top"
							width="160"
							v-model="visible">
							<p>确定要删除吗？</p>
							<div style="text-align: right; margin: 0">
								<el-button size="mini" type="text" @click="visible = false">取消</el-button>
								<el-button type="primary" size="mini" @click="getDeleteVisible(scope.$index, scope.row)">确定</el-button>
							</div>
							<el-button slot="reference" @click="handleDelete(scope.row)">删除</el-button>
						</el-popover> -->
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
    <TestcaseCreate :dialog="dialog" :formDate="formDate" @update="getProfiles"></TestcaseCreate>
  </div>
</template>

<script>
// @ is an alias to /src
import TestcaseCreate from '../../components/TestcaseCreate'
export default {
  name: 'Testcase',
    data () {
        return {
					visible: false,
					message:"数据不存在",
					search_data:{

					},
					filterTabDate:[], //查询数据
					paginations:{
						page_index:1, //当前位于哪页
						total:0, //总数
						page_size:10, //一页显示多少条
						page_sizes:[10,20,30,40], //每页显示多少条
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
    },
    methods:{
      getProfiles() {
        this.$axios.get('/api/testcase',{params:{page_index:this.paginations.page_index,page_size:this.paginations.page_size}}).then(res => {
          this.allTableData = res.data;
					this.filterTabDate = res.data; //过滤数据
					this.setPaginations();
        }).catch(err => console.log(err))
      },
      handleEdit(index,row) { //编辑信息
        this.dialog={
          title:'编辑脚本信息',
          show:true,
          option:'edit'
        }
        this.formDate = {
          _id: row._id,
          testcaseId: row.testcaseId,
          system:  row.system,
          module: row.module,
          type: row.type,
          priority: row.priority,
          level:  row.level,
          author: row.author,
          create_time:  row.create_time,
          update_time:  row.update_time,
          testcase_name: row.testcase_name,
          precondition: row.precondition,
          postcondition:  row.postcondition,
          expect_result:  row.expect_result,
          input_data: row.input_data
        }
      },
     handleDelete(index,row){  //删除数据
        
				this.$confirm("此操作将永久删除该文件, 是否继续?", "提示", {
					confirmButtonText: "确定",
					cancelButtonText: "取消",
					type: "warning"
				})
					.then(() => {
						this.$axios.delete(`/api/testcase/delete/${row._id}`).then(res => {
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
				this.$axios.delete(`/api/testcase/delete/${row._id}`).then(res => {
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
        this.$axios.delete(`/api/testcase/uploadOOD`).then(res => {
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
				this.paginations.page_size = 10; //每页显示的数据
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

				this.$axios.post(`/api/testcase/search`, this.search_data).then(res => {
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
      TestcaseCreate
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
