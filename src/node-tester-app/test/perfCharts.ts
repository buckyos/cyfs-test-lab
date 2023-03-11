

//import * as echarts from "echarts"
let node_echarts = require('node-echarts-canvas');
import { fsOpenFiles } from "systeminformation";
import {request,ContentType} from "./request_new";
import * as fs from "fs-extra";
import * as path from "path";
var date = require("silly-datetime");
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
          text: 'BDT 节点网络监控',
          subtext: `${agent} 节点数据统计 `,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['下行速度','上行速度']
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
          name: '时间戳',
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
          name: '传输速度Bytes/s',
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
            name: '下行速度',
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
            name: '上行速度',
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
      width: 2000, // Image width, type is number.
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
          text: 'BDT 节点CPU使用率监控',
          subtext: `${agent} 节点数据统计 `,
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
          name: '时间',
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
          name: 'CPU(百分比)',
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
      width: 2000, // Image width, type is number.
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
          text: 'BDT 节点内存使用监控',
          subtext: `${agent} 节点数据统计 `,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['内存']
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
          name: '时间',
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
          name: '内存(KB)',
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
              name: '内存',
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
      width: 2000, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}

export async function BDTPerfReport(testcase_id:string,agent:string,save_path:string){
    console.info(`send req api/base/system_info/getRecords ${testcase_id} ${agent}`)
    let run = await request("POST","api/base/system_info/getRecords",{name:agent,testcase_id},ContentType.json)
    console.info(`api/base/system_info/getRecords resp ${JSON.stringify(run)}`)
    let timeList = [];
    let cpuList =[];
    let memList = [];
    let receivedList = [];
    let transmitted = [];
    let maxMem = 1*1024*1024;
    let maxNetworkSpeed = 1*1024*1024;
    for(let data of run.result){
        timeList.push(date.format(Number(data.create_time),'YYYY/MM/DD HH:mm:ss'));
        cpuList.push(data.cpu_usage);
        memList.push(data.used_memory);
        receivedList.push(data.received_bytes);
        transmitted.push(data.transmitted_bytes);
        if(data.used_memory>maxMem){
            maxMem = data.used_memory
        }
        if(data.received_bytes>maxNetworkSpeed){
            maxNetworkSpeed = data.received_bytes
        }
        if(data.transmitted_bytes>maxNetworkSpeed){
            maxNetworkSpeed = data.transmitted_bytes
        }
    }
    let dirPath = path.join(save_path,testcase_id)
    if(!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath);
    }
    let agentPath = path.join(dirPath,agent);
    if(!fs.existsSync(agentPath)){
        fs.mkdirSync(agentPath);
    }
    let cpuImg =  path.join(agentPath,`${agent}_Perf_CPU.png`)
    let memImg =  path.join(agentPath,`${agent}_Perf_MEM.png`)
    let networkImg =  path.join(agentPath,`${agent}_Perf_Network.png`)
    let test1 = bdteEchartsCPU(cpuImg,agent,timeList,cpuList,100);
    let test2 = bdteEchartsMem(memImg,agent,timeList,memList,maxMem);
    let test3 = bdteEchartsNetwork(networkImg,agent,timeList,receivedList,transmitted,maxNetworkSpeed);
    return;
}

async function main() {
  let testcaseList = [
    "NDN_BBR_TCP_File_Concurrent10_download20_1665320327847",
    "NDN_BBR_TCP_File_Concurrent10_download50_1665320382968",
    "NDN_BBR_TCP_File_Concurrent10_download100_1665320663506",
    "NDN_BBR_TCP_File_Concurrent10_upload20_1665320876631",
    "NDN_BBR_TCP_File_Concurrent10_upload50_1665320941752",
    "NDN_BBR_TCP_File_Concurrent10_upload100_1665321077752",
    "NDN_BBR_UDP_File_Concurrent10_download20_1665326185355",
    "NDN_BBR_UDP_File_Concurrent10_download50_1665326250240",
    "NDN_BBR_UDP_File_Concurrent10_download100_1665326385447",
    "NDN_BBR_UDP_File_Concurrent10_upload20_1665326615800",
    "NDN_BBR_UDP_File_Concurrent10_upload50_1665326675905",
    "NDN_BBR_UDP_File_Concurrent10_upload100_1665326771067",
    "NDN_BBR_TCP_File_Concurrent20_upload_1665326986374",
    "NDN_BBR_TCP_File_Concurrent50_upload_1665327036580",
    "NDN_BBR_TCP_File_Concurrent100_upload_1665327071535",
    "NDN_BBR_UDP_File_Concurrent20_upload_1665327111620",
    "NDN_BBR_UDP_File_Concurrent50_upload_1665327156763",
    "NDN_BBR_UDP_File_Concurrent100_upload_1665327201763",
  ]
    //let testcase_id = "NDN_BBR_File_Concurrent10_download100_1665307471629";
  for(let testcase_id of testcaseList){
    let agentList = [
      "PC_0005",
      "PC_0006",
      "PC_0007",
      "PC_0008",
      "PC_0009",
      "PC_0010",
      "PC_0011",
      "PC_0012",
      "PC_0013",
      "PC_0014",
      "PC_0015",
      "PC_0016",
      "PC_0017",
      "PC_0018",
    ];
    for(let agent of agentList){
       let run = await BDTPerfReport(testcase_id,agent,__dirname);
    }
  }
    
}
main();