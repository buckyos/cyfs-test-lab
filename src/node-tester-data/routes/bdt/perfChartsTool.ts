
let node_echarts = require('node-echarts-canvas');
import * as fs from "fs-extra";
import * as path from "path";
var date = require("silly-datetime");
import {SystemInfo,SystemInfoModel} from "../../model/base/system_info"

function bdteEchartsNetwork(filePath:string,agent:string,timeList:Array<number>,received:Array<number>,transmitted:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }

    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT Network Monitoring',
          subtext: `${agent}`,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['download','upload']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: 'time',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval: interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: 'Speed Bytes/s',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        },
    
        series: [
          {
            name: 'download',
            data: received,
            type: 'line',
            // 设置折线上圆点大小
            symbolSize:1,
            itemStyle:{
              normal:{
                // 拐点上显示数值
                label : {
                show: false
                },
                borderColor:'red',  // 拐点边框颜色
                lineStyle:{                 
                  width:1,  // 设置线宽
                  type:'solid'  //'dotted'虚线 'solid'实线
                }
              }
            }
          },
          {
            name: 'upload',
            data: transmitted,
            type: 'line',
            // 设置折线上圆点大小
            symbolSize:1,
            itemStyle:{
              normal:{
                // 拐点上显示数值
                label : {
                show: false
                },
                borderColor:'red',  // 拐点边框颜色
                lineStyle:{                 
                  width:1,  // 设置线宽
                  type:'solid'  //'dotted'虚线 'solid'实线
                }
              }
            }
          },
        ],
        
        color: ['#00EE00', '#FF9F7F']
      };
    node_echarts({
      width: 1500, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      //If the path  is not set, return the Buffer of image.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}
function bdteEchartsCPU(filePath:string,agent:string,timeList:Array<number>,cpu:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }
    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT CPU Monitoring',
          subtext: `${agent}`,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['CPU']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: 'time',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: 'CPU(All core)',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        }, 
        series: [
            {
              name: 'CPU',
              data: cpu,
              type: 'line',
              // 设置折线上圆点大小
              symbolSize:1,
              itemStyle:{
                normal:{
                  // 拐点上显示数值
                  label : {
                  show: false
                  },
                  borderColor:'red',  // 拐点边框颜色
                  lineStyle:{                 
                    width:1,  // 设置线宽
                    type:'solid'  //'dotted'虚线 'solid'实线
                  }
                }
              }
            },
          ],       
        color: ['#00EE00']
      };
    node_echarts({
      width: 1500, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}
function bdteEchartsMem(filePath:string,agent:string,timeList:Array<number>,mem:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }
    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT Memory Monitoring',
          subtext: `${agent}`,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['Memory']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: 'time',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: 'Memory(bytes)',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        }, 
        series: [
            {
              name: 'Memory',
              data: mem,
              type: 'line',
              // 设置折线上圆点大小
              symbolSize:1,
              itemStyle:{
                normal:{
                  // 拐点上显示数值
                  label : {
                  show: false
                  },
                  borderColor:'red',  // 拐点边框颜色
                  lineStyle:{                 
                    width:1,  // 设置线宽
                    type:'solid'  //'dotted'虚线 'solid'实线
                  }
                }
              }
            },
          ],       
        color: ['#00EE00']
      };
    node_echarts({
      width: 1500, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}

export async function BDTPerfReport(testcase_id:string,agent:string,save_path:string){
    let model = new SystemInfo();
    let result =await  model.getRecords(agent,testcase_id);
    let timeList = [];
    let cpuList =[];
    let memList = [];
    let receivedList = [];
    let transmitted = [];
    let maxMem = 0;
    let maxNetworkSpeed = 0;
    if(result.result){
      for(let data of result.result){
        timeList.push(date.format(Number(data.create_time),'YYYY/MM/DD HH:mm:ss'));
        cpuList.push(data!.cpu_usage!);
        memList.push(data!.used_memory!);
        receivedList.push(data!.received_bytes!);
        transmitted.push(data!.transmitted_bytes!);
        if(data!.used_memory!>maxMem){
            maxMem = data!.used_memory!
        }
        if(data!.received_bytes!>maxNetworkSpeed){
            maxNetworkSpeed = data!.received_bytes!
        }
        if(data!.transmitted_bytes!>maxNetworkSpeed){
            maxNetworkSpeed = data!.transmitted_bytes!
        }
      }
      let dirPath = path.join(save_path,testcase_id)
      if(!fs.existsSync(dirPath)){
          fs.mkdirpSync(dirPath);
      }
      let agentPath = path.join(dirPath,agent);
      if(!fs.existsSync(agentPath)){
          fs.mkdirpSync(agentPath);
      }
      let cpuImg =  path.join(agentPath,`${agent}_Perf_CPU.png`)
      let memImg =  path.join(agentPath,`${agent}_Perf_MEM.png`)
      let networkImg =  path.join(agentPath,`${agent}_Perf_Network.png`)
      let test1 = bdteEchartsCPU(cpuImg,agent,timeList,cpuList,100);
      let test2 = bdteEchartsMem(memImg,agent,timeList,memList,maxMem);
      let test3 = bdteEchartsNetwork(networkImg,agent,timeList,receivedList,transmitted,maxNetworkSpeed);
    }else{
      console.info(`not use this agent`)
    }
    return;
}

