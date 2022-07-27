<template>
  <div id="app">
    <div id="nav">
      <!-- <router-link to="/">Home</router-link> |-->
      <!-- <router-link to="/agentenv">About</router-link> | -->
      <!-- <router-link to="/sysupdate">系统更新</router-link> | -->
      <router-link to="/agentlist">机器管理</router-link> | 
      <router-link to="/servicelist">软件包管理</router-link> |
      <router-link to="/tasklist">用例管理</router-link> |
      <router-link to="/joblist">工作计划</router-link> |
      <router-link to="/jobresult">执行结果</router-link> |
    </div>
    <router-view/>
  </div>
</template>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
