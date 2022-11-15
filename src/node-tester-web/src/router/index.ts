import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';
import AgentList from '../views/AgentList.vue';
import ServiceList from '../views/ServiceList.vue';
import TaskList from '../views/TaskList.vue';
import JobList from '../views/JobList.vue';
import JobResult from '../views/JobResult.vue';
import TestReport from '../views/TestReport.vue';
import StackReport from '../views/StackReport.vue';
//import AgentEnv from '../views/AgentEnv.vue';
import SysUpdate from '../views/SysUpdate.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: AgentList,
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue'),
  },
  {
    path: '/agentlist',
    name: 'agentlist',
    component: AgentList,
  },
  {
    path: '/servicelist',
    name: 'servicelist',
    component: ServiceList,
  },
  {
    path: '/tasklist',
    name: 'tasklist',
    component: TaskList,
  },
  {
    path: '/joblist',
    name: 'joblist',
    component: JobList,
  },
  {
    path: '/jobresult',
    name: 'jobresult',
    component: JobResult,
  },
  {
    path: '/testreport',
    name: 'testreport',
    component: TestReport,
  },
  {
    path: '/stackreport',
    name: 'stackreport',
    component: StackReport,
  },
  // {
  //   path: '/agentenv',
  //   name: 'agentenv',
  //   component: AgentEnv,
  // },
  {
    path: '/sysupdate',
    name: 'sysupdate',
    component: SysUpdate,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
