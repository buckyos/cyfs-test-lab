import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = new Router({
  routes: [
    {
      path: '/',
      redirect: 'index'
    },
    {
      path: '/index',
      name: 'Index',
      component: () => import('./views/Index.vue'),
      meta: { title: '首页' },
      redirect: '/home',
      children: [
        {
          path: '/home',
          name: 'home',
          component: () => import('./views/Home/Home'),
          meta: { title: '首页' }
        },
        {
          path: '/agentList',
          name: 'agentList',
          component: () => import('./views/agent/AgentList'),
          meta: { title: '节点列表' }
        },
        {
          path: '/testcase',
          name: 'testcase',
          component: () => import('./views/testcase/Testcase'),
          meta: { title: '测试用例Mongo' }
        },
        {
          path: '/testcaseStack',
          name: 'testcase',
          component: () => import('./views/testcaseStack/Testcase'),
          meta: { title: '测试用例OOD' }
        },
        {
          path: '/testSuite',
          name: 'testSuite',
          component: () => import('./views/testSuite/TestSuite'),
          meta: { title: '测试用例集合' }
        },
        {
          path: '/testTask',
          name: 'testTask',
          component: () => import('./views/testTask/TestTask'),
          meta: { title: '测试用例集合' }
        },
        {
          path: '/testReporter',
          name: 'testReporter',
          component: () => import('./views/testReporter/TestReporter'),
          meta: { title: '测试报告' }
        },
      ]
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('./views/register/Register')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/logo/Login')
    },
    {
      path: '/lock',
      name: 'lock',
      component: () => import('./views/Lock.vue')
    },
    {
      path: '*',
      name: 'Nofind',
      component: () => import('./views/404')
    }
  ]
  // mode: "history"
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLogin = !!localStorage.eleToken

  if (to.path === '/login' || to.path === '/register') {
    next()
  } else {
    isLogin ? next() : next('/login')
  }
})

export default router
