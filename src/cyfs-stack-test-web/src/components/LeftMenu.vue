<template>
	<div class="sidebar">
		
			<el-row class="menu_page">
				<el-col>
					<el-menu 
						mode="vertical" 
						class="el-menu-vertical-demo" 
						:collapse="collapse" 
						:default-active="$route.path"
						background-color="#324057" 
						text-color="#fff">
						<div class="wrapper" ref="wrapper">
							<Menu :items='items'/>
						</div>
					</el-menu>
				</el-col>	
			</el-row>
		
	</div>
</template>

<script>
import bus from "../common/bus";
import Menu from "./Menu";
import Bscroll from 'better-scroll'
// @ is an alias to /src
export default {
  name: "LeftMenu",
  data() {
    return {
      collapse: false,
      items: [
        {
          icon: "el-icon-menu",
          name: "首页",
          path: "/home"
        },
        {
          icon: "el-icon-service",
          name: "测试节点",
          path: "/agent",
          children: [
            {
              path: "/agentList",
              name: "节点列表"
            }
          ]
        },
        {
          icon: "el-icon-bell",
          name: "测试用例",
          path: "/testcase",
          children: [
            {
              path: "/testcase",
              name: "Mongo用例管理"
            },
            {
              path: "/testcaseStack",
              name: "OOD用例管理"
            }
          ]
        },
        {
          icon: "el-icon-mobile-phone",
          name: "用例集合",
          path: "/testSuite",
          children: [
            {
              path: "/testSuite",
              name: "用例集合"
            }
          ]
        },
        {
          icon: "el-icon-tickets",
          name: "工作计划",
          path: "/testTask",
          children: [
            {
              path: "/testTask",
              name: "任务管理"
            }
          ]
        },
        {
          icon: "el-icon-document",
          name: "执行记录",
          path: "/reporter",
          children: [
            {
              path: "/testReporter",
              name: "测试报告"
            }
          ]
        }
      ]
    };
  },
  components: {
    Menu
  },
  methods:{
		initScroll() {
			this.scroll = new Bscroll(this.$refs.wrapper, {
			})
		}
	},
	mounted() {
		this.$nextTick(() => {
			this.initScroll()
		})
	},
  created() {
    // 通过 Event Bus 进行组件间通信，来折叠侧边栏
    bus.$on("collapse", msg => {
      this.collapse = msg;
    });
  }
};
</script>
<style scoped>
	.menu_page {
		position: fixed;
		top: 71px;
		left: 0;
		min-height: 100%;
		background-color: #324057;
		z-index: 99;	
	}
	.sidebar {
		position: relative;
		overflow: hidden;
	}
	.wrapper {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		min-height: 1200px;
		overflow: hidden;
	}
	.sidebar::-webkit-scrollbar {
		width: 0;
	}

	.sidebar-el-menu:not(.el-menu--collapse) {
		width: 250px;
	}

	.el-menu {
		border: none;
		z-index: 9999;
	}

	.fa-margin {
		margin-right: 5px;
	}

	.el-menu-vertical-demo:not(.el-menu--collapse) {
		width: 180px;
		min-height: 400px;
	}

	.el-menu-vertical-demo {
		width: 49px;
	}

	.el-submenu .el-menu-item {
		min-width: 180px;
	}

	.hiddenDropdown,
	.hiddenDropname {
		display: none;
	}

	a {
		text-decoration: none;
	}
</style>

