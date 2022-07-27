import Vue from 'vue';
import App from './App.vue';
import router from './router';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import JobItem from './views/JobItem.vue';
import NewJobTaskSelectItem from './views/NewJobTaskSelectItem.vue';
import NewJobTaskSelector from './views/NewJobTaskSelector.vue';

Vue.use(ElementUI);
Vue.component('jobitem', JobItem);
Vue.component('newjobtaskselectitem', NewJobTaskSelectItem);
Vue.component('newjobtaskselector', NewJobTaskSelector);


Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');
